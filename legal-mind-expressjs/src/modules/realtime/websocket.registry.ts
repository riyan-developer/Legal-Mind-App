import { WebSocket } from 'ws';

type RegisteredClient = {
  userId?: string;
  socket: WebSocket;
  chatIds: Set<string>;
};

const clients = new Set<RegisteredClient>();

export const websocketRegistry = {
  add(client: RegisteredClient) {
    clients.add(client);
  },

  remove(client: RegisteredClient) {
    clients.delete(client);
  },

  getAll() {
    return Array.from(clients);
  },

  sendToUser(userId: string, payload: unknown) {
    const message = JSON.stringify(payload);

    for (const client of clients) {
      if (client.userId === userId && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(message);
      }
    }
  },

  replaceChatSubscriptions(client: RegisteredClient, chatIds: string[]) {
    client.chatIds = new Set(chatIds);
  },

  sendToChat(chatId: string, payload: unknown) {
    const message = JSON.stringify(payload);

    for (const client of clients) {
      const hasSubscription = client.chatIds.has(chatId);
      const shouldReceive = hasSubscription || client.chatIds.size === 0;

      if (shouldReceive && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(message);
      }
    }
  },

  sendBroadcast(payload: unknown) {
    const message = JSON.stringify(payload);

    for (const client of clients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(message);
      }
    }
  }
};
