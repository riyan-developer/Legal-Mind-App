import { Request, Response } from 'express';
import { chatsService } from './chats.service.js';

export const chatsController = {
  async listChats(req: Request, res: Response) {
    const { page = '1', limit = '10' } = req.query;
    const data = await chatsService.listChats(
      req.user?.id,
      page as string,
      limit as string,
    );
    return res.json(data);
  },

  async createChat(req: Request, res: Response) {
    const data = await chatsService.createChat(req.user?.id, req.body);
    return res.status(201).json(data);
  },

  async listMessages(req: Request, res: Response) {
    const data = await chatsService.listMessages(req.user?.id, req.params.chatId as string);
    return res.json(data);
  },

  async createMessage(req: Request, res: Response) {
    const data = await chatsService.createMessage(req.user?.id, req.body);
    return res.status(202).json(data);
  },
};
