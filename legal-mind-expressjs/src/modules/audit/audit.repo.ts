import { supabase } from '../../config/supabase.js';

type AuditLogInsert = {
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export const auditRepo = {
  async create(payload: AuditLogInsert) {
    const { error } = await supabase.from('audit_logs').insert(payload);

    if (error) {
      throw error;
    }
  },
};
