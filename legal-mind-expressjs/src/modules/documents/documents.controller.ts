import { Request, Response } from 'express';
import { documentsService } from './documents.service.js';

export const documentsController = {
  async list(req: Request, res: Response) {
    const { page = '1', limit = '10' } = req.query;
    const data = await documentsService.listByUser(req.user?.id as string, page as string, limit as string);
    return res.json(data);
  },

  async getById(req: Request, res: Response) {
    const data = await documentsService.getById(req.params.id as string, req.user?.id as string);
    return res.json(data);
  },

  async getPreviewUrl(req: Request, res: Response) {
    const data = await documentsService.getPreviewUrl(
      req.params.id as string,
      req.user?.id as string,
    );

    return res.json(data);
  },

  async updateStatus(req: Request, res: Response) {
    const data = await documentsService.updateStatus(req.params.id as string, req.body);
    return res.json(data);
  },
};
