import { expect, test, type Page } from "@playwright/test";
import { readdirSync } from "node:fs";
import path from "node:path";

const APP_URL = process.env.PLAYWRIGHT_APP_URL ?? "http://127.0.0.1:5173";
const AUTH_STORAGE_KEY = "legal-mind-auth";

type MockChat = {
  id: string;
  user_id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  document: {
    id: string;
    file_name: string;
    status: "pending_upload" | "processing" | "indexed";
    mime_type: string;
    s3_key: string;
  };
};

type MockCitation = {
  id: number;
  documentName: string;
  documentId: string;
  s3Key: string;
  page: number;
  excerpt: string;
  highlightText?: string;
  searchText?: string;
};

type MockServerState = {
  pdfFileName: string;
  chat: MockChat | null;
  messages: Array<Record<string, unknown>>;
  nextMessageId: number;
  pendingAssistantId: string | null;
  pendingAssistantCreatedAt: string | null;
  citation: MockCitation | null;
};

const resolveAgreementPdf = () => {
  const publicDir = path.resolve(process.cwd(), "public");
  const candidates = readdirSync(publicDir)
    .filter((fileName) => fileName.toLowerCase().endsWith(".pdf"))
    .sort((left, right) => left.localeCompare(right));

  if (candidates.length === 0) {
    throw new Error("No PDF found in legal-mind-fe/public. Add the agreement PDF before running Playwright.");
  }

  return {
    fileName: candidates[0],
    filePath: path.join(publicDir, candidates[0]),
  };
};

const seedAuthenticatedSession = async (page: Page) => {
  const expiresAt = Date.now() + 60 * 60 * 1000;

  await page.evaluate(
    ({ storageKey, expiresAt: nextExpiresAt }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          state: {
            status: "authenticated",
            user: {
              id: "user-partner-1",
              email: "partner@acme-legal.test",
              full_name: "Pat Partner",
              role: "partner",
              is_active: true,
            },
            accessToken: "playwright-access-token",
            refreshToken: "playwright-refresh-token",
            expiresAt: nextExpiresAt,
            pendingProfile: null,
            pendingSupabaseAccessToken: null,
          },
          version: 0,
        }),
      );
    },
    {
      storageKey: AUTH_STORAGE_KEY,
      expiresAt,
    },
  );
};

const emitWebSocketEvent = async (page: Page, payload: Record<string, unknown>) => {
  await page.evaluate((message) => {
    const emitter = (window as Window & {
      __legalMindWsEmit?: (payload: Record<string, unknown>) => void;
    }).__legalMindWsEmit;

    if (!emitter) {
      throw new Error("Missing mock websocket emitter");
    }

    emitter(message);
  }, payload);
};

const installMockWebSocket = async (page: Page) => {
  await page.addInitScript(() => {
    class MockWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      readyState = MockWebSocket.CONNECTING;
      url: string;
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent<string>) => void) | null = null;
      onclose: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor(url: string) {
        this.url = url;

        const sockets = ((window as Window & { __legalMindWsSockets?: MockWebSocket[] })
          .__legalMindWsSockets ??= []);
        sockets.push(this);

        window.setTimeout(() => {
          this.readyState = MockWebSocket.OPEN;
          this.onopen?.(new Event("open"));
        }, 0);
      }

      send(payload: string) {
        const sent = ((window as Window & { __legalMindWsSent?: string[] })
          .__legalMindWsSent ??= []);
        sent.push(payload);
      }

      close() {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.(new Event("close"));
      }
    }

    Object.defineProperty(window, "WebSocket", {
      configurable: true,
      writable: true,
      value: MockWebSocket,
    });

    (window as Window & {
      __legalMindWsEmit?: (payload: Record<string, unknown>) => void;
    }).__legalMindWsEmit = (payload) => {
      const sockets = (window as Window & { __legalMindWsSockets?: MockWebSocket[] })
        .__legalMindWsSockets ?? [];

      for (const socket of sockets) {
        if (socket.readyState !== MockWebSocket.OPEN) {
          continue;
        }

        socket.onmessage?.({
          data: JSON.stringify(payload),
        } as MessageEvent<string>);
      }
    };
  });
};

