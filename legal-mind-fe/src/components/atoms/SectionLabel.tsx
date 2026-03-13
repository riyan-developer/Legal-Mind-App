interface SectionLabelProps {
  children: React.ReactNode;
}

export const SectionLabel = ({ children }: SectionLabelProps) => {
  return (
    <p className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}
