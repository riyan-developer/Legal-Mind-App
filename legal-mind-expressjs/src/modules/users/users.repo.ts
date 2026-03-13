import { supabase } from '../../config/supabase.js';

export const usersRepo = {
  async list() {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(payload: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active?: boolean;
  }) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        ...payload,
        is_active: payload.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(
    userId: string,
    payload: Partial<{
      email: string;
      full_name: string;
      role: string;
      is_active: boolean;
    }>,
  ) {
    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async remove(userId: string) {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
    return { success: true };
  },
};