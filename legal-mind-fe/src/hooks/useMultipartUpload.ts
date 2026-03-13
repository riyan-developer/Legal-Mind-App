import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { createFileChunks } from "../utils/fileChunks";
import {
  abortMultipartUpload,
  completeMultipartUpload,
  initMultipartUpload,
  presignParts,
} from "../services/files";
import { chatKeys } from "@/hooks/useChatsInfinite";
import { useAppStore } from "@/store/appStore";

type UploadArgs = {
  file: File;
  onProgress?: (progress: number) => void;
};

type CompletedPart = {
  PartNumber: number;
  ETag: string;
};

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_RETRIES = 3;

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  retries = DEFAULT_RETRIES,
  baseDelayMs = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === retries) {
        break;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw lastError;
}

const runWithConcurrency = async <T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex++;
      if (currentIndex >= tasks.length) break;

      results[currentIndex] = await tasks[currentIndex]();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}

export const useUploadPresignedParts = () => {
  const queryClient = useQueryClient();
  const {
    setActiveSessionId,
  } = useAppStore();
  return useMutation({
    mutationFn: async ({ file, onProgress }: UploadArgs) => {
      const chunks = createFileChunks(file, DEFAULT_CHUNK_SIZE);
      const partNumbers = chunks.map((_, index) => index + 1);

      const { s3Result: { key, uploadId }, chatId, chat } = await initMultipartUpload({
        fileName: file.name,
        contentType: file.type || "application/pdf",
      });
      
      queryClient.invalidateQueries({
        queryKey: chatKeys.all
      });

      setActiveSessionId(chatId);
      queryClient.setQueryData(chatKeys.messages(chatId), (current: unknown) =>
        current ?? { chat, messages: [] }
      );


      try {
        const { presignedParts } = await presignParts({
          key,
          uploadId,
          parts: partNumbers,
        });

        const urlMap = new Map<number, string>(
          presignedParts.map((item: { partNumber: number; url: string }) => [
            item.partNumber,
            item.url,
          ])
        );

        const uploadedBytesPerPart = new Array(chunks.length).fill(0);
        const totalBytes = file.size;

        const updateOverallProgress = () => {
          const uploaded = uploadedBytesPerPart.reduce(
            (sum, bytes) => sum + bytes,
            0
          );

          const progress = Math.min(
            100,
            Math.round((uploaded / totalBytes) * 100)
          );

          onProgress?.(progress);
        };

        const uploadPart = async (
          chunk: Blob,
          partIndex: number
        ): Promise<CompletedPart> => {
          const partNumber = partIndex + 1;
          const url = urlMap.get(partNumber);

          if (!url) {
            throw new Error(`Missing presigned URL for part ${partNumber}`);
          }

          return retryWithBackoff(async () => {
            // reset this part before retry so the progress does not overcount
            uploadedBytesPerPart[partIndex] = 0;
            updateOverallProgress();

            const response = await axios.put(url, chunk, {
              headers: {
                "Content-Type": file.type || "application/octet-stream",
              },
              onUploadProgress: (event) => {
                uploadedBytesPerPart[partIndex] = event.loaded;
                updateOverallProgress();
              },
            });

            const etag = response.headers.etag || response.headers.ETag;

            if (!etag) {
              throw new Error(`Missing ETag for part ${partNumber}`);
            }

            // ensure final byte count is exact
            uploadedBytesPerPart[partIndex] = chunk.size;
            updateOverallProgress();

            return {
              PartNumber: partNumber,
              ETag: String(etag).replaceAll('"', ""),
            };
          });
        };

        const tasks = chunks.map(
          (chunk, index) => () => uploadPart(chunk, index)
        );

        const completedParts = await runWithConcurrency(
          tasks,
          DEFAULT_CONCURRENCY
        );

        completedParts.sort((a, b) => a.PartNumber - b.PartNumber);

        const result = await completeMultipartUpload({
          key,
          uploadId,
          parts: completedParts,
        });

        onProgress?.(100);

        return result;
      } catch (error) {
        await abortMultipartUpload({ key, uploadId }).catch(() => undefined);
        throw error;
      }
    },
  });
};
