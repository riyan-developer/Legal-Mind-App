import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { chatsController } from './chats.controller.js';

export const chatsRouter = Router();

chatsRouter.use(requireAuth);

chatsRouter.get('/', chatsController.listChats);
chatsRouter.post('/', chatsController.createChat);
chatsRouter.get('/:chatId/messages', chatsController.listMessages);
chatsRouter.post('/messages', chatsController.createMessage);
