import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import { CitationButton } from '@/components/atoms/CitationButton';
import { StreamingCursor } from '@/components/atoms/StreamingCursor';
import type { ChatMessage } from '@/types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const { setActiveCitation } = useAppStore();
  const isUser = message.role === 'user';
  const showThinking = !isUser && !message.content && (message.isStreaming || message.status === 'pending');

  const renderContent = (content: string) => {
    const parts = content.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match && message.citations) {
        const citationId = parseInt(match[1]);
        const citation = message.citations.find((c) => c.id === citationId);
        if (citation) {
          return <CitationButton key={i} citation={citation} onClick={setActiveCitation} />;
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[720px] px-4 py-3 rounded-lg",
          isUser ? "bg-surface-elevated text-foreground" : "text-foreground"
        )}
      >
        {isUser ? (
          <div className="space-y-1">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            {message.status === 'pending' && (
              <p className="text-[11px] text-muted-foreground">Sending...</p>
            )}
            {message.status === 'error' && (
              <p className="text-[11px] text-destructive">Failed to send</p>
            )}
          </div>
        ) : (
          <div className="text-sm leading-relaxed prose-sm">
            {showThinking ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Thinking...</span>
                <StreamingCursor />
              </div>
            ) : null}
            {message.content ? (
              <div className="space-y-2">
                {message.content.split('\n').map((line, idx) => (
                  <p key={idx} className={cn("leading-relaxed", !line.trim() && "h-2")}>
                    {renderContent(line)}
                  </p>
                ))}
              </div>
            ) : null}
            {message.isStreaming && message.content ? <StreamingCursor /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
