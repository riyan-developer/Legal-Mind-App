import { describe, expect, it } from "vitest";
import {
  buildCitationFallback,
  extractNormalizedMessages,
  normalizeDocumentPatch,
  patchChatDocument,
  upsertMessages,
} from "@/services/chats";

describe("chat normalization", () => {
  it("hydrates stringified citations with fallback document metadata", () => {
    const messages = extractNormalizedMessages(
      {
        messages: [
          {
            id: "assistant-1",
            role: "assistant",
            content: "Answer [1]",
            citations: JSON.stringify([
              {
                id: 1,
                page: "3",
                excerpt: "A cited paragraph",
              },
            ]),
          },
        ],
      },
      {
        documentName: "Engagement Letter.pdf",
        documentId: "doc-1",
        s3Key: "uploads/doc-1.pdf",
      },
    );

    expect(messages[0].citations).toEqual([
      {
        id: 1,
        documentName: "Engagement Letter.pdf",
        documentId: "doc-1",
        s3Key: "uploads/doc-1.pdf",
        page: 3,
        excerpt: "A cited paragraph",
        highlightText: undefined,
        searchText: undefined,
      },
    ]);
  });

  it("patches chat documents from realtime updates without losing defaults", () => {
    const chat = {
      id: "chat-1",
      user_id: "user-1",
      document_id: "doc-1",
      title: "Matter",
      created_at: "2026-03-13T00:00:00.000Z",
      updated_at: "2026-03-13T00:00:00.000Z",
      document: undefined,
    };

    const patched = patchChatDocument(
      chat,
      normalizeDocumentPatch({
        id: "doc-1",
        file_name: "Matter.pdf",
        status: "indexed",
        s3_key: "uploads/matter.pdf",
      }),
    );

    expect(buildCitationFallback(patched?.document)).toEqual({
      documentName: "Matter.pdf",
      documentId: "doc-1",
      s3Key: "uploads/matter.pdf",
    });
    expect(patched?.document?.mime_type).toBe("application/pdf");
  });

  it("reconciles optimistic messages by client id", () => {
    const merged = upsertMessages(
      [
        {
          id: "optimistic-1",
          clientId: "client-1",
          role: "user",
          content: "Question",
          createdAt: "2026-03-13T00:00:00.000Z",
          status: "pending",
        },
      ],
      [
        {
          id: "server-1",
          clientId: "client-1",
          role: "user",
          content: "Question",
          createdAt: "2026-03-13T00:00:01.000Z",
          status: "sent",
        },
      ],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("server-1");
    expect(merged[0].status).toBe("sent");
  });
});
