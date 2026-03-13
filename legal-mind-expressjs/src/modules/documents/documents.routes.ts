import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/roles.js';
import { documentsController } from './documents.controller.js';

export const documentsRouter = Router();

documentsRouter.use(requireAuth);

documentsRouter.get('/', documentsController.list);
documentsRouter.get('/:id', documentsController.getById);
documentsRouter.get('/:id/preview-url', documentsController.getPreviewUrl);
documentsRouter.patch(
  '/:id/status',
  requireRoles('admin', 'partner'),
  documentsController.updateStatus,
);
