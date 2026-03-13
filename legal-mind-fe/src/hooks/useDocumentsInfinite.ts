import { getDocuments } from "@/services/document";
import { useInfiniteQuery } from "@tanstack/react-query";

export const useInfiniteDocuments = (limit = 10) => {
  return useInfiniteQuery({
    queryKey: ["documents", limit],
    queryFn: ({ pageParam }) => getDocuments({ pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages
        ? lastPage.page + 1
        : undefined;
    },
    staleTime: 1000 * 60 * 5,
  });
};