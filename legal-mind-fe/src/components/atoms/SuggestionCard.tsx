/** Clickable suggestion prompt card */
interface SuggestionCardProps {
  text: string;
  onClick: (text: string) => void;
}

export const SuggestionCard = ({ text, onClick }: SuggestionCardProps) => {
  return (
    <button
      onClick={() => onClick(text)}
      className="text-left px-4 py-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-surface-elevated/50 transition-colors"
    >
      {text}
    </button>
  );
}
