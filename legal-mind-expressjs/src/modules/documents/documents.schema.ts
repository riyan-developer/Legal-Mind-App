import { z } from 'zod';
import { documentStatuses } from './document-status.js';

export const updateDocumentStatusSchema = z.object({
  status: z.enum(documentStatuses),
});
