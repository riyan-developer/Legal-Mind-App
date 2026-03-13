export type Citation = {
  id: number;
  documentName: string;
  documentId?: string;
  s3Key?: string;
  page: number;
  excerpt: string;
  highlightText?: string;
  searchText?: string;
};

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessageStatus = "pending" | "sent" | "error";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  citations?: Citation[];
  createdAt: string;
  isStreaming?: boolean;
  status?: ChatMessageStatus;
  clientId?: string;
};

export type ChatDocumentStatus =
  | "pending_upload"
  | "uploaded"
  | "processing"
  | "indexed"
  | "error";

export type ChatDocument = {
  id?: string;
  file_name: string;
  status: ChatDocumentStatus;
  mime_type: string;
  s3_key?: string;
};

export type ChatItem = {
  id: string;
  user_id: string;
  document_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  document?: ChatDocument;
};

export type ChatsResponse = {
  data: ChatItem[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

export type AddMessagePayload = {
  chat_id: string;
  role: ChatRole;
  content: string;
  client_id?: string;
};

export type ChatMessagesResponse = {
  chat: ChatItem | null;
  messages: ChatMessage[];
};
