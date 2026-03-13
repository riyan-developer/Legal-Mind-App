import { createChatSchema, createMessageSchema } from './chats.schema.js';
import { chatsRepo } from './chats.repo.js';
import { supabase } from '../../config/supabase.js';
import { AppError } from '../../lib/app-error.js';
import { websocketEvents } from '../realtime/websocket.events.js';
import { pythonService } from './python.service.js';
import { auditService } from '../audit/audit.service.js';
import {
  buildFallbackCitations,
  normalizeGeneratedCitations,
} from './chat-citations.js';
import type {
  CitationDocumentContext,
  MessageRecord,
  RetrievedChunk,
} from './chats.types.js';

const NO_CONTEXT_ANSWER =
  'No relevant context was found for this document. Try asking about a different section of the file.';
const FALLBACK_ERROR_ANSWER =
  'I ran into an error while generating the answer. Please try again.';

const requireUserId = (userId?: string) => {
  if (!userId) {
    throw new AppError('Unauthorized user', 401);
  }

  return userId;
};

const toMessagePayload = (
  message: MessageRecord,
  overrides: Record<string, unknown> = {},
) => ({
  id: message.id,
  role: message.role,
  content: message.content,
  created_at: message.created_at,
  ...overrides,
});

const retrieveRelevantChunks = async (question: string, documentId: string) => {
  const embedding = await pythonService.embedQuestion(question);

  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: embedding,
    filter_document_id: documentId,
    match_count: 15,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as RetrievedChunk[]).filter(
    (chunk) => typeof chunk.chunk_text === 'string' && chunk.chunk_text.trim().length > 0,
  );
};

const finalizeAssistantMessage = async ({
  chatId,
  assistantMessageId,
  createdAt,
  answer,
  citations,
  status = 'sent',
}: {
  chatId: string;
  assistantMessageId: string;
  createdAt: string;
  answer: string;
  citations: Array<Record<string, unknown>>;
  status?: 'sent' | 'error';
}) => {
  const updated = await chatsRepo.updateMessageContent(assistantMessageId, {
    content: answer,
    citations,
  });
  await chatsRepo.touchChat(chatId);

  websocketEvents.messageUpdated({
    chatId,
    message: toMessagePayload(
      {
        id: updated.id,
        role: updated.role,
        content: updated.content,
        created_at: updated.created_at ?? createdAt,
      },
      {
        citations,
        isStreaming: false,
        status,
      },
    ),
  });
};

const generateAssistantReply = async ({
  chatId,
  documentId,
  documentName,
  documentS3Key,
  question,
  assistantMessageId,
  assistantCreatedAt,
}: {
  chatId: string;
  documentId: string;
  documentName: string;
  documentS3Key?: string | null;
  question: string;
  assistantMessageId: string;
  assistantCreatedAt: string;
}) => {
  try {
    const chunks = await retrieveRelevantChunks(question, documentId);
    const documentContext = {
      documentId,
      documentName,
      documentS3Key,
    } satisfies CitationDocumentContext;
    const fallbackCitations = buildFallbackCitations(chunks, documentContext);

    if (chunks.length === 0) {
      await finalizeAssistantMessage({
        chatId,
        assistantMessageId,
        createdAt: assistantCreatedAt,
        answer: NO_CONTEXT_ANSWER,
        citations: [],
      });
      return;
    }

    let answer = '';

    for await (const event of pythonService.streamAnswer(question, chunks)) {
      if (event.type === 'answer.delta') {
        answer += event.delta;

        websocketEvents.messageUpdated({
          chatId,
          message: {
            id: assistantMessageId,
            role: 'assistant',
            content: answer,
            created_at: assistantCreatedAt,
            isStreaming: true,
            status: 'sent',
          },
        });

        continue;
      }

      if (event.type === 'answer.error') {
        throw new Error(event.error);
      }

      if (event.type === 'answer.completed') {
        const finalAnswer = event.answer.trim() || answer.trim() || NO_CONTEXT_ANSWER;
        const citations = normalizeGeneratedCitations(event.citations, chunks, documentContext);

        await finalizeAssistantMessage({
          chatId,
          assistantMessageId,
          createdAt: assistantCreatedAt,
          answer: finalAnswer,
          citations,
        });
        return;
      }
    }

    await finalizeAssistantMessage({
      chatId,
      assistantMessageId,
      createdAt: assistantCreatedAt,
      answer: answer.trim() || FALLBACK_ERROR_ANSWER,
      citations: fallbackCitations,
      status: answer.trim() ? 'sent' : 'error',
    });
  } catch (error) {
    console.error('Failed to generate assistant reply', error);

    await finalizeAssistantMessage({
      chatId,
      assistantMessageId,
      createdAt: assistantCreatedAt,
      answer: FALLBACK_ERROR_ANSWER,
      citations: [],
      status: 'error',
    });
  }
};

