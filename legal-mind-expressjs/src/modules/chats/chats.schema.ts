import { z } from 'zod';

export const createChatSchema = z.object({
  document_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).optional(),
});

export const createMessageSchema = z.object({
  chat_id: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  client_id: z.string().uuid().optional(),
});
