import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Invalid request payload',
      errors: err.flatten(),
    });
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof err.statusCode === 'number'
  ) {
    const message =
      'message' in err && typeof err.message === 'string'
        ? err.message
        : 'Request failed';

    return res.status(err.statusCode).json({ message });
  }

  return res.status(500).json({
    message: 'Internal server error',
  });
}
