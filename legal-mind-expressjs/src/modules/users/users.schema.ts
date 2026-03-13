import { z } from 'zod';

export const createUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(['admin', 'partner', 'junior_associate']),
  is_active: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  full_name: z.string().min(1).optional(),
  role: z.enum(['admin', 'partner', 'junior_associate']).optional(),
  is_active: z.boolean().optional(),
});