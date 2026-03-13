// A global declaration file to extend Express Request interface with user information

import 'express';
import type { AuthenticatedRequestUser } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedRequestUser;
    }
  }
}
