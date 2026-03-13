import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/roles.js';
import { usersController } from './users.controller.js';

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRoles('admin', 'partner'));

usersRouter.get('/', usersController.list);
usersRouter.post('/', usersController.create);
usersRouter.patch('/:id', usersController.update);
usersRouter.delete('/:id', usersController.remove);