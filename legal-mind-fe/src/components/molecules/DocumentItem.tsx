import { FileText } from 'lucide-react';
import { FileStatusBadge } from '@/components/atoms/FileStatusBadge';

type UploadedFile = {
  name: string;
  status: 'uploading' | 'processing' | 'indexed' | 'error';
  progress: number;
};

interface DocumentItemProps {
  file: UploadedFile;
}

export const DocumentItem = ({ file }: DocumentItemProps) => {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/50 text-xs">
      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="truncate flex-1 text-foreground">{file.name}</span>
      <FileStatusBadge status={file.status} progress={file.progress} />
    </div>
  );
}
