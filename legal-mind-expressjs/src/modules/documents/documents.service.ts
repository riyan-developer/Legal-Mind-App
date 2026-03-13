import { documentsRepo } from './documents.repo.js';
import { updateDocumentStatusSchema } from './documents.schema.js';
import { AppError } from '../../lib/app-error.js';
import { uploadsS3Service } from '../uploads/uploads.s3.service.js';

export const documentsService = {
  async listByUser(userId: string, page: string, limit: string) {
    return documentsRepo.listByUser(userId, page, limit);
  },

  async getById(documentId: string, userId: string) {
    const document = await documentsRepo.findById(documentId, userId);

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    return document;
  },

  async getPreviewUrl(documentId: string, userId: string) {
    const document = await documentsRepo.findById(documentId, userId);

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    if (!document.s3_key) {
      throw new AppError('Document preview is unavailable', 404);
    }

    return uploadsS3Service.getPreviewUrl(document.s3_key);
  },

  async updateStatus(documentId: string, payload: unknown, updateUsing = 'id') {
    const parsed = updateDocumentStatusSchema.parse(payload);
    const document = await documentsRepo.updateStatus(documentId, parsed.status, updateUsing);

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    return document;
  },
};
