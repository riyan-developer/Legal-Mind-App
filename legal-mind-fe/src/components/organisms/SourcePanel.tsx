import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SpecialZoomLevel, Viewer, Worker } from '@react-pdf-viewer/core';
import { X, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { useAppStore } from '@/store/appStore';
import { getDocumentPreviewUrl } from '@/services/document';
import type { Citation } from '@/types/chat';
import { Button } from '@/components/ui/button';

const CitationPdfPreview = ({
  citation,
  previewUrl,
}: {
  citation: Citation;
  previewUrl: string;
}) => {
  const pageIndex = Math.max((citation.page || 1) - 1, 0);
  const viewerKey = `${citation.documentId || citation.documentName}-${citation.page}-${citation.id}`;

  return (
    <div className="rounded-lg border border-border bg-surface/40 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <h4 className="font-heading text-sm font-semibold text-foreground">Document Preview</h4>
          <p className="text-xs text-muted-foreground">Page {citation.page} opened to the cited page.</p>
        </div>
      </div>

      <div className="h-[420px] bg-slate-950/80">
        <Worker workerUrl={pdfWorkerUrl}>
          <Viewer
            key={viewerKey}
            fileUrl={previewUrl}
            initialPage={pageIndex}
            defaultScale={SpecialZoomLevel.PageWidth}
            renderLoader={(percentages: number) => (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-100">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading PDF... {Math.round(percentages)}%</span>
              </div>
            )}
            renderError={(error) => (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-100">
                Unable to load the PDF preview. {error.message}
              </div>
            )}
          />
        </Worker>
      </div>
    </div>
  );
};

export const SourcePanel = () => {
  const { sourcePanelOpen, activeCitation, setActiveCitation } = useAppStore();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previewQuery = useQuery({
    queryKey: ['documents', 'preview-url', activeCitation?.documentId],
    queryFn: () => getDocumentPreviewUrl(activeCitation!.documentId!),
    enabled: sourcePanelOpen && Boolean(activeCitation?.documentId),
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!sourcePanelOpen || !activeCitation) {
      return;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveCitation(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeCitation, setActiveCitation, sourcePanelOpen]);

  return (
    <AnimatePresence>
      {sourcePanelOpen && activeCitation && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '40%', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="border-l border-border bg-background h-full overflow-hidden flex flex-col shrink-0"
          role="complementary"
          aria-label="Citation source details"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-heading text-sm font-semibold truncate">{activeCitation.documentName}</h3>
            </div>
            <Button
              ref={closeButtonRef}
              variant="ghost"
              size="icon"
              onClick={() => setActiveCitation(null)}
              aria-label="Close source panel"
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-heading font-semibold">Page {activeCitation.page}</span>
                <span>·</span>
                <span>Citation [{activeCitation.id}]</span>
              </div>

              <div className="space-y-4 text-sm leading-relaxed">
                <div className="citation-highlight rounded-md px-3 py-2 border-l-2 border-citation">
                  <p className="text-foreground font-medium">{activeCitation.excerpt}</p>
                  {activeCitation.highlightText && (
                    <div className="mt-2 px-2 py-1 bg-citation/20 rounded text-foreground text-xs font-semibold inline-block">
                      "{activeCitation.highlightText}"
                    </div>
                  )}
                </div>

                <p className="text-muted-foreground">
                  Use this excerpt to verify the answer against the original document language.
                </p>
              </div>

              {!activeCitation.documentId ? (
                <div className="rounded-lg border border-border bg-surface/40 px-4 py-5 text-sm text-muted-foreground">
                  PDF preview is unavailable for this citation.
                </div>
              ) : previewQuery.isLoading ? (
                <div className="rounded-lg border border-border bg-surface/40 px-4 py-12">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading PDF preview...</span>
                  </div>
                </div>
              ) : previewQuery.isError || !previewQuery.data?.url ? (
                <div className="rounded-lg border border-border bg-surface/40 px-4 py-5 text-sm text-muted-foreground">
                  Unable to load the PDF preview for this citation.
                </div>
              ) : (
                <CitationPdfPreview citation={activeCitation} previewUrl={previewQuery.data.url} />
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
