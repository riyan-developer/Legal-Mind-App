import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addChatMessage,
  buildCitationFallback,
  extractNormalizedMessages,
  upsertMessages,
} from "@/services/chats";
import { chatKeys } from "@/hooks/useChatsInfinite";
import type { AddMessagePayload, ChatMessage, ChatMessagesResponse } from "@/types/chat";

type MutationContext = {
  previousMessages?: ChatMessagesResponse;
  optimisticMessageId: string;
  clientId: string;
};

export const useAddChatMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddMessagePayload) => addChatMessage(payload),

    onMutate: async (variables): Promise<MutationContext> => {
      const optimisticMessageId = `optimistic-${crypto.randomUUID()}`;
      const clientId = crypto.randomUUID();
      variables.client_id = clientId;

      await queryClient.cancelQueries({
        queryKey: chatKeys.messages(variables.chat_id),
      });

      const previousMessages = queryClient.getQueryData<ChatMessagesResponse>(
        chatKeys.messages(variables.chat_id)
      );

      const optimisticMessage: ChatMessage = {
        id: optimisticMessageId,
        clientId,
        role: variables.role,
        content: variables.content,
        createdAt: new Date().toISOString(),
        status: "pending",
      };

      queryClient.setQueryData<ChatMessagesResponse>(
        chatKeys.messages(variables.chat_id),
        (current) => ({
          chat: current?.chat ?? previousMessages?.chat ?? null,
          messages: [...(current?.messages ?? previousMessages?.messages ?? []), optimisticMessage],
        })
      );

      return {
        previousMessages,
        optimisticMessageId,
        clientId,
      };
    },

    onError: (_error, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          chatKeys.messages(variables.chat_id),
          context.previousMessages
        );
        return;
      }

      queryClient.removeQueries({
        queryKey: chatKeys.messages(variables.chat_id),
        exact: true,
      });
    },

    onSuccess: (response, variables, context) => {
      queryClient.setQueryData<ChatMessagesResponse>(
        chatKeys.messages(variables.chat_id),
        (current) => {
          const existing = current?.messages ?? [];
          const fallbackDocument = buildCitationFallback(current?.chat?.document);
          const nextMessages = extractNormalizedMessages(response, fallbackDocument);
          const markedExisting = existing.map((message) =>
            message.clientId === context?.clientId
              ? {
                  ...message,
                  status: "sent" as const,
                }
              : message
          );

          if (nextMessages.length === 0) {
            return {
              chat: current?.chat ?? context?.previousMessages?.chat ?? null,
              messages: markedExisting,
            };
          }

          return {
            chat: current?.chat ?? context?.previousMessages?.chat ?? null,
            messages: upsertMessages(markedExisting, nextMessages),
          };
        }
      );
    },
  });
};
