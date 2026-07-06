import { useRef, useEffect } from 'react';
import type { LogEntry } from '../data/types';

const TYPE_COLORS: Record<LogEntry['type'], string> = {
  info: '#a0a090',
  agreement: '#4ade80',
  defection: '#f87171',
  litigation: '#fb923c',
  resolution: '#60a5fa',
  alternative: '#c084fc',
  shortage: '#facc15',
};

const TYPE_PREFIX: Record<LogEntry['type'], string> = {
  info: '·',
  agreement: '✓',
  defection: '!',
  litigation: '⚖',
  resolution: '▶',
  alternative: '⚙',
  shortage: '▲',
};

interface GameLogProps {
  entries: LogEntry[];
  maxHeight?: string;
}

export function GameLog({ entries, maxHeight = '200px' }: GameLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="text-sm text-stone-500 italic py-2">No events yet.</div>
    );
  }

  return (
    <div
      className="overflow-y-auto text-sm space-y-1 pr-1"
      style={{ maxHeight, fontFamily: 'monospace' }}
    >
      {entries.map(entry => (
        <div key={entry.id} className="flex gap-2 leading-tight">
          <span className="shrink-0 text-stone-500">Y{entry.year}</span>
          <span
            className="shrink-0 font-bold"
            style={{ color: TYPE_COLORS[entry.type] }}
          >
            {TYPE_PREFIX[entry.type]}
          </span>
          <span className="text-stone-300 break-words">{entry.text}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
