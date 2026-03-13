import { auditRepo } from './audit.repo.js';

type AuditPayload = {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export const auditService = {
  async record(payload: AuditPayload) {
    try {
      await auditRepo.create({
        user_id: payload.userId ?? null,
        action: payload.action,
        entity_type: payload.entityType,
        entity_id: payload.entityId ?? null,
        metadata: payload.metadata ?? null,
      });
    } catch (error) {
      console.error('Failed to write audit log', {
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId ?? null,
        error,
      });
    }
  },
};
