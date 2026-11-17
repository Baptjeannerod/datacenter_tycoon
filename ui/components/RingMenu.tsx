/**
 * Radial build / upgrade menu, drawn around the plot you tapped (anchored by CampusMap).
 * The centre only shows the plot's name. Tap an option: its details (pitch, numbers, price,
 * why it is blocked, confirm button) appear in a card beside the ring, on the side with room.
 * The radius grows with the number of options so labels never overlap. Esc or × closes.
 * Never shows an upgrade's family (good / trap / tradeoff): spotting the trap is the game.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { money } from '../format';
import { Icon } from './Icons';
import './ring.css';

export interface RingItem {
  id: string;
  /** Short label under the icon (2 lines max, the card shows the full name). */
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
  /** Overrides the menu's verb and price on the confirm button (e.g. "Demolish · €250k, then pick what to build"). */
  verb?: string;
  /** Destructive option: drawn in red. */
  danger?: boolean;
}

interface Props {
  title: string;
  subtitle?: string;
  items: RingItem[];
  verb: string;
  onConfirm: (id: string) => void;
  onClose: () => void;
}

/** Bounding box of one option (icon + 2-line label), keep in sync with ring.css. */
const ITEM_W = 80;
const ITEM_H = 72;
/** Min space between two option boxes, and between option centres along the circle. */
const GAP = 4;
const MIN_SPACING = 84;
const MIN_R = 112;
/** Detail card width, margin to the map's edges, gap between ring and card. */
const CARD_W = 272;
const EDGE = 8;
const CARD_GAP = 12;

const angleOf = (i: number, n: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

/** Smallest radius where neighbouring option boxes do not overlap (and centres are ≥ MIN_SPACING apart). */
export function ringRadius(n: number): number {
  if (n <= 1) return MIN_R;
  let r = Math.max(MIN_R, MIN_SPACING / (2 * Math.sin(Math.PI / n)));
  for (let i = 0; i < n; i++) {
    const a = angleOf(i, n);
    const b = angleOf(i + 1, n);
    const dc = Math.abs(Math.cos(a) - Math.cos(b));
    const ds = Math.abs(Math.sin(a) - Math.sin(b));
    // Two boxes are apart if they are apart horizontally OR vertically.
    const need = Math.min(dc > 1e-6 ? (ITEM_W + GAP) / dc : Infinity, ds > 1e-6 ? (ITEM_H + GAP) / ds : Infinity);
    r = Math.max(r, need);
  }
  return Math.ceil(r);
}

interface Layout {
  /** Ring centre and scale, relative to the anchor (the tapped plot). */
  dx: number;
  dy: number;
  scale: number;
  /** Card position relative to the anchor. */
  cx: number;
  cy: number;
  cw: number;
  /** Card max height (phone only), px. */
  mh?: number;
  side: 'left' | 'right' | 'below';
}

const clamp = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));

