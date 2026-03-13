export type DocumentChunk = {
  id: string;
  document_id: string;
  chunk_index: number;
  page_number: number;
  section_title: string | null;
  chunk_text: string;
  similarity: number;
};
