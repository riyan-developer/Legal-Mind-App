import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentProgress } from '@/components/molecules/DocumentProgress';
import type { ChatItem } from '@/types/chat';

interface SessionItemProps {
  title: string;
  isActive: boolean;
  onClick: () => void;
  chat?: ChatItem | null;
}

export const SessionItem = ({ title, isActive, onClick, chat }: SessionItemProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        "w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "bg-surface-elevated text-foreground"
          : "text-muted-foreground hover:bg-surface-elevated/50 hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-2">
        <FileText
          className={cn(
            "h-3.5 w-3.5 shrink-0",
          )}
        />
        <span
          className={cn(
            "truncate flex-1",
          )}
        >
          {title}
        </span>
      </div>
      {chat && chat.document && (
        <div className="mt-1 ml-5">
          <DocumentProgress document={chat.document} variant="sidebar" />
        </div>
      )}
    </button>
  );
}
