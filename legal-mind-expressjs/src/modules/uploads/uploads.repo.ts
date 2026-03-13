import { supabase } from '../../config/supabase.js';

export const uploadsRepo = {
  async createDocumentRow(payload: {
    file_name: string;
    s3_key: string;
    bucket_name: string;
    mime_type: string;
    uploaded_by: string;
    status: string;
  }) {
    const { data, error } = await supabase
      .from('documents')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateDocumentRowStatus(payload: {
    s3_key: string;
    status: string;
  }) {
    const { data, error } = await supabase
      .from('documents')
      .update({ status: payload.status })
      .eq('s3_key', payload.s3_key)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};