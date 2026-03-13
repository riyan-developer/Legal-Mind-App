import { supabase } from '../../config/supabase.js';
import type { AuthUserProfile } from '../../types/auth.js';

export const authRepo = {
  async findUserProfileById(userId: string): Promise<AuthUserProfile | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
