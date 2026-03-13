import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authController } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/exchange', authController.exchangeSession);
authRouter.post('/onboard', authController.completeOnboarding);
authRouter.post('/refresh', authController.refreshSession);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', requireAuth, authController.getMe);
