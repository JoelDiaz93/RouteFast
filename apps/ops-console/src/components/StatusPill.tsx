interface StatusPillProps {
  value: string;
  label?: string;
}

export function StatusPill({ value, label }: StatusPillProps) {
  const normalized = value.toLowerCase();
  const tone = normalized.includes('available') || normalized.includes('assigned') || normalized.includes('delivered') || normalized.includes('ready') || normalized.includes('success') || normalized.includes('connected')
    ? 'positive'
    : normalized.includes('failed') || normalized.includes('cancel') || normalized.includes('offline') || normalized.includes('error') || normalized.includes('network') || normalized.includes('disconnected')
      ? 'negative'
      : normalized.includes('search') || normalized.includes('dispatch') || normalized.includes('reserved') || normalized.includes('running') || normalized.includes('connecting')
        ? 'warning'
        : 'neutral';
  return <span className={`status-pill ${tone}`}>{label ?? value}</span>;
}
