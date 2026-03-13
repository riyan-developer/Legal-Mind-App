import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';

import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { uploadsRouter } from './modules/uploads/uploads.routes.js';
import { documentsRouter } from './modules/documents/documents.routes.js';
import { chatsRouter } from './modules/chats/chats.routes.js';
import indexingRoutes from "./modules/indexing/indexing.routes";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '20mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/chats', chatsRouter);
app.use("/api/internal/indexing", indexingRoutes);
app.use(errorHandler);

export default app;
