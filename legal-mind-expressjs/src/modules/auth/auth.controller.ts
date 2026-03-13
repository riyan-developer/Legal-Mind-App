import { Request, Response } from 'express';
import { authService } from './auth.service.js';

export const authController = {
  async exchangeSession(req: Request, res: Response) {
    const session = await authService.exchangeSession(req.body);
    return res.json(session);
  },

  async completeOnboarding(req: Request, res: Response) {
    const session = await authService.completeOnboarding(req.body);
    return res.status(201).json(session);
  },

  async refreshSession(req: Request, res: Response) {
    const session = await authService.refreshSession(req.body);
    return res.json(session);
  },

  async logout(req: Request, res: Response) {
    const data = await authService.logout(req.body);
    return res.json(data);
  },

  async getMe(req: Request, res: Response) {
    const user = await authService.getMe(req.user!.id);
    return res.json(user);
  },
};
