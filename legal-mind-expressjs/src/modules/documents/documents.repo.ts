import { supabase } from '../../config/supabase.js';

export const documentsRepo = {
  async listByUser(userId: string, page: string, limit: string) {
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((pageNumber - 1) * limitNumber, pageNumber * limitNumber - 1);

    // if (userId) {
    //   query = query.eq('uploaded_by', userId);
    // }

    const { data, count, error } = await query;

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / limitNumber);

    return {
      data,
      totalPages,
      totalCount: count,
      page: pageNumber,
      limit: limitNumber
    };
  },

  async findById(documentId: string, userId?: string) {
    let query = supabase
      .from('documents')
      .select('*')
      .eq('id', documentId);

    // if (userId) {
    //   query = query.eq('uploaded_by', userId);
    // }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    return data;
  },

  async findByS3Key(s3Key: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('s3_key', s3Key)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateStatus(documentId: string, status: string, updateUsing = 'id') {
    const { data, error } = await supabase
      .from('documents')
      .update({ status })
      .eq(updateUsing, documentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
