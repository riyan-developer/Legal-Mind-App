export const documentStatuses = [
  'pending_upload',
  'uploaded',
  'processing',
  'indexed',
  'error',
] as const;

export type DocumentStatus = (typeof documentStatuses)[number];
