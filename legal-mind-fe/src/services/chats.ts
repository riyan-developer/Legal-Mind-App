import http from "@/config/http";
import {
  buildCitationFallback,
  extractNormalizedMessages,
  normalizeChatItem,
  normalizeChatMessage,
  normalizeDocumentPatch,
  patchChatDocument,
  upsertMessages,
} from "@/services/chat-normalization";
import type {
  AddMessagePayload,
  ChatDocument,
  ChatItem,
  ChatMessagesResponse,
  ChatsResponse,
} from "@/types/chat";

type ResponseRecord = Record<string, unknown>;

const asRecord = (value: unknown): ResponseRecord =>
  typeof value === "object" && value !== null ? (value as ResponseRecord) : {};

export const getChats = async ({
  pageParam = 1,
  limit = 10,
}: {
  pageParam?: number;
  limit?: number;
}): Promise<ChatsResponse> => {
  const { data } = await http.get(`/chats`, {
    params: {
      page: pageParam,
      limit,
    },
  });

  return data;
};

export const getChatMessages = async (chatId: string) => {
  const { data } = await http.get(`/chats/${chatId}/messages`);
  const chat = normalizeChatItem(asRecord(data).chat ?? null);
  const fallbackDocument = buildCitationFallback(chat?.document);

  return {
    chat,
    messages: extractNormalizedMessages(data, fallbackDocument),
  } satisfies ChatMessagesResponse;
};

export const addChatMessage = async (payload: AddMessagePayload) => {
  const { data } = await http.post("/chats/messages", payload);
  return data;
};

export {
  buildCitationFallback,
  extractNormalizedMessages,
  normalizeChatItem,
  normalizeChatMessage,
  normalizeDocumentPatch,
  patchChatDocument,
  upsertMessages,
};
