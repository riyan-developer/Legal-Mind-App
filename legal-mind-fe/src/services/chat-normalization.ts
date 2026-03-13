import type {
  ChatDocument,
  ChatItem,
  ChatMessage,
  ChatMessageStatus,
  ChatRole,
  Citation,
} from "@/types/chat";

type JsonRecord = Record<string, unknown>;

export type CitationFallback = {
  documentName: string;
  documentId?: string;
  s3Key?: string;
};

const defaultDocument: ChatDocument = {
  file_name: "Document",
  mime_type: "application/pdf",
  status: "pending_upload",
};

const asRecord = (value: unknown): JsonRecord =>
  typeof value === "object" && value !== null ? (value as JsonRecord) : {};

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const asArray = (value: unknown): unknown[] | undefined => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const normalizeCitation = (
  value: unknown,
  index: number,
  fallback: CitationFallback,
): Citation => {
  const citation = asRecord(value);

  return {
    id: asNumber(citation.id, index + 1),
    documentName: asString(
      citation.documentName || citation.document_name,
      fallback.documentName,
    ),
    documentId:
      asString(citation.documentId || citation.document_id, fallback.documentId) || undefined,
    s3Key: asString(citation.s3Key || citation.s3_key, fallback.s3Key) || undefined,
    page: asNumber(citation.page || citation.page_number, 1),
    excerpt: asString(citation.excerpt || citation.text),
    highlightText: asString(citation.highlightText || citation.highlight_text) || undefined,
    searchText: asString(citation.searchText || citation.search_text) || undefined,
  };
};

const normalizeChatDocument = (value: unknown): ChatDocument | undefined => {
  const document = asRecord(value);
  const fileName = asString(document.file_name);
  const status = asString(document.status);
  const mimeType = asString(document.mime_type);

  if (!fileName && !status && !mimeType) {
    return undefined;
  }

  return {
    id: asString(document.id) || undefined,
    file_name: fileName || defaultDocument.file_name,
    status: (status || defaultDocument.status) as ChatDocument["status"],
    mime_type: mimeType || defaultDocument.mime_type,
    s3_key: asString(document.s3_key) || undefined,
  };
};

export const buildCitationFallback = (document?: ChatDocument | null): CitationFallback => ({
  documentName: document?.file_name || defaultDocument.file_name,
  documentId: document?.id,
  s3Key: document?.s3_key,
});

export const normalizeChatItem = (value: unknown): ChatItem | null => {
  const chat = asRecord(value);
  const id = asString(chat.id);

  if (!id) {
    return null;
  }

  return {
    id,
    user_id: asString(chat.user_id),
    document_id: asString(chat.document_id),
    title: asString(chat.title, "New Chat"),
    created_at: asString(chat.created_at),
    updated_at: asString(chat.updated_at),
    document: normalizeChatDocument(chat.document),
  };
};

export const normalizeDocumentPatch = (value: unknown): Partial<ChatDocument> => {
  const document = asRecord(value);
  const patch: Partial<ChatDocument> = {};

  const id = asString(document.id);
  const fileName = asString(document.file_name || document.fileName);
  const mimeType = asString(document.mime_type || document.mimeType);
  const status = asString(document.status);
  const s3Key = asString(document.s3_key || document.s3Key);

  if (id) {
    patch.id = id;
  }

  if (fileName) {
    patch.file_name = fileName;
  }

  if (mimeType) {
    patch.mime_type = mimeType;
  }

  if (status) {
    patch.status = status as ChatDocument["status"];
  }

  if (s3Key) {
    patch.s3_key = s3Key;
  }

  return patch;
};

export const patchChatDocument = (
  chat: ChatItem | null,
  patch: Partial<ChatDocument>,
): ChatItem | null => {
  if (!chat) {
    return chat;
  }

  return {
    ...chat,
    document: {
      ...(chat.document ?? defaultDocument),
      ...patch,
    },
  };
};

export const normalizeChatMessage = (
  value: unknown,
  fallbackDocument: CitationFallback = { documentName: defaultDocument.file_name },
): ChatMessage => {
  const message = asRecord(value);
  const role = (message.role as ChatRole) || "assistant";
  const content = asString(message.content);
  const citationValues = asArray(message.citations);
  const citations = citationValues?.map((citation, index) =>
    normalizeCitation(citation, index, fallbackDocument),
  );
  const hasExplicitStatus =
    message.status === "pending" || message.status === "error" || message.status === "sent";
  const hasExplicitStreaming = typeof message.isStreaming === "boolean";
  const isPendingAssistant =
    role === "assistant" &&
    content.length === 0 &&
    !hasExplicitStatus &&
    !hasExplicitStreaming;

  return {
    id: asString(message.id, crypto.randomUUID()),
    role,
    content,
    citations,
    createdAt: asString(
      message.created_at || message.createdAt || message.timestamp,
      new Date().toISOString(),
    ),
    isStreaming: hasExplicitStreaming ? Boolean(message.isStreaming) : isPendingAssistant,
    status: hasExplicitStatus ? message.status as ChatMessageStatus : isPendingAssistant ? "pending" : "sent",
    clientId: asString(message.client_id || message.clientId) || undefined,
  };
};

const extractMessages = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  const record = asRecord(value);

  if (Array.isArray(record.messages)) {
    return record.messages;
  }

  if (record.message) {
    return [record.message];
  }

  if (record.data) {
    return extractMessages(record.data);
  }

  return [];
};

export const extractNormalizedMessages = (
  value: unknown,
  fallbackDocument?: CitationFallback,
) => extractMessages(value).map((message) => normalizeChatMessage(message, fallbackDocument));

export const upsertMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
  const next = [...current];

  for (const message of incoming) {
    const index = next.findIndex(
      (existing) =>
        existing.id === message.id ||
        (Boolean(existing.clientId) && existing.clientId === message.clientId),
    );

    if (index >= 0) {
      next[index] = {
        ...next[index],
        ...message,
        citations: message.citations ?? next[index].citations,
      };
      continue;
    }

    next.push(message);
  }

  return next.sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
};
