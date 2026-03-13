import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/roles.js';
import { uploadsController } from './uploads.controller.js';

export const uploadsRouter = Router();

uploadsRouter.use(requireAuth, requireRoles('admin', 'partner'));

uploadsRouter.post('/multipart/start', uploadsController.start);
uploadsRouter.post('/multipart/presign-parts', uploadsController.presignParts);
uploadsRouter.post('/multipart/complete', uploadsController.complete);
uploadsRouter.post('/multipart/abort', uploadsController.abort);
