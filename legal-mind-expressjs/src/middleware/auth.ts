import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { env } from '../config/env.js';
import type { AppJwtPayload } from '../types/auth.js';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing bearer token' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, env.APP_JWT_SECRET) as AppJwtPayload;

    if (decoded.type !== 'access') {
      return res.status(401).json({ message: 'Invalid access token' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('id', decoded.sub)
      .single();

    if (error || !data || !data.is_active) {
      return res.status(401).json({ message: 'Unauthorized user' });
    }

    req.user = {
      id: data.id,
      email: data.email,
      role: data.role,
    };

    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
