import { cn } from '@/lib/utils';

type UploadStatus = 'uploading' | 'processing' | 'indexed' | 'error';

interface FileStatusBadgeProps {
  status: UploadStatus;
  progress: number;
}

/** Small status indicator for uploaded files */
export const FileStatusBadge = ({ status, progress }: FileStatusBadgeProps) => {
  return (
    <span
      className={cn(
        "text-[10px] font-medium shrink-0",
        status === 'indexed' && "text-success",
        status === 'uploading' && "text-primary",
        status === 'processing' && "text-citation",
        status === 'error' && "text-destructive",
      )}
    >
      {status === 'uploading' && `${progress}%`}
      {status === 'processing' && 'Indexing...'}
      {status === 'indexed' && 'Ready'}
      {status === 'error' && 'Error'}
    </span>
  );
}
