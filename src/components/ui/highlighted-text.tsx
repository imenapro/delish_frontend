import { useMemo } from 'react';

interface HighlightedTextProps {
  text: string;
  searchTerm: string;
  className?: string;
}

export function HighlightedText({ text, searchTerm, className }: HighlightedTextProps) {
  const parts = useMemo(() => {
    if (!searchTerm) return [text];
    // Escape special characters in searchTerm to prevent regex errors
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    return text.split(regex);
  }, [text, searchTerm]);

  if (!searchTerm) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {parts.map((part, i) => 
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 text-yellow-900 font-medium rounded-[2px]">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
}
