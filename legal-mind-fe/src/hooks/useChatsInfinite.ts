import { getChatMessages, getChats } from "@/services/chats";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

export const chatKeys = {
  all: ["chats"] as const,
  infinite: (pageSize: number) => [...chatKeys.all, "infinite", pageSize] as const,
  messages: (chatId: string) => [...chatKeys.all, "messages", chatId] as const,
};

export const useInfiniteChats = (limit = 10) => {
  return useInfiniteQuery({
    queryKey: chatKeys.infinite(limit),
    queryFn: ({ pageParam }) => {
      return getChats({ pageParam, limit });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages
        ? lastPage.page + 1
        : undefined;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useChatMessages = (chatId: string) => {
  return useQuery({
    queryKey: chatKeys.messages(chatId),
    queryFn: () => getChatMessages(chatId),
    staleTime: 1000 * 60 * 5,
    enabled: !!chatId,
  });
};
