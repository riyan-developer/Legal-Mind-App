import { z } from "zod";
import { documentStatuses } from "../documents/document-status.js";

export const indexedChunkSchema = z.object({
  chunk_index: z.number().int().nonnegative(),
  chunk_text: z.string().min(1),
  embedding: z.array(z.number()),
  page_number: z.number().int().positive().nullable().optional(),
  section_title: z.string().nullable().optional(),
});

export const receiveIndexedChunksSchema = z.object({
  bucket_name: z.string().min(1),
  s3_key: z.string().min(1),
  mime_type: z.string().min(1),
  chunks: z.array(indexedChunkSchema),
});

export const receiveIndexingResultSchema = z.object({
  bucket_name: z.string().min(1),
  s3_key: z.string().min(1),
  status: z.enum(documentStatuses),
  error: z.string().optional(),
});
