import { Request, Response } from 'express';
import { usersService } from './users.service.js';

export const usersController = {
  async list(_req: Request, res: Response) {
    const data = await usersService.list();
    return res.json(data);
  },

  async create(req: Request, res: Response) {
    const data = await usersService.create(req.body);
    return res.status(201).json(data);
  },

  async update(req: Request, res: Response) {
    const data = await usersService.update(req.params.id as string, req.body);
    return res.json(data);
  },

  async remove(req: Request, res: Response) {
    const data = await usersService.remove(req.params.id as string);
    return res.json(data);
  },
};