const installMockApi = async (page: Page, state: MockServerState) => {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/^\/api/, "");

    const fulfillJson = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

    if (request.method() === "GET" && pathname === "/chats") {
      return fulfillJson({
        data: state.chat ? [state.chat] : [],
        page: 1,
        limit: Number(url.searchParams.get("limit") || 50),
        totalCount: state.chat ? 1 : 0,
        totalPages: 1,
      });
    }

    if (request.method() === "POST" && pathname === "/uploads/multipart/start") {
      const now = new Date().toISOString();
      const documentId = "doc-agreement-1";
      const chatId = "chat-agreement-1";

      state.chat = {
        id: chatId,
        user_id: "user-partner-1",
        document_id: documentId,
        title: state.pdfFileName,
        created_at: now,
        updated_at: now,
        document: {
          id: documentId,
          file_name: state.pdfFileName,
          status: "pending_upload",
          mime_type: "application/pdf",
          s3_key: `uploads/${state.pdfFileName}`,
        },
      };

      state.messages = [];
      state.pendingAssistantId = null;
      state.pendingAssistantCreatedAt = null;
      state.citation = {
        id: 1,
        documentName: state.pdfFileName,
        documentId,
        s3Key: `uploads/${state.pdfFileName}`,
        page: 2,
        excerpt:
          "This Agreement renews automatically for successive one-year terms unless either party gives written notice of non-renewal at least thirty (30) days before the end of the then-current term.",
        highlightText: "Term and Renewal",
        searchText:
          "This Agreement renews automatically for successive one-year terms unless either party gives written notice of non-renewal at least thirty (30) days before the end of the then-current term.",
      };

      return fulfillJson({
        s3Result: {
          fileId: "file-agreement-1",
          key: `uploads/${state.pdfFileName}`,
          uploadId: "upload-agreement-1",
        },
        chatId,
        documentId,
        chat: state.chat,
      });
    }

    if (request.method() === "POST" && pathname === "/uploads/multipart/presign-parts") {
      const body = request.postDataJSON() as { parts: number[] };

      return fulfillJson({
        presignedParts: body.parts.map((partNumber) => ({
          partNumber,
          url: `https://playwright.upload.test/part/${partNumber}`,
        })),
      });
    }

    if (request.method() === "POST" && pathname === "/uploads/multipart/complete") {
      return fulfillJson({
        success: true,
      });
    }

    if (request.method() === "POST" && pathname === "/uploads/multipart/abort") {
      return fulfillJson({
        success: true,
      });
    }

    const chatMessagesMatch = pathname.match(/^\/chats\/([^/]+)\/messages$/);
    if (request.method() === "GET" && chatMessagesMatch) {
      return fulfillJson({
        chat: state.chat,
        messages: state.messages,
      });
    }

    if (request.method() === "POST" && pathname === "/chats/messages") {
      const body = request.postDataJSON() as {
        chat_id: string;
        role: "user" | "assistant";
        content: string;
        client_id?: string;
      };
      const createdAt = new Date().toISOString();
      const userMessageId = `msg-${state.nextMessageId++}`;
      const assistantMessageId = `msg-${state.nextMessageId++}`;

      const userMessage = {
        id: userMessageId,
        role: "user",
        content: body.content,
        created_at: createdAt,
        client_id: body.client_id,
        status: "sent",
      };

      const assistantMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        created_at: createdAt,
        isStreaming: true,
        status: "pending",
      };

      state.messages = [...state.messages, userMessage, assistantMessage];
      state.pendingAssistantId = assistantMessageId;
      state.pendingAssistantCreatedAt = createdAt;

      return fulfillJson({
        chatId: body.chat_id,
        messages: [userMessage, assistantMessage],
      }, 202);
    }

    const previewMatch = pathname.match(/^\/documents\/([^/]+)\/preview-url$/);
    if (request.method() === "GET" && previewMatch) {
      return fulfillJson({
        url: `${APP_URL}/${encodeURIComponent(state.pdfFileName)}`,
      });
    }

    if (request.method() === "POST" && pathname === "/auth/refresh") {
      return fulfillJson({
        onboardingRequired: false,
        user: {
          id: "user-partner-1",
          email: "partner@acme-legal.test",
          full_name: "Pat Partner",
          role: "partner",
          is_active: true,
        },
        accessToken: "playwright-access-token",
        refreshToken: "playwright-refresh-token",
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
    }

    if (request.method() === "POST" && pathname === "/auth/logout") {
      return fulfillJson({ success: true });
    }

    return fulfillJson({ message: `Unhandled mock route: ${request.method()} ${pathname}` }, 404);
  });

  await page.route("https://playwright.upload.test/**", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        ETag: '"playwright-etag-1"',
      },
      body: "",
    });
  });
};