export function RingMenu({ title, subtitle, items, verb, onConfirm, onClose }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [, relayout] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const item = items.find((i) => i.id === picked) ?? null;
  const n = Math.max(1, items.length);
  const r = ringRadius(n);
  const ringW = 2 * r + ITEM_W + 8;
  const ringH = 2 * r + ITEM_H + 8;

  // Esc closes; window resizes re-run the layout.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onResize = () => relayout((k) => k + 1);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [onClose]);

  // Place ring + card inside the map, before paint. Runs after every render on purpose (card height
  // changes with the picked option); it only sets state when the result changes, so it settles.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const root = rootRef.current;
    const card = cardRef.current;
    const box = root?.closest('.campus') ?? root?.parentElement?.parentElement;
    if (!root || !card || !box) return;
    const a = root.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const ax = a.left - b.left;
    const ay = a.top - b.top;
    const BW = box.clientWidth;
    const BH = box.clientHeight;
    const CH = card.offsetHeight;
    let next: Layout;
    let scale = Math.min(1, (BH - 2 * EDGE) / ringH, (BW - 2 * EDGE) / ringW);
    let sW = ringW * scale;
    let sH = ringH * scale;
    if (BW >= sW + CARD_GAP + CARD_W + 2 * EDGE) {
      // Desktop: card beside the ring, on the side with room; slide the ring if neither side has enough.
      let x = clamp(ax, EDGE + sW / 2, BW - EDGE - sW / 2);
      const roomRight = BW - EDGE - (x + sW / 2) - CARD_GAP;
      const roomLeft = x - sW / 2 - CARD_GAP - EDGE;
      let side: Layout['side'];
      if (roomRight >= CARD_W && (roomRight >= roomLeft || roomLeft < CARD_W)) side = 'right';
      else if (roomLeft >= CARD_W) side = 'left';
      else if (roomRight >= roomLeft) {
        side = 'right';
        x = BW - EDGE - CARD_W - CARD_GAP - sW / 2;
      } else {
        side = 'left';
        x = EDGE + CARD_W + CARD_GAP + sW / 2;
      }
      const y = clamp(ay, EDGE + sH / 2, BH - EDGE - sH / 2);
      const cardX = side === 'right' ? x + sW / 2 + CARD_GAP : x - sW / 2 - CARD_GAP - CARD_W;
      const cardY = clamp(y - CH / 2, EDGE, BH - EDGE - CH);
      next = { dx: x - ax, dy: y - ay, scale, cx: cardX - ax, cy: cardY - ay, cw: CARD_W, side };
    } else {
      // Narrow (phone): card along the bottom of the map, ring shrunk into the space above it.
      const cw = BW - 2 * EDGE;
      const mh = Math.round(BH * 0.5);
      const ch = Math.min(CH, mh);
      const above = BH - ch - CARD_GAP - 2 * EDGE;
      scale = Math.max(0.55, Math.min(scale, above / ringH));
      sW = ringW * scale;
      sH = ringH * scale;
      const x = clamp(ax, EDGE + sW / 2, BW - EDGE - sW / 2);
      const y = clamp(ay, EDGE + sH / 2, Math.max(EDGE + sH / 2, EDGE + above - sH / 2));
      next = { dx: x - ax, dy: y - ay, scale, cx: EDGE - ax, cy: BH - EDGE - ch - ay, cw, mh, side: 'below' };
    }
    const same = layout && (Object.keys(next) as (keyof Layout)[]).every((k) => (typeof next[k] === 'number' ? Math.abs((next[k] as number) - (layout[k] as number)) < 0.5 : next[k] === layout[k]));
    if (!same) setLayout(next);
  });

  const wheelStyle = {
    '--r': `${r}px`,
    '--inner': `${Math.max(48, r - 58)}px`,
    width: ringW,
    height: ringH,
    transform: layout ? `translate(${layout.dx}px, ${layout.dy}px) scale(${layout.scale})` : undefined,
  } as CSSProperties;

  return (
    <div className={`ring${layout ? '' : ' measuring'}`} ref={rootRef} role="dialog" aria-label={title}>
      <div className="ring-wheel" style={wheelStyle}>
        <div className="ring-disc" aria-hidden="true" />
        <div className="ring-center">
          <strong className={`ring-title${title.length > 14 ? ' long' : ''}`}>{title}</strong>
        </div>
        {items.map((it, i) => {
          const a = angleOf(i, n);
          return (
            <button
              key={it.id}
              type="button"
              className={`ring-item${it.ok ? '' : ' off'}${it.installed ? ' installed' : ''}${it.danger ? ' danger' : ''}${picked === it.id ? ' picked' : ''}`}
              style={{ left: `${(ringW / 2 + Math.cos(a) * r - ITEM_W / 2).toFixed(1)}px`, top: `${(ringH / 2 + Math.sin(a) * r - ITEM_H / 2).toFixed(1)}px`, animationDelay: `${i * 18}ms` }}
              onClick={() => setPicked(it.id)}
              title={it.name}
              aria-pressed={picked === it.id}
              aria-label={`${it.name}, ${it.installed ? 'installed' : it.cost === 0 ? 'free' : money(it.cost)}${it.reason && !it.installed ? `, ${it.reason}` : ''}`}
            >
              <span className="ring-icon">
                {it.installed ? '✓' : it.icon}
                {!it.installed && <span className="ring-cost">{it.cost === 0 ? 'free' : money(it.cost)}</span>}
              </span>
              <span className="ring-label">{it.label}</span>
            </button>
          );
        })}
        <button type="button" className="ring-close" aria-label="Close (Esc)" title="Close (Esc)" onClick={onClose}>
          ×
        </button>
      </div>

      <div
        ref={cardRef}
        className={`ring-card side-${layout?.side ?? 'right'}${item?.danger ? ' danger' : ''}`}
        style={layout ? { left: layout.cx, top: layout.cy, width: layout.cw, maxHeight: layout.mh } : { width: CARD_W }}
        aria-live="polite"
      >
        {item ? (
          <>
            <strong className="ring-card-name">{item.name}</strong>
            <p className="ring-card-pitch">{item.pitch}</p>
            {item.chips.length > 0 && (
              <ul className="chips ring-card-chips">
                {item.chips.map((c) => (
                  <li key={c.text} className={`chip ${c.tone}`}>
                    {c.text}
                  </li>
                ))}
              </ul>
            )}
            {item.note && <p className="ring-card-note">📍 {item.note}</p>}
            {item.ok ? (
              <button type="button" className={`btn ring-go ${item.danger ? 'danger' : 'primary'}`} onClick={() => onConfirm(item.id)}>
                {item.verb ?? `${verb} · ${item.cost === 0 ? 'free' : money(item.cost)}`}
              </button>
            ) : (
              <p className="ring-card-reason">{item.installed ? 'Already installed here' : item.reason}</p>
            )}
          </>
        ) : (
          <>
            <strong className="ring-card-name">{title}</strong>
            {subtitle && <p className="ring-card-pitch">{subtitle}</p>}
            <p className="ring-card-hint">Pick an option on the ring to see what it does and what it costs.</p>
          </>
        )}
      </div>
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
    demolish: <path d="M4 20h16M6 20v-6h8v6M15 4l5 5M13 6l5 5M14 10l-4 4" {...P} />,
  };
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {paths[kind] ?? <Icon.arrow />}
    </svg>
  );
}
