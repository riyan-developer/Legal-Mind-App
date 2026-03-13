import { FileText, X } from 'lucide-react';

interface FileChipProps {
  name: string;
  size: string;
  onRemove: () => void;
}

export const FileChip = ({ name, size, onRemove }: FileChipProps) => {
  return (
    <div className="flex items-center gap-2 bg-background rounded-md border border-border px-2.5 py-1.5 text-xs group">
      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="truncate max-w-[140px] text-foreground">{name}</span>
      <span className="text-text-dim">{size}</span>
      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-colors"
        aria-label={`Remove ${name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
