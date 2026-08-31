interface NavIconProps {
  name: 'overview' | 'orders' | 'drivers' | 'tracking' | 'dispatch' | 'optimization' | 'api';
}

export function NavIcon({ name }: NavIconProps) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'overview') return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
  if (name === 'orders') return <svg {...common}><path d="M6 3h12l2 4-8 4-8-4 2-4Z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg>;
  if (name === 'drivers') return <svg {...common}><path d="M3 6h11v9H3z"/><path d="M14 9h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>;
  if (name === 'tracking') return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
  if (name === 'dispatch') return <svg {...common}><path d="M5 5h5a4 4 0 0 1 4 4v10"/><path d="m10 2-3 3 3 3"/><path d="M14 14h5"/><path d="m17 11 3 3-3 3"/></svg>;
  if (name === 'optimization') return <svg {...common}><circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h4a4 4 0 0 1 4 4v6a4 4 0 0 0 4 4"/><path d="M10 9 6 13l4 4"/></svg>;
  return <svg {...common}><path d="m8 9-4 3 4 3"/><path d="m16 9 4 3-4 3"/><path d="m14 5-4 14"/></svg>;
}
