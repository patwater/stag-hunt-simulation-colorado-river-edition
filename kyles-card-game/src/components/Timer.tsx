interface TimerProps {
  seconds: number;
  label?: string;
  onSkip?: () => void;
}

export function Timer({ seconds, label, onSkip }: TimerProps) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isUrgent = seconds <= 30;
  const display = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-sm text-stone-400">{label}</span>}
      <span
        className="font-mono text-lg font-bold px-3 py-1 rounded"
        style={{
          color: isUrgent ? '#f87171' : '#f0e8d8',
          backgroundColor: isUrgent ? '#3a0a0a' : '#1c1208',
          border: `1px solid ${isUrgent ? '#7a1a1a' : '#3a2a10'}`,
        }}
      >
        {display}
      </span>
      {onSkip && (
        <button className="btn-secondary text-sm py-1 px-2" onClick={onSkip}>
          Skip Timer
        </button>
      )}
    </div>
  );
}
