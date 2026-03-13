import http from "@/config/http";
import type { DocumentPreviewUrlResponse, DocumentsResponse } from "@/types/document";

export const getDocuments = async ({
  pageParam = 1,
  limit = 10,
}: {
  pageParam?: number;
  limit?: number;
}): Promise<DocumentsResponse> => {
  const { data } = await http.get(`/documents`, {
    params: {
      page: pageParam,
      limit,
    },
  });

  return data;
};

export const getDocumentPreviewUrl = async (documentId: string): Promise<DocumentPreviewUrlResponse> => {
  const { data } = await http.get(`/documents/${documentId}/preview-url`);
  return data;
};
