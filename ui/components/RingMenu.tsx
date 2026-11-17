/**
 * Radial build / upgrade menu, drawn around the plot you tapped (positioned by CampusMap).
 * Tap an option to see its numbers in the centre, then confirm. Disabled options say why.
 * Never shows an upgrade's family (good / trap / tradeoff): spotting the trap is the game.
 */
import { useState, type ReactNode } from 'react';
import { money } from '../format';
import { Icon } from './Icons';

export interface RingItem {
  id: string;
  /** Short label under the icon. */
  label: string;
  name: string;
  pitch: string;
  cost: number;
  icon: ReactNode;
  ok: boolean;
  reason?: string;
  installed?: boolean;
  chips: { text: string; tone: 'up' | 'down' | 'info' }[];
  note?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  items: RingItem[];
  verb: string;
  onConfirm: (id: string) => void;
  onClose: () => void;
}

export function RingMenu({ title, subtitle, items, verb, onConfirm, onClose }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const item = items.find((i) => i.id === picked) ?? null;
  const n = Math.max(1, items.length);

  return (
    <div className="ring" role="dialog" aria-label={title}>
      <div className="ring-disc" aria-hidden="true" />
      {items.map((it, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return (
          <button
            key={it.id}
            type="button"
            className={`ring-item${it.ok ? '' : ' off'}${it.installed ? ' installed' : ''}${picked === it.id ? ' picked' : ''}`}
            style={{ transform: `translate(calc(${Math.cos(angle).toFixed(3)} * var(--ring-r)), calc(${Math.sin(angle).toFixed(3)} * var(--ring-r)))` }}
            onClick={() => setPicked(it.id)}
            aria-label={`${it.name}, ${it.installed ? 'installed' : it.cost === 0 ? 'free' : money(it.cost)}${it.reason && !it.installed ? `, ${it.reason}` : ''}`}
          >
            <span className="ring-icon">{it.installed ? '✓' : it.icon}</span>
            <span className="ring-label">{it.label}</span>
            {!it.installed && <span className="ring-cost">{it.cost === 0 ? 'free' : money(it.cost)}</span>}
          </button>
        );
      })}

      <div className="ring-center">
        {item ? (
          <>
            <strong className="ring-name" title={item.pitch}>
              {item.name}
            </strong>
            {item.chips.length > 0 && (
              <ul className="chips ring-chips">
                {item.chips.slice(0, 3).map((c) => (
                  <li key={c.text} className={`chip ${c.tone}`}>
                    {c.text}
                  </li>
                ))}
              </ul>
            )}
            {item.note && <span className="ring-note">📍 {item.note}</span>}
            {item.ok ? (
              <button type="button" className="btn primary ring-go" onClick={() => onConfirm(item.id)}>
                {verb} · {item.cost === 0 ? 'free' : money(item.cost)}
              </button>
            ) : (
              <span className="ring-reason">{item.installed ? 'Already installed here' : item.reason}</span>
            )}
          </>
        ) : (
          <>
            <strong className="ring-name">{title}</strong>
            {subtitle && <span className="ring-pitch">{subtitle}</span>}
          </>
        )}
      </div>
      <button type="button" className="ring-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

/** Glyphs for buildings in the ring. */
export function BuildingIcon({ kind }: { kind: string }) {
  const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'square' as const };
  const paths: Record<string, ReactNode> = {
    hall: <path d="M4 5h16v6H4zM4 13h16v6H4zM7 8h3M7 16h3" {...P} />,
    gas: <path d="M5 20V10h8v10M13 20V4h3v16M5 20h14" {...P} />,
    coal: <path d="M4 20V11h10v9M8 11V4h2v7M14 20V6h2v14M4 20h16" {...P} />,
    biomass: <path d="M12 20c-5-3-7-7-5-12 4 1 7 4 5 12zM12 20c3-3 6-5 7-9-4 0-6 3-7 9" {...P} />,
    wind: <path d="M12 21V11M12 11l-6-5M12 11l7-2M12 11l-1 7" {...P} />,
    solar: <path d="M3 18l3-9h12l3 9zM7.5 13.5h9M12 9v9" {...P} />,
    hydro: <path d="M3 8h18v4H3zM6 12v8M18 12v8M3 16c3-2 6 2 9 0s6 2 9 0" {...P} />,
  };
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {paths[kind] ?? <Icon.arrow />}
    </svg>
  );
}