test("logs in, uploads the agreement PDF, and receives a grounded answer", async ({ page }) => {
  const agreementPdf = resolveAgreementPdf();
  const serverState: MockServerState = {
    pdfFileName: agreementPdf.fileName,
    chat: null,
    messages: [],
    nextMessageId: 1,
    pendingAssistantId: null,
    pendingAssistantCreatedAt: null,
    citation: null,
  };

  await installMockWebSocket(page);
  await installMockApi(page, serverState);

  await page.goto(`${APP_URL}/`);
  await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();

  await seedAuthenticatedSession(page);
  await page.reload();

  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByText("Pat Partner")).toBeVisible();
  await expect(page.getByRole("button", { name: "New Document Chat" })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(agreementPdf.filePath);
  await expect(page.getByText(agreementPdf.fileName)).toBeVisible();
  await page.getByRole("button", { name: "Upload & Start" }).click();

  await expect(page.getByText("Uploading...")).toBeVisible();
  await expect(page.getByText("LegalMind Workspace")).not.toBeVisible();

  if (!serverState.chat) {
    throw new Error("Upload start did not initialize mock chat state");
  }

  serverState.chat.document.status = "processing";
  await emitWebSocketEvent(page, {
    type: "document.updated",
    data: {
      chatId: serverState.chat.id,
      document: serverState.chat.document,
    },
  });

  await expect(page.getByText("Indexing document...")).toBeVisible();

  serverState.chat.document.status = "indexed";
  await emitWebSocketEvent(page, {
    type: "document.updated",
    data: {
      chatId: serverState.chat.id,
      document: serverState.chat.document,
    },
  });

  await expect(page.getByText("Ready. Ask questions about this document.")).toBeVisible();

  const question = "What notice is required to stop the agreement from renewing automatically?";
  await page.getByLabel("Message input").fill(question);
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByText(question)).toBeVisible();
  await expect(page.getByText("Thinking...")).toBeVisible();

  await expect
    .poll(() => serverState.pendingAssistantId, {
      message: "Assistant placeholder message should be created by the mocked chat endpoint",
    })
    .not.toBeNull();

  const finalAnswer =
    "The agreement stops renewing automatically only if a party gives written notice of non-renewal at least 30 days before the current term ends. [1]";

  serverState.messages = serverState.messages.map((message) =>
    message.id === serverState.pendingAssistantId
      ? {
          ...message,
          content: finalAnswer,
          isStreaming: false,
          status: "sent",
          citations: serverState.citation ? [serverState.citation] : [],
        }
      : message,
  );

  await emitWebSocketEvent(page, {
    type: "chat.message.updated",
    data: {
      chatId: serverState.chat.id,
      message: {
        id: serverState.pendingAssistantId,
        role: "assistant",
        content:
          "The agreement stops renewing automatically only if a party gives written notice",
        created_at: serverState.pendingAssistantCreatedAt,
        isStreaming: true,
        status: "sent",
      },
    },
  });

  await expect(page.getByText(/stops renewing automatically/i)).toBeVisible();

  await emitWebSocketEvent(page, {
    type: "chat.message.updated",
    data: {
      chatId: serverState.chat.id,
      message: {
        id: serverState.pendingAssistantId,
        role: "assistant",
        content: finalAnswer,
        created_at: serverState.pendingAssistantCreatedAt,
        isStreaming: false,
        status: "sent",
        citations: serverState.citation ? [serverState.citation] : [],
      },
    },
  });

  await expect(
    page.getByText(
      "The agreement stops renewing automatically only if a party gives written notice of non-renewal at least 30 days before the current term ends.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: `View source: ${agreementPdf.fileName}, page 2`,
    }),
  ).toBeVisible();

  await page.getByRole("button", {
    name: `View source: ${agreementPdf.fileName}, page 2`,
  }).click();

  await expect(page.getByText("Citation [1]")).toBeVisible();
  await expect(page.getByText("Page 2")).toBeVisible();
  await expect(
    page.getByText("Use this excerpt to verify the answer against the original document language."),
  ).toBeVisible();
  await expect(page.getByText(/thirty \(30\) days before the end/i)).toBeVisible();
});
