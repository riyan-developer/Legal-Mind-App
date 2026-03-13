import {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { Scale } from 'lucide-react';
import { VariableSizeList, type ListChildComponentProps } from 'react-window';
import type { ChatItem, ChatMessage } from '@/types/chat';
import { MessageBubble } from '@/components/molecules/MessageBubble';
import { DocumentProgress } from '@/components/molecules/DocumentProgress';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatMessageListProps {
  messages: ChatMessage[];
  documentInfo?: ChatItem["document"] | null;
  hasActiveSession?: boolean;
  isLoading?: boolean;
}

const DEFAULT_ROW_HEIGHT = 96;
const VIRTUALIZATION_THRESHOLD = 150;

type VirtualRowData = {
  messages: ChatMessage[];
  setSize: (index: number, size: number) => void;
  viewportWidth: number;
};

const MessageRow = ({ index, style, data }: ListChildComponentProps<VirtualRowData>) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const message = data.messages[index];

  useEffect(() => {
    const element = rowRef.current;

    if (!element) {
      return;
    }

    const updateSize = () => {
      data.setSize(index, Math.ceil(element.getBoundingClientRect().height));
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [
    data,
    index,
    message.content,
    message.isStreaming,
    message.status,
    message.citations,
    data.viewportWidth,
  ]);

  return (
    <div style={style}>
      <div ref={rowRef} className="px-4 py-2">
        <div className="mx-auto max-w-[800px]">
          <MessageBubble message={message} />
        </div>
      </div>
    </div>
  );
};

const ChatMessagesSkeleton = () => {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-[800px] mx-auto px-4 py-6 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <div className="ml-auto max-w-[520px] space-y-3">
          <Skeleton className="h-4 w-28 ml-auto" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export const ChatMessageList = ({
  messages,
  documentInfo,
  hasActiveSession = false,
  isLoading,
}: ChatMessageListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VariableSizeList>(null);
  const sizeMapRef = useRef<Record<number, number>>({});
  const hasStreamingMessage = messages.some((message) => message.isStreaming);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const messageIds = useMemo(
    () => messages.map((message) => message.id).join(':'),
    [messages]
  );
  const shouldVirtualize =
    messages.length >= VIRTUALIZATION_THRESHOLD &&
    viewport.height > 0 &&
    viewport.width > 0;

  const getItemSize = useCallback(
    (index: number) => sizeMapRef.current[index] ?? DEFAULT_ROW_HEIGHT,
    []
  );

  const setSize = useCallback((index: number, size: number) => {
    if (sizeMapRef.current[index] === size) {
      return;
    }

    sizeMapRef.current[index] = size;
    listRef.current?.resetAfterIndex(index);
  }, []);

  useLayoutEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const updateViewport = () => {
      const nextViewport = {
        width: element.clientWidth,
        height: element.clientHeight,
      };

      setViewport((current) =>
        current.width === nextViewport.width && current.height === nextViewport.height
          ? current
          : nextViewport
      );
    };

    updateViewport();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateViewport);
      return () => {
        window.removeEventListener('resize', updateViewport);
      };
    }

    const observer = new ResizeObserver(() => {
      updateViewport();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    sizeMapRef.current = {};
    listRef.current?.resetAfterIndex(0, true);
  }, [messageIds, viewport.width]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    if (!shouldVirtualize) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      listRef.current?.scrollToItem(messages.length - 1, 'end');
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [messages, shouldVirtualize]);

  // No session yet — show upload prompt
  if (!hasActiveSession && !documentInfo) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col items-center justify-center h-full px-6">
          <Scale className="h-12 w-12 text-primary/30 mb-4" />
          <h2 className="font-heading text-xl font-semibold text-foreground mb-2">LegalMind</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Upload a legal document to get started. LegalMind will index it and let you ask questions with cited answers.
          </p>
        </div>
      </div>
    );
  }

  if (hasActiveSession && !documentInfo) {
    return <ChatMessagesSkeleton />;
  }

  if (hasActiveSession && isLoading && documentInfo?.status === 'indexed') {
    return <ChatMessagesSkeleton />;
  }

  // Document still processing
  if (documentInfo?.status !== 'indexed') {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-center h-full">
          <DocumentProgress document={documentInfo} variant="chat" />
        </div>
      </div>
    );
  }

  // Document indexed, show messages
  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col items-center justify-center h-full px-6 gap-6">
          <DocumentProgress document={documentInfo} variant="chat" />
          <div className="max-w-md rounded-2xl border border-success/20 bg-success/5 px-5 py-4 text-center">
            <p className="text-sm font-medium text-success">
              Indexing is done.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask a question about this document to start the conversation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!shouldVirtualize) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {hasStreamingMessage ? 'AI is typing...' : ''}
        </div>
        <div className="max-w-[800px] mx-auto px-4 py-6 space-y-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : null}
          {hasStreamingMessage ? (
            <p className="text-sm text-muted-foreground">LegalMind is preparing the response...</p>
          ) : null}
          <div ref={messagesEndRef} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {hasStreamingMessage ? 'AI is typing...' : ''}
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 w-full">
        <VariableSizeList
          ref={listRef}
          className="scrollbar-thin"
          height={viewport.height}
          width={viewport.width}
          itemCount={messages.length}
          itemSize={getItemSize}
          overscanCount={8}
          itemData={{
            messages,
            setSize,
            viewportWidth: viewport.width,
          }}
        >
          {MessageRow}
        </VariableSizeList>
      </div>

      {isLoading ? (
        <div className="mx-auto w-full max-w-[800px] px-4 pb-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
      ) : null}

      {hasStreamingMessage ? (
        <div className="mx-auto w-full max-w-[800px] px-4 pb-4">
          <p className="text-sm text-muted-foreground">LegalMind is preparing the response...</p>
        </div>
      ) : null}
    </div>
  );
}
