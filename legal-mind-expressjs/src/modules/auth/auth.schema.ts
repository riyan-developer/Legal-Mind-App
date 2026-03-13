import { z } from 'zod';

export const exchangeSessionSchema = z.object({
  supabaseAccessToken: z.string().min(1),
});

export const onboardingRoleSchema = z.enum(['partner', 'junior_associate']);

export const completeOnboardingSchema = z.object({
  supabaseAccessToken: z.string().min(1),
  role: onboardingRoleSchema,
});

export const refreshSessionSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1).nullable().optional(),
});
