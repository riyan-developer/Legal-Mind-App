import { insertChunks } from "./indexing.repo";
import { documentsRepo } from "../documents/documents.repo.js";
import { receiveIndexedChunksSchema } from "./indexing.schema.js";
import { AppError } from "../../lib/app-error.js";

export const handleIndexedChunks = async (payload: unknown) => {
  const parsed = receiveIndexedChunksSchema.parse(payload);

  const document = await documentsRepo.findByS3Key(parsed.s3_key);
  if (!document) {
    throw new AppError("Document not found for indexed chunks", 404);
  }

  await insertChunks(document.id, parsed.chunks);

  return {
    documentId: document.id,
    inserted: parsed.chunks.length
  };
};
