import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileChip } from '@/components/atoms/FileChip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatSize, isPdfFile } from '@/utils';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export interface AttachedFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

interface ChatComposerProps {
  onSend: (message: string, files?: AttachedFile[]) => void;
  disabled?: boolean;
  /** When true, only allow file upload (no text, used for initial doc upload) */
  uploadOnly?: boolean;
  placeholder?: string;
}

export const ChatComposer = ({
  onSend,
  disabled,
  uploadOnly,
  placeholder = 'Ask a question about this document...',
}: ChatComposerProps) => {
  const [value, setValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (uploadOnly) {
      if (attachedFiles.length === 0) return;
      onSend('', attachedFiles);
      setAttachedFiles([]);
      return;
    }

    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [value, attachedFiles, onSend, disabled, uploadOnly]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => {
      if (!isPdfFile(f)) {
        toast.error(`${f.name} is not a PDF.`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} exceeds ${formatSize(MAX_FILE_SIZE)} limit.`);
        return false;
      }
      return true;
    });
    if (uploadOnly && valid.length > 0) {
      // Only allow one document per session
      setAttachedFiles([{ id: crypto.randomUUID(), file: valid[0], name: valid[0].name, size: valid[0].size }]);
    } else {
      setAttachedFiles((prev) => [
        ...prev,
        ...valid.map((f) => ({ id: crypto.randomUUID(), file: f, name: f.name, size: f.size })),
      ]);
    }
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const valid = files.filter((f) => {
      if (!isPdfFile(f)) {
        toast.error(`${f.name} is not a PDF.`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} exceeds ${formatSize(MAX_FILE_SIZE)} limit.`);
        return false;
      }
      return true;
    });
    if (uploadOnly && valid.length > 0) {
      setAttachedFiles([{ id: crypto.randomUUID(), file: valid[0], name: valid[0].name, size: valid[0].size }]);
    } else {
      setAttachedFiles((prev) => [
        ...prev,
        ...valid.map((f) => ({ id: crypto.randomUUID(), file: f, name: f.name, size: f.size })),
      ]);
    }
  }, [uploadOnly]);

  if (uploadOnly) {
    return (
      <div
        className="border-t border-border bg-background px-4 py-3"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="max-w-[800px] mx-auto">
          <div className="bg-surface-elevated rounded-lg border border-border border-dashed">
            {attachedFiles.length > 0 ? (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <FileChip
                    name={attachedFiles[0].name}
                    size={formatSize(attachedFiles[0].size)}
                    onRemove={() => setAttachedFiles([])}
                  />
                </div>
                <Button
                  variant="send"
                  size="sm"
                  onClick={handleSubmit}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4 mr-1" />
                  Upload & Start
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center gap-2 py-8 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Paperclip className="h-6 w-6" />
                <span className="text-sm font-heading">Upload a document to start</span>
                <span className="text-xs text-muted-foreground">PDF only. Max {formatSize(MAX_FILE_SIZE)}</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    );
  }

  const hasContent = value.trim().length > 0;

  return (
    <div
      className="border-t border-border bg-background px-4 py-3"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="max-w-[800px] mx-auto">
        <div className="bg-surface-elevated rounded-lg border border-border">
          <div className="flex items-end gap-2 px-3 py-2">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => { setValue(e.target.value); handleInput(); }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className={cn(
                "flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none font-body",
                "min-h-[36px] max-h-[160px]"
              )}
              aria-label="Message input"
            />

            <Button
              variant="send"
              size="icon"
              onClick={handleSubmit}
              disabled={!hasContent || disabled}
              aria-label="Send message"
              className="shrink-0 h-8 w-8 rounded-md"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-[10px] text-text-dim text-center mt-2">
          LegalMind may produce inaccurate information. Always verify citations.
        </p>
      </div>
    </div>
  );
}
