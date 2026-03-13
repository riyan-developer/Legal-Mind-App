import {
  abortMultipartSchema,
  completeMultipartSchema,
  presignPartsSchema,
  startMultipartSchema,
} from './uploads.schema.js';
import { uploadsS3Service } from './uploads.s3.service.js';
import { uploadsRepo } from './uploads.repo.js';
import { chatsRepo } from '../chats/chats.repo.js';
import { websocketEvents } from '../realtime/websocket.events.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/app-error.js';
import { auditService } from '../audit/audit.service.js';

export const uploadsService = {
  async start(payload: unknown, uploadedBy?: string) {
    const parsed = startMultipartSchema.parse(payload);

    if (!uploadedBy) {
      throw new AppError('Unauthorized user', 401);
    }

    const result = await uploadsS3Service.startMultipart(
      parsed.fileName,
      parsed.contentType,
    );

    const document = await uploadsRepo.createDocumentRow({
      file_name: parsed.fileName,
      s3_key: result.key,
      bucket_name: env.S3_BUCKET,
      mime_type: parsed.contentType,
      uploaded_by: uploadedBy,
      status: 'pending_upload',
    });

    const chat = await chatsRepo.createChat({
      document_id: document.id,
      title: parsed.fileName,
      user_id: uploadedBy,
    });

    websocketEvents.documentUpdated({
      chatId: chat.id,
      document,
    });

    await auditService.record({
      userId: uploadedBy,
      action: 'file.upload',
      entityType: 'document',
      entityId: document.id,
      metadata: {
        chatId: chat.id,
        fileName: document.file_name,
        mimeType: document.mime_type,
        s3Key: document.s3_key,
      },
    });

    return {
      s3Result: {
        ...result,
        fileId: document.id,
      },
      documentId: document.id,
      chatId: chat.id,
      chat: {
        ...chat,
        document,
      },
      document,
    };
  },

  async presignParts(payload: unknown) {
    const parsed = presignPartsSchema.parse(payload);
    return uploadsS3Service.presignParts(parsed);
  },

  async complete(payload: unknown) {
    const parsed = completeMultipartSchema.parse(payload);
    const result = await uploadsS3Service.completeMultipart(parsed);
    const document = await uploadsRepo.updateDocumentRowStatus({
      s3_key: parsed.key,
      status: 'uploaded',
    });
    const chat = await chatsRepo.findByDocumentId(document.id);

    websocketEvents.documentUpdated({
      chatId: chat?.id ?? null,
      document,
    });

    return result;
  },

  async abort(payload: unknown) {
    const parsed = abortMultipartSchema.parse(payload);
    const result = await uploadsS3Service.abortMultipart(parsed);
    const document = await uploadsRepo.updateDocumentRowStatus({
      s3_key: parsed.key,
      status: 'error',
    });
    const chat = await chatsRepo.findByDocumentId(document.id);

    websocketEvents.documentUpdated({
      chatId: chat?.id ?? null,
      document,
    });
    
    return result;
  },
};
