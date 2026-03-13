import type { Citation } from '@/types/chat';

interface CitationButtonProps {
  citation: Citation;
  onClick: (citation: Citation) => void;
}

export const CitationButton = ({ citation, onClick }: CitationButtonProps) => {
  return (
    <button
      type="button"
      onClick={() => onClick(citation)}
      className="ml-0.5 inline-flex items-center justify-center align-super text-xs font-semibold text-primary transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
      aria-label={`View source: ${citation.documentName}, page ${citation.page}`}
    >
      [{citation.id}]
    </button>
  );
}
