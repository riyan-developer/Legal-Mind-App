import { supabase } from '../../config/supabase.js';
import type {
  ChatDocumentRecord,
  ChatMessageRecord,
  ChatRecord,
} from './chats.types.js';

const parsePositiveInt = (value: string, fallback: number) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const asRecord = (value: unknown) =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

const asNullableString = (value: unknown) => (typeof value === 'string' ? value : null);

const normalizeRelatedDocument = (value: unknown): ChatDocumentRecord | null => {
  const related = Array.isArray(value) ? value[0] : value;
  const record = asRecord(related);

  if (!record) {
    return null;
  }

  const id = asNullableString(record.id);

  if (!id) {
    return null;
  }

  return {
    id,
    file_name: asNullableString(record.file_name),
    mime_type: asNullableString(record.mime_type),
    status: asNullableString(record.status),
    s3_key: asNullableString(record.s3_key),
  };
};

const normalizeChat = (value: unknown): ChatRecord | null => {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const id = asNullableString(record.id);
  const createdAt = asNullableString(record.created_at);

  if (!id || !createdAt) {
    return null;
  }

  return {
    id,
    title: asNullableString(record.title),
    created_at: createdAt,
    updated_at: asNullableString(record.updated_at),
    document_id: asNullableString(record.document_id),
    user_id: asNullableString(record.user_id),
    document: normalizeRelatedDocument(record.document),
  };
};

const normalizeMessage = (value: unknown): ChatMessageRecord | null => {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const id = asNullableString(record.id);
  const chatId = asNullableString(record.chat_id);
  const content = asNullableString(record.content);
  const createdAt = asNullableString(record.created_at);
  const role = record.role === 'user' || record.role === 'assistant' ? record.role : null;

  if (!id || !chatId || content === null || !createdAt || !role) {
    return null;
  }

  return {
    id,
    chat_id: chatId,
    role,
    content,
    created_at: createdAt,
    citations: record.citations,
  };
};

const chatWithDocumentSelect = `
  *,
  document:document_id (
    id,
    file_name,
    mime_type,
    status,
    s3_key
  )
`;

const messageListChatSelect = `
  id,
  title,
  created_at,
  document:document_id (
    id,
    file_name,
    status,
    mime_type,
    s3_key
  )
`;

const selectUserChats = (
  userId: string,
  selectClause = chatWithDocumentSelect,
  selectOptions?: {
    count?: 'exact' | 'planned' | 'estimated';
    head?: boolean;
  },
) => supabase.from('chats').select(selectClause, selectOptions)
// .eq('user_id', userId);

const updateMessageRow = async (
  messageId: string,
  payload: Record<string, unknown>,
) =>
  supabase
    .from('chat_messages')
    .update(payload)
    .eq('id', messageId)
    .select()
    .single();

export const chatsRepo = {
  async listChats(userId: string, page = '1', limit = '10') {
    const pageNumber = parsePositiveInt(page, 1);
    const limitNumber = parsePositiveInt(limit, 10);

    const query = selectUserChats(userId, chatWithDocumentSelect, { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range((pageNumber - 1) * limitNumber, pageNumber * limitNumber - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    const totalPages = Math.ceil((count || 0) / limitNumber);
    const chats = (data ?? [])
      .map((chat) => normalizeChat(chat))
      .filter((chat): chat is ChatRecord => Boolean(chat));

    return {
      data: chats,
      totalPages,
      totalCount: count,
      page: pageNumber,
      limit: limitNumber
    };
  },

  async createChat(payload: {
    user_id: string;
    document_id?: string | null;
    title?: string;
  }) {
    const { data, error } = await supabase
      .from('chats')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findByDocumentId(documentId: string) {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('document_id', documentId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findChatById(chatId: string, userId: string) {
    const { data, error } = await selectUserChats(userId)
      .eq('id', chatId)
      .maybeSingle();

    if (error) throw error;
    return normalizeChat(data);
  },

  async listMessages(chatId: string, userId: string) {
    const { data: chat, error: chatError } = await selectUserChats(userId, messageListChatSelect)
      .eq('id', chatId)
      .maybeSingle();

    if (chatError) throw chatError;

    const normalizedChat = normalizeChat(chat);

    if (!normalizedChat) {
      return {
        chat: null,
        messages: [],
      };
    }

    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    return {
      chat: normalizedChat,
      messages: (messages ?? [])
        .map((message) => normalizeMessage(message))
        .filter((message): message is ChatMessageRecord => Boolean(message)),
    };
  },

  async createMessage(payload: {
    chat_id: string;
    role: 'user' | 'assistant';
    content: string;
  }) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    const message = normalizeMessage(data);

    if (!message) {
      throw new Error('Invalid chat message returned from database');
    }

    return message;
  },

  async updateMessageContent(
    messageId: string,
    payload: {
      content: string;
      citations?: Array<Record<string, unknown>>;
    },
  ) {
    const updatePayload: Record<string, unknown> = {
      content: payload.content,
    };

    if (payload.citations) {
      updatePayload.citations = payload.citations;
    }

    const { data, error } = await updateMessageRow(messageId, updatePayload);

    if (!error) {
      const message = normalizeMessage(data);

      if (!message) {
        throw new Error('Invalid chat message returned from database');
      }

      return message;
    }

    if (!payload.citations) {
      throw error;
    }

    const stringifiedFallback = await updateMessageRow(messageId, {
      content: payload.content,
      citations: JSON.stringify(payload.citations),
    });

    if (!stringifiedFallback.error) {
      const message = normalizeMessage(stringifiedFallback.data);

      if (!message) {
        throw new Error('Invalid chat message returned from database');
      }

      return message;
    }

    console.warn(
      'Failed to persist chat message citations. Falling back to content-only update.',
      {
        messageId,
        primaryError: error.message,
        stringifiedError: stringifiedFallback.error.message,
      },
    );

    const fallback = await updateMessageRow(messageId, { content: payload.content });

    if (fallback.error) throw fallback.error;

    const message = normalizeMessage(fallback.data);

    if (!message) {
      throw new Error('Invalid chat message returned from database');
    }

    return message;
  },

  async touchChat(chatId: string) {
    const { error } = await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

    if (error) throw error;
  },
};
