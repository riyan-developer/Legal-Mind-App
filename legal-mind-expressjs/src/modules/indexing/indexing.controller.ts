import { Request, Response } from "express";
import { handleIndexedChunks } from "./indexing.service";
import { documentsService } from "../documents/documents.service";
import { websocketEvents } from "../realtime/websocket.events";
import { chatsRepo } from "../chats/chats.repo.js";
import { receiveIndexingResultSchema } from "./indexing.schema.js";

export const receiveIndexedChunks = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await handleIndexedChunks(req.body);

    res.json({
      success: true,
      message: "Chunks stored successfully",
      data: result
    });
  } catch (error) {
    console.error(error);
    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;

    res.status(statusCode).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to process indexed chunks"
    });
  }
};

export const receiveIndexingResult = async (
  req: Request,
  res: Response
) => {
  try {
    const payload = receiveIndexingResultSchema.parse(req.body);
    const document = await documentsService.updateStatus(
      payload.s3_key,
      { status: payload.status },
      's3_key',
    );
    const chat = await chatsRepo.findByDocumentId(document.id);

    websocketEvents.documentUpdated({
      chatId: chat?.id ?? null,
      document,
    });

    console.log(`Document ${payload.s3_key} status updated to ${payload.status}`);
    res.json({
      success: true,
      message: "Indexing result received successfully"
    });
  } catch (error) {
    console.error(error);
    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;

    res.status(statusCode).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to process indexing result"
    });
  }
}
