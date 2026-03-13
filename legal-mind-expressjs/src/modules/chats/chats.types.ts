export type ChatDocumentRecord = {
  id: string;
  file_name: string | null;
  mime_type: string | null;
  status: string | null;
  s3_key: string | null;
};

export type ChatRecord = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string | null;
  document_id: string | null;
  user_id: string | null;
  document: ChatDocumentRecord | null;
};

export type ChatMessageRecord = {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  citations?: unknown;
};

export type MessageRecord = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export type RetrievedChunk = {
  id: string;
  chunk_text: string;
  page_number: number | null;
  section_title: string | null;
  similarity: number;
};

export type StreamAnswerEvent =
  | {
      type: 'answer.delta';
      delta: string;
    }
  | {
      type: 'answer.completed';
      answer: string;
      citations: Array<Record<string, unknown>>;
    }
  | {
      type: 'answer.error';
      error: string;
    };

export type CitationRecord = {
  id: number;
  documentName: string;
  documentId: string;
  s3Key?: string;
  page: number;
  excerpt: string;
  highlightText?: string;
  searchText?: string;
  chunkId?: string;
};

export type CitationDocumentContext = {
  documentId: string;
  documentName: string;
  documentS3Key?: string | null;
};