export const chatsService = {
  async listChats(userId: string | undefined, page = '1', limit = '10') {
    return chatsRepo.listChats(requireUserId(userId), page, limit);
  },

  async createChat(userId: string | undefined, payload: unknown) {
    const parsed = createChatSchema.parse(payload);
    const authenticatedUserId = requireUserId(userId);

    return chatsRepo.createChat({
      user_id: authenticatedUserId,
      document_id: parsed.document_id ?? null,
      title: parsed.title ?? 'New Chat',
    });
  },

  async listMessages(userId: string | undefined, chatId: string) {
    const authenticatedUserId = requireUserId(userId);
    const data = await chatsRepo.listMessages(chatId, authenticatedUserId);

    if (!data.chat) {
      throw new AppError('Chat not found', 404);
    }

    await auditService.record({
      userId: authenticatedUserId,
      action: 'chat.messages.viewed',
      entityType: 'chat',
      entityId: chatId,
      metadata: {
        documentId: data.chat.document?.id ?? null,
        messageCount: data.messages.length,
      },
    });

    return data;
  },

  async createMessage(userId: string | undefined, payload: unknown) {
    const parsed = createMessageSchema.parse(payload);
    const authenticatedUserId = requireUserId(userId);

    if (parsed.role !== 'user') {
      throw new AppError('Only user messages can be created from the client', 400);
    }

    const chat = await chatsRepo.findChatById(parsed.chat_id, authenticatedUserId);

    if (!chat) {
      throw new AppError('Chat not found', 404);
    }

    if (!chat.document?.id) {
      throw new AppError('Chat is not linked to a document', 400);
    }

    if (chat.document.status !== 'indexed') {
      throw new AppError('Document is still processing', 409);
    }

    const userMessage = await chatsRepo.createMessage({
      chat_id: parsed.chat_id,
      role: 'user',
      content: parsed.content,
    });

    const assistantMessage = await chatsRepo.createMessage({
      chat_id: parsed.chat_id,
      role: 'assistant',
      content: '',
    });

    await chatsRepo.touchChat(parsed.chat_id);

    const userPayload = toMessagePayload(
      {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        created_at: userMessage.created_at,
      },
      {
        client_id: parsed.client_id,
        status: 'sent',
      },
    );

    const assistantPayload = toMessagePayload(
      {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        created_at: assistantMessage.created_at,
      },
      {
        isStreaming: true,
        status: 'pending',
      },
    );

    websocketEvents.messageCreated({
      chatId: parsed.chat_id,
      message: userPayload,
    });
    websocketEvents.messageCreated({
      chatId: parsed.chat_id,
      message: assistantPayload,
    });

    void generateAssistantReply({
      chatId: parsed.chat_id,
      documentId: chat.document.id,
      documentName: chat.document.file_name || 'Document',
      documentS3Key: chat.document.s3_key ?? null,
      question: parsed.content,
      assistantMessageId: assistantMessage.id,
      assistantCreatedAt: assistantMessage.created_at,
    });

    await auditService.record({
      userId: authenticatedUserId,
      action: 'chat.message.sent',
      entityType: 'chat',
      entityId: parsed.chat_id,
      metadata: {
        documentId: chat.document.id,
        messageId: userMessage.id,
        contentLength: parsed.content.length,
      },
    });

    return {
      chatId: parsed.chat_id,
      messages: [userPayload, assistantPayload],
    };
  },
};
