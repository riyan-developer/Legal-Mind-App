import { z } from 'zod';

export const startMultipartSchema = z.object({
  fileName: z.string().min(1).regex(/\.pdf$/i, 'Only PDF uploads are supported'),
  contentType: z.literal('application/pdf'),
});

export const presignPartsSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z.array(z.number().int().positive()).min(1),
});

export const completeMultipartSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z.array(
    z.object({
      PartNumber: z.number().int().positive(),
      ETag: z.string().min(1),
    }),
  ),
});

export const abortMultipartSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
});
