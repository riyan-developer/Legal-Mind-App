import http from "@/config/http";
import type { ChatItem } from "@/types/chat";

export const initMultipartUpload = async (payload: {
  fileName: string;
  contentType: string;
}) => {
  const { data } = await http.post("/uploads/multipart/start", payload);
  return data as {
    s3Result: {
      fileId: string;
      key: string;
      uploadId: string;
    },
    chatId: string;
    documentId: string;
    chat: ChatItem;
  };
};

export const presignParts = async (payload: {
  key: string;
  uploadId: string;
  parts: number[];
}) => {
  const { data } = await http.post("/uploads/multipart/presign-parts", payload);

  return data as {
    presignedParts: {
      partNumber: number;
      url: string;
    }[];
  };
};

export const getUploadPartUrl = async (payload: {
  key: string;
  uploadId: string;
  partNumber: number;
}) => {
  const { data } = await http.post("/uploads/multipart/presign-parts", payload);
  return data as {
    url: string;
    partNumber: number;
  };
};

export const completeMultipartUpload = async (payload: {
//   fileId: string;
  key: string;
  uploadId: string;
//   fileName: string;
//   fileType: string;
  parts: { ETag: string; PartNumber: number }[];
}) => {
  const { data } = await http.post("/uploads/multipart/complete", payload);
  return data;
};

export const abortMultipartUpload = async (payload: {
  key: string;
  uploadId: string;
}) => {
  const { data } = await http.post("/uploads/multipart/abort", payload);
  return data;
};
