import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { websocketRegistry } from './websocket.registry.js';
import { env } from '../../config/env.js';

export const setupWebSocketServer = (server: Server) => {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
  });

  wss.on('connection', (socket, req) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      socket.close(4401, 'Missing access token');
      return;
    }

    let userId: string | undefined;

    try {
      const decoded = jwt.verify(token, env.APP_JWT_SECRET) as {
        sub?: string;
        type?: 'access' | 'refresh';
      };

      if (!decoded.sub || decoded.type !== 'access') {
        socket.close(4401, 'Invalid access token');
        return;
      }

      userId = decoded.sub;
    } catch {
      socket.close(4401, 'Invalid access token');
      return;
    }

    const client = {
      userId,
      socket,
      chatIds: new Set<string>(),
    };

    websocketRegistry.add(client);

    socket.send(
      JSON.stringify({
        type: 'connection.ready',
        message: 'WebSocket connected',
      }),
    );

    console.log("New Client connected", client.userId);

    socket.on('message', (rawMessage) => {
      try {
        const parsed = JSON.parse(rawMessage.toString()) as {
          type?: string;
          chatIds?: unknown;
        };

        if (parsed.type === 'chat.subscribe' && Array.isArray(parsed.chatIds)) {
          websocketRegistry.replaceChatSubscriptions(
            client,
            parsed.chatIds.filter(
              (chatId): chatId is string => typeof chatId === 'string' && chatId.length > 0,
            ),
          );
        }
      } catch (error) {
        console.error('Invalid WebSocket client message:', error);
      }
    });

    socket.on('close', () => {
      console.log("Client disconnected", client.userId);
      websocketRegistry.remove(client);
    });
  });

  return wss;
}
