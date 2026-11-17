/** Tiny inline SVG icons (no icon library: keep the bundle light). 24x24, stroke = currentColor. */
import type { Upgrade } from '../../engine';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'square' as const, strokeLinejoin: 'miter' as const };

export const Icon = {
  logo: () => (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="6" {...P} />
      <rect x="4" y="14" width="16" height="6" {...P} />
      <path d="M7 7h4M7 17h4" {...P} />
    </svg>
  ),
  pin: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11z" {...P} />
      <circle cx="12" cy="10" r="2" {...P} />
    </svg>
  ),
  pause: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M8 5v14M16 5v14" {...P} strokeWidth={3} />
    </svg>
  ),
  play: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M7 4l12 8-12 8z" fill="currentColor" />
    </svg>
  ),
  arrow: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" {...P} />
    </svg>
  ),
  warn: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M12 3l10 18H2z" {...P} />
      <path d="M12 10v5M12 17.5v.5" {...P} />
    </svg>
  ),
  energy: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" {...P} />
    </svg>
  ),
  cloud: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z" {...P} />
    </svg>
  ),
  drop: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" {...P} />
    </svg>
  ),
  bars: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M5 20V10M12 20V4M19 20v-7" {...P} />
    </svg>
  ),
};

/** Category glyphs for upgrade cards. */
export function CategoryIcon({ category }: { category: Upgrade['category'] }) {
  const paths: Record<Upgrade['category'], string> = {
    cooling: 'M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9',
    energy: 'M13 2L4 14h7l-1 8 9-12h-7z',
    hardware: 'M4 5h16v6H4zM4 13h16v6H4zM7 8h3M7 16h3',
    ai: 'M8 8h8v8H8zM10 3v5M14 3v5M10 16v5M14 16v5M3 10h5M3 14h5M16 10h5M16 14h5',
    governance: 'M4 20h16M6 20V10M10 20V10M14 20V10M18 20V10M3 10l9-6 9 6',
    communication: 'M4 5h16v11H9l-5 4z',
    water: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z',
  };
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d={paths[category]} {...P} />
    </svg>
  );
}
