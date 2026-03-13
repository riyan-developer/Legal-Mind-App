import { NextFunction, Request, Response } from 'express';
import type { AppRole } from '../types/auth.js';

export const requireRoles = (...roles: AppRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
