import { useEffect } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useWebSocketEvent } from "@/realtime/useWebSocketEvent";
import { useAppWebSocket } from "@/realtime/websocket.context";
import {
  buildCitationFallback,
  normalizeChatMessage,
  normalizeDocumentPatch,
  patchChatDocument,
  upsertMessages,
} from "@/services/chats";
import { chatKeys } from "@/hooks/useChatsInfinite";
import type { ChatMessagesResponse, ChatsResponse } from "@/types/chat";

type EventRecord = Record<string, unknown>;

const asRecord = (value: unknown): EventRecord =>
  typeof value === "object" && value !== null ? (value as EventRecord) : {};

const asString = (value: unknown) => (typeof value === "string" ? value : "");

export const useChatRealtime = (chatIds: string[]) => {
  const queryClient = useQueryClient();
  const { send, readyState } = useAppWebSocket();
  const subscriptionKey = chatIds.filter(Boolean).join("|");

  useEffect(() => {
    if (readyState !== WebSocket.OPEN || !subscriptionKey) {
      return;
    }

    send({
      type: "chat.subscribe",
      chatIds: subscriptionKey.split("|"),
    });
  }, [readyState, send, subscriptionKey]);

  const applyDocumentUpdate = (payload: unknown) => {
    const event = asRecord(payload);
    const data = asRecord(event.data);
    const chatId = asString(data.chatId || data.chat_id);
    const documentPatch = normalizeDocumentPatch(data.document);

    if (!chatId) {
      queryClient.invalidateQueries({
        queryKey: chatKeys.all,
      });
      return;
    }

    queryClient.setQueriesData<InfiniteData<ChatsResponse>>(
      { queryKey: chatKeys.all },
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            data: page.data.map((chat) =>
              chat.id === chatId ? patchChatDocument(chat, documentPatch) ?? chat : chat
            ),
          })),
        };
      }
    );

    queryClient.setQueryData<ChatMessagesResponse>(
      chatKeys.messages(chatId),
      (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          chat: patchChatDocument(current.chat, documentPatch),
        };
      }
    );
  };

  const applyMessageUpdate = (payload: unknown, invalidateChats = false) => {
    const event = asRecord(payload);
    const data = asRecord(event.data);
    const chatId = asString(data.chatId || data.chat_id);

    if (!chatId) {
      return;
    }

    queryClient.setQueryData<ChatMessagesResponse>(
      chatKeys.messages(chatId),
      (current) => {
        const fallbackDocument = buildCitationFallback(current?.chat?.document);
        const normalizedMessage = normalizeChatMessage(
          data.message ?? data,
          fallbackDocument
        );

        return {
          chat: current?.chat ?? null,
          messages: upsertMessages(current?.messages ?? [], [normalizedMessage]),
        };
      }
    );

    if (invalidateChats) {
      queryClient.invalidateQueries({
        queryKey: chatKeys.all,
      });
    }
  };

  useWebSocketEvent("document.updated", applyDocumentUpdate);
  useWebSocketEvent("chat.message.created", (payload) =>
    applyMessageUpdate(payload, true)
  );
  useWebSocketEvent("chat.message.updated", applyMessageUpdate);
};
