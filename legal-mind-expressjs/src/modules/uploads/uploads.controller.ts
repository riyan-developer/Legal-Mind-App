import { Request, Response } from 'express';
import { uploadsService } from './uploads.service.js';

export const uploadsController = {
  async start(req: Request, res: Response) {
    const data = await uploadsService.start(req.body, req?.user?.id as string);
    return res.status(201).json(data);
  },

  async presignParts(req: Request, res: Response) {
    const data = await uploadsService.presignParts(req.body);
    return res.json(data);
  },

  async complete(req: Request, res: Response) {
    const data = await uploadsService.complete(req.body);
    return res.json(data);
  },

  async abort(req: Request, res: Response) {
    const data = await uploadsService.abort(req.body);
    return res.json(data);
  },
};