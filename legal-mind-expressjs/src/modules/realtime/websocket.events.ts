import { websocketRegistry } from './websocket.registry.js';

const sendToChat = (chatId: string | null | undefined, payload: unknown) => {
  if (!chatId) {
    websocketRegistry.sendBroadcast(payload);
    return;
  }

  websocketRegistry.sendToChat(chatId, payload);
};

export const websocketEvents = {
  documentUpdated(payload: { chatId?: string | null; document: unknown }) {
    sendToChat(payload.chatId, {
      type: 'document.updated',
      data: payload,
    });
  },

  messageCreated(payload: { chatId: string; message: unknown }) {
    websocketRegistry.sendToChat(payload.chatId, {
      type: 'chat.message.created',
      data: payload,
    });
  },

  messageUpdated(payload: { chatId: string; message: unknown }) {
    websocketRegistry.sendToChat(payload.chatId, {
      type: 'chat.message.updated',
      data: payload,
    });
  },
};
