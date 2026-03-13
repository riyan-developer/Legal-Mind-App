import { supabase } from '../../config/supabase.js';

export const insertChunks = async (
  fileId: string,
  chunks: any[]
) => {
  const { error: deleteError } = await supabase
    .from('document_chunks')
    .delete()
    .eq('document_id', fileId);

  if (deleteError) {
    throw deleteError;
  }

  const rows = chunks.map((chunk) => ({
    document_id: fileId,
    chunk_index: chunk.chunk_index,
    chunk_text: chunk.chunk_text,
    section_title: chunk.section_title,
    embedding: chunk.embedding,
    page_number: chunk.page_number,
    // metadata: chunk.metadata
  }));

  const { error } = await supabase
    .from("document_chunks")
    .insert(rows);

  if (error) {
    throw error;
  }
};
