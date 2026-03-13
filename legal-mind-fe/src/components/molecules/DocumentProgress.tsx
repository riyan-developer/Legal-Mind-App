import { FileText, CheckCircle, Loader2, Upload, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ChatItem } from '@/types/chat';

interface DocumentProgressProps {
  document: ChatItem['document'];
  variant?: 'chat' | 'sidebar';
}

export const DocumentProgress = ({ document, variant = 'chat' }: DocumentProgressProps) => {
  const isSidebar = variant === 'sidebar';

  const statusConfig = {
    pending_upload: {
      icon: Upload,
      label: `Uploading...`, // ${document.progress}
      color: 'text-primary',
      animate: false,
    },
    processing: {
      icon: Loader2,
      label: 'Indexing document...',
      color: 'text-citation',
      animate: true,
    },
    uploaded: {
      icon: CheckCircle,
      label: 'Upload complete. Waiting for indexing to start...',
      color: 'text-primary',
      animate: false,
    },
    indexed: {
      icon: CheckCircle,
      label: 'Ready. Ask questions about this document.',
      color: 'text-success',
      animate: false,
    },
    error: {
      icon: AlertCircle,
      label: 'Failed to process document',
      color: 'text-destructive',
      animate: false,
    },
  };

  const config = statusConfig[document?.status || 'pending_upload'];
  const Icon = config.icon;

  if (isSidebar) {
    return (
      <div className="flex items-center gap-1.5 text-[10px]">
        <Icon className={cn("h-3 w-3 shrink-0", config.color, config.animate && "animate-spin")} />
        <span className={cn("truncate", config.color)}>
          {document?.status === 'pending_upload' ? `Uploading...` : 
           document?.status === 'processing' ? 'Indexing...' :
           document?.status === 'indexed' ? 'Ready' :
           document?.status === 'uploaded' ? 'Uploaded' : 'Error'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 max-w-md mx-auto space-y-6">
      <div className={cn(
        "w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center",
        document?.status === 'indexed' && "bg-success/10"
      )}>
        <Icon className={cn("h-8 w-8", config.color, config.animate && "animate-spin")} />
      </div>

      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-heading font-semibold text-foreground truncate max-w-[250px]">
            {document?.file_name || 'Document'}
          </span>
        </div>
        <p className={cn("text-sm", config.color)}>{config.label}</p>
      </div>

      {(
        document?.status === 'pending_upload' ||
        document?.status === 'uploaded' ||
        document?.status === 'processing'
      ) && (
        <div className="w-full max-w-xs">
          <Progress 
            value={document?.status === 'pending_upload' ? 35 : document?.status === 'uploaded' ? 65 : undefined} 
            className="h-2 bg-surface-elevated"
          />
          {document?.status === 'processing' && (
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Analyzing content, extracting sections, and building search index...
            </p>
          )}
        </div>
      )}

      {document?.status === 'indexed' && (
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          Your document has been indexed. You can now ask questions and receive answers with citations.
        </p>
      )}
    </div>
  );
}
