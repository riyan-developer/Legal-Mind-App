import { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';

export const requireInternalApiKey = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const apiKey = req.headers['x-internal-api-key'];

  if (apiKey !== env.EXPRESS_INTERNAL_API_KEY) {
    return res.status(401).json({
      message: 'Unauthorized internal request',
    });
  }

  next();
}
