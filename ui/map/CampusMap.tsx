/**
 * The living campus: an isometric, pixel-flavoured SVG drawn from game state.
 * - A river crosses the campus (it shrinks when you overuse water).
 * - 8 hall plots: built halls follow capacity, empty plots show room to grow,
 *   the next plot is highlighted with the MW at which it gets built.
 * - Upgrades appear on the map (solar field, wind turbines, cooling towers, tanks,
 *   gas turbines, heat pipe to the village). Haze and smoke grow with hidden debt.
 * Layout constants: ./layout.ts. Colours: ui/tokens.css (map palette mirrored here for SVG).
 */
import { memo, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import {
  AREAS,
  GRID_H,
  GRID_W,
  HALL_D,
  HALL_PLOTS,
  HALL_W,
  RIVER_X,
  ROAD_Y,
  SLAB_DEPTH,
  box,
  hash2,
  isBlocked,
  isRiver,
  isRoad,
  iso,
  pts,
  tile,
  type CampusView,
  type Pt,
} from './layout';

const INK = '#1d2232';
const BIOME = {
  temperate: { grass: '#8ccf55', grass2: '#83c74d', tree: '#3f9a3c', tree2: '#2f7a30' },
  nordic: { grass: '#d3e6dc', grass2: '#c6ddd0', tree: '#2f7a55', tree2: '#235e42' },
  coal: { grass: '#a6b46c', grass2: '#9caa64', tree: '#6f8a3c', tree2: '#566e2e' },
  desert: { grass: '#e6c98d', grass2: '#ddbe80', tree: '#5e9e48', tree2: '#467a36' },
} as const;

const BASE_VB = { x: -405, y: -105, w: 940, h: 625 };

// ---------------------------------------------------------------------------
// Small drawing helpers
// ---------------------------------------------------------------------------
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const up = (p: Pt, h: number): Pt => ({ x: p.x, y: p.y - h });

function Box({ x, y, w, d, h, top, left, right, stroke = INK }: { x: number; y: number; w: number; d: number; h: number; top: string; left: string; right: string; stroke?: string }) {
  const b = box(x, y, w, d, h);
  return (
    <g stroke={stroke} strokeWidth={1.5} strokeLinejoin="round">
      <polygon points={b.left} fill={left} />
      <polygon points={b.right} fill={right} />
      <polygon points={b.top} fill={top} />
    </g>
  );
}

function Cylinder({ at, r, h, body, topFill }: { at: Pt; r: number; h: number; body: string; topFill: string }) {
  const ry = r / 2;
  return (
    <g stroke={INK} strokeWidth={1.5}>
      <path d={`M${at.x - r},${at.y - h} L${at.x - r},${at.y} A${r},${ry} 0 0 0 ${at.x + r},${at.y} L${at.x + r},${at.y - h}`} fill={body} />
      <ellipse cx={at.x} cy={at.y - h} rx={r} ry={ry} fill={topFill} />
    </g>
  );
}

function Puffs({ at, color, count = 3, size = 7, className = 'puff' }: { at: Pt; color: string; count?: number; size?: number; className?: string }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} className={className} style={{ animationDelay: `${i * 0.9}s` }} cx={at.x + (i - 1) * 4} cy={at.y} r={size} fill={color} />
      ))}
    </g>
  );
}

/** Windows on a face between ground points a→b, `n` windows, `lit` of them lit. */
function Windows({ a, b, h, n, lit, color, off }: { a: Pt; b: Pt; h: number; n: number; lit: number; color: string; off: string }) {
  const out: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const t1 = (i + 0.25) / n;
    const t2 = (i + 0.75) / n;
    const p1 = lerp(a, b, t1);
    const p2 = lerp(a, b, t2);
    out.push(<polygon key={i} points={pts([up(p1, h * 0.75), up(p2, h * 0.75), up(p2, h * 0.3), up(p1, h * 0.3)])} fill={i < lit ? color : off} stroke="none" />);
  }
  return <g>{out}</g>;
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------
function Hall({ x, y, index, fill, gpu, outage, monitoring, label }: { x: number; y: number; index: number; fill: number; gpu: boolean; outage: boolean; monitoring: boolean; label?: string }) {
  const h = 38;
  const b = box(x, y, HALL_W, HALL_D, h);
  const D = iso(x, y + HALL_D);
  const C = iso(x + HALL_W, y + HALL_D);
  const B = iso(x + HALL_W, y);
  const lightOn = outage ? '#ff6b5e' : gpu ? '#f39cff' : '#a8f5c9';
  // Alternate building palettes so a big campus does not look like one block.
  const palettes = [
    { top: '#a9a6ec', left: '#5d63b4', right: '#474c96' },
    { top: '#f2a46a', left: '#d9673f', right: '#b8512f' },
    { top: '#8fd6cf', left: '#3f8f9a', right: '#2f7380' },
  ];
  const pal = gpu ? { top: '#c9a6f2', left: '#5d63b4', right: '#474c96' } : palettes[index % palettes.length];
  const leftN = 4;
  const rightN = 6;
  const litLeft = Math.round(leftN * fill);
  const litRight = Math.round(rightN * fill);
  return (
    <g className="hall">
      <Box x={x} y={y} w={HALL_W} d={HALL_D} h={h} top={pal.top} left={pal.left} right={pal.right} />
      <Windows a={D} b={C} h={h} n={leftN} lit={litLeft} color={lightOn} off="#2a2f55" />
      <Windows a={B} b={C} h={h} n={rightN} lit={litRight} color={lightOn} off="#23284a" />
      {/* roof units */}
      <g transform={`translate(0,${-h})`}>
        <Box x={x + 0.35} y={y + 0.5} w={0.6} d={0.8} h={8} top="#d9d8f3" left="#9a99c8" right="#8483b8" />
        <Box x={x + 1.1} y={y + 1.6} w={0.6} d={0.8} h={8} top="#d9d8f3" left="#9a99c8" right="#8483b8" />
      </g>
      {monitoring && index === 0 && (
        <g>
          <line x1={b.topCenter.x + 18} y1={b.topCenter.y + 4} x2={b.topCenter.x + 18} y2={b.topCenter.y - 22} stroke={INK} strokeWidth={2} />
          <circle className="blink" cx={b.topCenter.x + 18} cy={b.topCenter.y - 24} r={3.5} fill="#8be36b" stroke={INK} strokeWidth={1} />
        </g>
      )}
      {gpu && index === 0 && (
        <g transform={`translate(${b.topCenter.x - 18},${b.topCenter.y - 14})`}>
          <rect width={36} height={13} fill={INK} />
          <text x={18} y={10} textAnchor="middle" className="map-tag" fill="#f39cff">
            GPU
          </text>
        </g>
      )}
      {label && (
        <g transform={`translate(${b.topCenter.x},${b.topCenter.y - 34})`}>
          <rect x={-62} y={-13} width={124} height={22} fill={INK} />
          <text x={0} y={3} textAnchor="middle" className="map-label" fill="#f3f1e8">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

function EmptyPlot({ x, y, next, nextAt }: { x: number; y: number; next: boolean; nextAt?: number }) {
  const b = box(x, y, HALL_W, HALL_D, 0);
  return (
    <g>
      <polygon points={b.top} fill={next ? 'rgba(220,236,143,0.55)' : 'rgba(255,253,246,0.22)'} stroke={INK} strokeWidth={1.5} strokeDasharray="6 5" />
      {next && nextAt !== undefined && (
        <g transform={`translate(${b.groundCenter.x},${b.groundCenter.y})`}>
          <rect x={-66} y={-12} width={132} height={22} fill="#dcec8f" stroke={INK} strokeWidth={1.5} />
          <text x={0} y={3.5} textAnchor="middle" className="map-label" fill={INK}>
            + NEXT HALL {nextAt.toFixed(1)} MW
          </text>
        </g>
      )}
    </g>
  );
}

function Tree({ at, biome, s }: { at: Pt; biome: CampusView['biome']; s: number }) {
  const c = BIOME[biome];
  if (biome === 'desert') {
    return (
      <g stroke={INK} strokeWidth={1.2} transform={`translate(${at.x},${at.y}) scale(${s})`}>
        <rect x={-3} y={-22} width={6} height={22} fill={c.tree} />
        <rect x={-10} y={-15} width={5} height={9} fill={c.tree} />
        <rect x={5} y={-18} width={5} height={8} fill={c.tree} />
      </g>
    );
  }
  if (biome === 'nordic') {
    return (
      <g stroke={INK} strokeWidth={1.2} transform={`translate(${at.x},${at.y}) scale(${s})`}>
        <rect x={-2} y={-6} width={4} height={6} fill="#7a4b2a" />
        <polygon points="0,-34 -11,-14 11,-14" fill={c.tree} />
        <polygon points="0,-24 -13,-5 13,-5" fill={c.tree2} />
        <polygon points="0,-34 -4,-27 4,-27" fill="#ffffff" stroke="none" />
      </g>
    );
  }
  return (
    <g stroke={INK} strokeWidth={1.2} transform={`translate(${at.x},${at.y}) scale(${s})`}>
      <rect x={-2.5} y={-8} width={5} height={8} fill="#7a4b2a" />
      <polygon points="0,-38 -12,-20 0,-14 12,-20" fill={c.tree} />
      <polygon points="0,-26 -14,-8 0,-3 14,-8" fill={c.tree2} />
    </g>
  );
}

function WindTurbine({ at }: { at: Pt }) {
  return (
    <g>
      <polygon points={pts([{ x: at.x - 2.5, y: at.y }, { x: at.x + 2.5, y: at.y }, { x: at.x + 1.2, y: at.y - 92 }, { x: at.x - 1.2, y: at.y - 92 }])} fill="#f4f4f0" stroke={INK} strokeWidth={1.2} />
      <g transform={`translate(${at.x},${at.y - 94})`}>
        <g className="spin">
          {[0, 120, 240].map((r) => (
            <polygon key={r} transform={`rotate(${r})`} points="-2,0 2,0 1,-36 -1,-36" fill="#f4f4f0" stroke={INK} strokeWidth={1.1} />
          ))}
        </g>
        <circle r={4} fill="#dcec8f" stroke={INK} strokeWidth={1.2} />
      </g>
    </g>
  );
}

function House({ x, y, warm }: { x: number; y: number; warm: boolean }) {
  const b = box(x, y, 0.8, 0.8, 16);
  const roofPeak = { x: b.topCenter.x, y: b.topCenter.y - 12 };
  const a = up(iso(x, y), 16);
  const B = up(iso(x + 0.8, y), 16);
  const C = up(iso(x + 0.8, y + 0.8), 16);
  const D = up(iso(x, y + 0.8), 16);
  return (
    <g>
      <Box x={x} y={y} w={0.8} d={0.8} h={16} top="#f0e6d2" left="#efe1c4" right="#d8c7a5" />
      <polygon points={pts([D, C, roofPeak])} fill="#e2574c" stroke={INK} strokeWidth={1.3} />
      <polygon points={pts([B, C, roofPeak])} fill="#b9443b" stroke={INK} strokeWidth={1.3} />
      <polygon points={pts([a, B, roofPeak])} fill="#c94c42" stroke={INK} strokeWidth={1.3} />
      <rect x={b.groundCenter.x - 4} y={b.groundCenter.y - 12} width={6} height={6} fill={warm ? '#ffcf5a' : '#5b6072'} stroke={INK} strokeWidth={1} />
    </g>
  );
}

function SolarRow({ gx, gy }: { gx: number; gy: number }) {
  const a = iso(gx + 0.1, gy + 0.15, 9);
  const b = iso(gx + 0.9, gy + 0.15, 9);
  const c = iso(gx + 0.9, gy + 0.85, 2);
  const d = iso(gx + 0.1, gy + 0.85, 2);
  return (
    <g>
      <polygon points={pts([a, b, c, d])} fill="#2f3f95" stroke={INK} strokeWidth={1.3} />
      <line x1={lerp(a, d, 0.5).x} y1={lerp(a, d, 0.5).y} x2={lerp(b, c, 0.5).x} y2={lerp(b, c, 0.5).y} stroke="#7d95e8" strokeWidth={1} />
      <line x1={lerp(a, b, 0.5).x} y1={lerp(a, b, 0.5).y} x2={lerp(d, c, 0.5).x} y2={lerp(d, c, 0.5).y} stroke="#7d95e8" strokeWidth={1} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Static ground layer (memoised: depends only on biome, water level, debt)
// ---------------------------------------------------------------------------
const Ground = memo(function Ground({ biome, lowWater }: { biome: CampusView['biome']; lowWater: boolean }) {
  const c = BIOME[biome];
  const slab = box(0, 0, GRID_W, GRID_H, 0);
  const sideL = pts([iso(0, GRID_H), iso(GRID_W, GRID_H), iso(GRID_W, GRID_H, -SLAB_DEPTH), iso(0, GRID_H, -SLAB_DEPTH)]);
  const sideR = pts([iso(GRID_W, 0), iso(GRID_W, GRID_H), iso(GRID_W, GRID_H, -SLAB_DEPTH), iso(GRID_W, 0, -SLAB_DEPTH)]);
  const water = lowWater ? '#86b9c8' : '#4db7e6';
  const waterLight = lowWater ? '#b9d6dc' : '#9fe0f7';
  const tiles: ReactNode[] = [];
  for (let gy = 0; gy < GRID_H; gy++) {
    for (let gx = 0; gx < GRID_W; gx++) {
      if (isRiver(gx, gy)) {
        const bank = gx === RIVER_X[gy] ? 'left' : 'right';
        tiles.push(<polygon key={`t${gx}-${gy}`} points={tile(gx, gy)} fill={water} />);
        if (lowWater) {
          // exposed sandbanks on one side of each river tile
          const a = iso(gx + (bank === 'left' ? 0 : 0.6), gy);
          const b = iso(gx + (bank === 'left' ? 0.4 : 1), gy);
          const cc = iso(gx + (bank === 'left' ? 0.4 : 1), gy + 1);
          const d = iso(gx + (bank === 'left' ? 0 : 0.6), gy + 1);
          tiles.push(<polygon key={`s${gx}-${gy}`} points={pts([a, b, cc, d])} fill="#d9c38f" />);
        }
        if (hash2(gx, gy, 3) < 0.6) {
          const p = iso(gx + 0.3 + hash2(gx, gy, 4) * 0.3, gy + 0.5);
          tiles.push(<line key={`w${gx}-${gy}`} className="ripple" x1={p.x - 8} y1={p.y} x2={p.x + 8} y2={p.y} stroke={waterLight} strokeWidth={2} />);
        }
      } else if (isRoad(gx, gy)) {
        tiles.push(<polygon key={`t${gx}-${gy}`} points={tile(gx, gy)} fill="#d9cba5" />);
      } else if ((gx + gy) % 2 === 0) {
        tiles.push(<polygon key={`t${gx}-${gy}`} points={tile(gx, gy)} fill={c.grass2} />);
      }
    }
  }
  // Waterfall where the river leaves the slab (front-left edge, last row)
  const rx = RIVER_X[GRID_H - 1];
  const fallTop = [iso(rx + (lowWater ? 0.6 : 0), GRID_H), iso(rx + 2 - (lowWater ? 0.6 : 0), GRID_H)];
  const fall = pts([fallTop[0], fallTop[1], { x: fallTop[1].x, y: fallTop[1].y + SLAB_DEPTH + 26 }, { x: fallTop[0].x, y: fallTop[0].y + SLAB_DEPTH + 26 }]);
  // Bridge where the road crosses the river
  const bx = RIVER_X[ROAD_Y];
  return (
    <g>
      <polygon points={sideL} fill="#c27f43" stroke={INK} strokeWidth={2} />
      <polygon points={sideR} fill="#9b5f2e" stroke={INK} strokeWidth={2} />
      <polyline points={pts([iso(0, GRID_H, -12), iso(GRID_W, GRID_H, -12), iso(GRID_W, 0, -12)])} fill="none" stroke="#8a5229" strokeWidth={2} strokeDasharray="10 8" />
      <polygon points={slab.top} fill={c.grass} stroke={INK} strokeWidth={2} />
      {tiles}
      <polygon points={fall} fill={water} stroke={INK} strokeWidth={1.5} />
      <line className="ripple" x1={(fallTop[0].x + fallTop[1].x) / 2 - 6} y1={fallTop[0].y + 14} x2={(fallTop[0].x + fallTop[1].x) / 2 - 6} y2={fallTop[0].y + 40} stroke={waterLight} strokeWidth={2} />
      <g>
        <Box x={bx - 0.1} y={ROAD_Y + 0.1} w={2.2} d={0.8} h={5} top="#b07a45" left="#8f5f33" right="#7a4f2a" />
        {[0, 0.5, 1, 1.5, 2].map((t) => {
          const p = iso(bx + t, ROAD_Y + 0.1, 5);
          const q = iso(bx + t, ROAD_Y + 0.9, 5);
          return (
            <g key={t}>
              <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - 9} stroke={INK} strokeWidth={1.5} />
              <line x1={q.x} y1={q.y} x2={q.x} y2={q.y - 9} stroke={INK} strokeWidth={1.5} />
            </g>
          );
        })}
        <line x1={iso(bx - 0.1, ROAD_Y + 0.1, 14).x} y1={iso(bx - 0.1, ROAD_Y + 0.1, 14).y} x2={iso(bx + 2.1, ROAD_Y + 0.1, 14).x} y2={iso(bx + 2.1, ROAD_Y + 0.1, 14).y} stroke={INK} strokeWidth={1.5} />
        <line x1={iso(bx - 0.1, ROAD_Y + 0.9, 14).x} y1={iso(bx - 0.1, ROAD_Y + 0.9, 14).y} x2={iso(bx + 2.1, ROAD_Y + 0.9, 14).x} y2={iso(bx + 2.1, ROAD_Y + 0.9, 14).y} stroke={INK} strokeWidth={1.5} />
      </g>
    </g>
  );
});

function Backdrop({ biome, debt }: { biome: CampusView['biome']; debt: number }) {
  // A horizon band behind the campus. Its lower part is hidden by the slab, drawn later.
  const horizon = 'M-420,230 C-330,120 -250,40 -140,10 C-40,-18 60,-16 160,20 C300,70 420,150 540,250 L540,420 L-420,420 Z';
  const far = 'M-420,170 C-300,60 -200,-30 -60,-40 C80,-50 200,-10 330,60 C430,110 500,150 540,190 L540,420 L-420,420 Z';
  const fill = { temperate: ['#cfe6a8', '#b3d98a'], nordic: ['#e3edf2', '#cfdde6'], coal: ['#c9cbb4', '#b3b89b'], desert: ['#f2d7a6', '#e8c086'] }[biome];
  return (
    <g>
      <path d={far} fill={fill[0]} stroke={INK} strokeWidth={1.5} />
      <path d={horizon} fill={fill[1]} stroke={INK} strokeWidth={1.5} />
      {biome === 'nordic' && (
        <g>
          <polygon points="-300,95 -220,-20 -150,70" fill="#c9d7e3" stroke={INK} strokeWidth={1.5} />
          <polygon points="-220,-20 -200,8 -243,10" fill="#fff" />
          <polygon points="-160,60 -60,-75 40,20" fill="#bfcfdc" stroke={INK} strokeWidth={1.5} />
          <polygon points="-60,-75 -36,-43 -86,-42" fill="#fff" />
        </g>
      )}
      {biome === 'desert' && (
        <g>
          <circle cx={380} cy={-40} r={34} fill="#f6d878" stroke={INK} strokeWidth={1.5} />
          <polygon points="-310,110 -280,40 -190,40 -165,80" fill="#e4a96a" stroke={INK} strokeWidth={1.5} />
          <polygon points="-120,30 -95,-12 -20,-12 0,20" fill="#d99355" stroke={INK} strokeWidth={1.5} />
        </g>
      )}
      {biome === 'coal' && (
        <g>
          <rect x={-250} y={-60} width={16} height={110} fill="#8a8f9c" stroke={INK} strokeWidth={1.5} />
          <rect x={-222} y={-38} width={16} height={88} fill="#8a8f9c" stroke={INK} strokeWidth={1.5} />
          <rect x={-275} y={10} width={95} height={40} fill="#6d7280" stroke={INK} strokeWidth={1.5} />
          <Puffs at={{ x: -242, y: -68 }} color="#5d6170" count={3} size={11 + debt * 2} className="puff slow" />
          <Puffs at={{ x: -214, y: -46 }} color="#6b6f7d" count={3} size={10 + debt * 2} className="puff slow" />
        </g>
      )}
      {biome === 'temperate' && (
        <g>
          <path d="M-215,40 Q-205,-10 -212,-58 L-162,-58 Q-169,-10 -159,40 Z" fill="#ebe7da" stroke={INK} strokeWidth={1.5} />
          <ellipse cx={-187} cy={-58} rx={25} ry={6} fill="#d8d3c3" stroke={INK} strokeWidth={1.5} />
          <Puffs at={{ x: -187, y: -68 }} color="#ffffff" count={3} size={12} className="puff slow" />
        </g>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function CampusMap({ view, seed }: { view: CampusView; seed: number }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: BASE_VB.w, h: BASE_VB.h });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Match the viewBox to the container's shape: wide screens show extra sky,
  // narrow (phone) screens crop the sides and let you drag to explore.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const aspect = size.w / size.h;
  const vbH = BASE_VB.h / zoom;
  const vbW = vbH * aspect;
  const limX = Math.max(0, (BASE_VB.w - vbW) / 2);
  const limY = Math.max(0, (BASE_VB.h - vbH) / 2);
  const clampPan = (p: { x: number; y: number }) => ({ x: Math.max(-limX, Math.min(limX, p.x)), y: Math.max(-limY, Math.min(limY, p.y)) });
  const cp = clampPan(pan);
  const vb = { x: BASE_VB.x + (BASE_VB.w - vbW) / 2 + cp.x, y: BASE_VB.y + (BASE_VB.h - vbH) / 2 + cp.y, w: vbW, h: vbH };
  const canPan = limX > 0 || limY > 0;

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!canPan) return;
    drag.current = { x: e.clientX, y: e.clientY, px: cp.x, py: cp.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const scale = vbW / size.w;
    setPan(clampPan({ x: drag.current.px - (e.clientX - drag.current.x) * scale, y: drag.current.py - (e.clientY - drag.current.y) * scale }));
  };
  const setZ = (z: number) => {
    setZoom(z);
    if (z === 1) setPan({ x: 0, y: 0 });
  };

  const trees = useMemo(() => {
    const density = { temperate: 0.42, nordic: 0.38, coal: 0.26, desert: 0.16 }[view.biome] * (view.debt >= 3 ? 0.55 : view.debt === 2 ? 0.8 : 1);
    const list: { gx: number; gy: number; at: Pt; s: number }[] = [];
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        if (isBlocked(gx, gy) || hash2(gx, gy, seed % 7) > density) continue;
        list.push({ gx, gy, at: iso(gx + 0.3 + hash2(gx, gy, 11) * 0.4, gy + 0.3 + hash2(gx, gy, 13) * 0.4), s: 0.8 + hash2(gx, gy, 17) * 0.4 });
      }
    }
    return list;
  }, [view.biome, view.debt, seed]);

  // Depth-sorted objects
  const objects: { depth: number; node: ReactNode }[] = [];
  const add = (depth: number, key: string, node: ReactNode) => objects.push({ depth, node: <g key={key}>{node}</g> });

  HALL_PLOTS.forEach((p, i) => {
    const depth = p.x + HALL_W + p.y + HALL_D;
    if (i < view.halls) {
      const newest = i === view.halls - 1;
      add(
        depth,
        `hall${i}`,
        <Hall
          x={p.x}
          y={p.y}
          index={i}
          fill={newest ? view.newestFill : 1}
          gpu={view.gpu && i < 2}
          outage={view.outage}
          monitoring={view.monitoring}
          label={newest ? `HALL ${String(i + 1).padStart(2, '0')} · ${Math.round(view.newestFill * 100)}% FULL` : undefined}
        />,
      );
      if (view.debt >= 2) add(depth + 0.1, `smoke${i}`, <Puffs at={box(p.x, p.y, HALL_W, HALL_D, 46).topCenter} color={view.debt >= 3 ? '#6b6457' : '#9a9385'} count={view.debt} size={8} />);
    } else {
      add(-1, `plot${i}`, <EmptyPlot x={p.x} y={p.y} next={i === view.halls} nextAt={i === view.halls ? (view.nextHallAtMW ?? undefined) : undefined} />);
    }
  });

  // Cooling plant
  const cA = AREAS.cooling;
  if (view.cooling === 'evaporative') {
    [0, 1].forEach((i) => {
      const at = iso(cA.x + 1, cA.y + 0.8 + i * 1.4);
      add(cA.x + 1 + cA.y + 1 + i * 1.4, `tower${i}`, (
        <g>
          <path d={`M${at.x - 20},${at.y} Q${at.x - 10},${at.y - 20} ${at.x - 14},${at.y - 40} L${at.x + 14},${at.y - 40} Q${at.x + 10},${at.y - 20} ${at.x + 20},${at.y} Z`} fill="#e6e2d6" stroke={INK} strokeWidth={1.5} />
          <ellipse cx={at.x} cy={at.y - 40} rx={14} ry={5} fill="#c9c4b4" stroke={INK} strokeWidth={1.5} />
          <Puffs at={{ x: at.x, y: at.y - 48 }} color="#ffffff" count={3} size={9} />
        </g>
      ));
    });
  } else if (view.cooling === 'liquid') {
    [0, 1].forEach((i) => {
      const at = iso(cA.x + 1, cA.y + 0.9 + i * 1.3);
      add(cA.x + 1 + cA.y + 1 + i * 1.3, `tank${i}`, <Cylinder at={at} r={17} h={26} body="#5fd0e0" topFill="#a6eef5" />);
    });
    const p1 = iso(cA.x, cA.y + 1.5, 6);
    const p2 = iso(HALL_PLOTS[1].x + HALL_W, cA.y + 1.5, 6);
    add(0, 'pipe-liquid', <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#3aa6c9" strokeWidth={5} strokeLinecap="round" />);
  } else {
    const n = view.cooling === 'free' ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const y = cA.y + 0.2 + i * (view.cooling === 'free' ? 0.95 : 1.3);
      const b = box(cA.x + 0.3, y, 1.2, 0.8, 14);
      add(cA.x + 1.5 + y + 0.8, `chiller${i}`, (
        <g>
          <Box x={cA.x + 0.3} y={y} w={1.2} d={0.8} h={14} top="#cfd3dc" left="#9ea4b3" right="#878d9d" />
          <ellipse className={view.cooling === 'free' ? 'fan' : undefined} cx={b.topCenter.x} cy={b.topCenter.y} rx={12} ry={6} fill={view.cooling === 'free' ? '#a8e3f2' : '#6b7180'} stroke={INK} strokeWidth={1.2} />
        </g>
      ));
    }
  }

  // Water loop tanks
  if (view.waterLoop) {
    const wA = AREAS.water;
    [0, 1].forEach((i) => {
      const at = iso(wA.x + 0.6 + i * 0.9, wA.y + 1);
      add(wA.x + i + wA.y + 1.5, `wtank${i}`, <Cylinder at={at} r={14} h={22} body="#b7a8ee" topFill="#d7cff4" />);
    });
  }

  // Gas turbines
  if (view.gas) {
    const gA = AREAS.gas;
    [0, 1, 2].forEach((i) => {
      const x = gA.x + i + 0.15;
      const b = box(x, gA.y + 0.15, 0.7, 0.7, 12);
      add(x + gA.y + 1.6, `gas${i}`, (
        <g>
          <Box x={x} y={gA.y + 0.15} w={0.7} d={0.7} h={12} top="#c1c4cc" left="#8b909c" right="#767b88" />
          <rect x={b.topCenter.x - 2.5} y={b.topCenter.y - 18} width={5} height={18} fill="#6d7280" stroke={INK} strokeWidth={1.2} />
          <Puffs at={{ x: b.topCenter.x, y: b.topCenter.y - 22 }} color="#55595f" count={2} size={7} />
        </g>
      ));
    });
  }

  // Solar field
  if (view.solar) {
    const sA = AREAS.solar;
    for (let gy = sA.y; gy < sA.y + sA.d; gy++) for (let gx = sA.x; gx < sA.x + sA.w; gx++) if (!isRoad(gx, gy)) add(gx + gy + 0.5, `solar${gx}-${gy}`, <SolarRow gx={gx} gy={gy} />);
  }

  // Wind turbines
  if (view.wind) {
    [11.5, 13.2, 14.9].forEach((gx, i) => {
      const at = iso(gx, AREAS.wind.y + 0.5);
      add(gx + AREAS.wind.y + 0.5, `wind${i}`, <WindTurbine at={at} />);
    });
  }

  // Village (always there: the neighbours) and the heat pipe
  const vA = AREAS.village;
  [
    { x: vA.x + 0.2, y: vA.y + 0.2 },
    { x: vA.x + 1.6, y: vA.y + 0.1 },
    { x: vA.x + 2.9, y: vA.y + 0.3 },
    { x: vA.x + 0.9, y: vA.y + 1.2 },
    { x: vA.x + 2.3, y: vA.y + 1.2 },
  ].forEach((h, i) => add(h.x + h.y + 1.6, `house${i}`, <House x={h.x} y={h.y} warm={view.heatReuse} />));

  let heatPipe: ReactNode = null;
  if (view.heatReuse) {
    const path = [iso(cA.x + 1, cA.y + cA.d, 4), iso(cA.x + 1, ROAD_Y + 0.85, 4), iso(13.2, ROAD_Y + 0.85, 4), iso(13.2, vA.y, 4)];
    heatPipe = (
      <g>
        <polyline points={pts(path)} fill="none" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
        <polyline points={pts(path)} fill="none" stroke="#ef8a3a" strokeWidth={4} strokeLinejoin="round" />
        <polyline className="flow" points={pts(path)} fill="none" stroke="#ffd29a" strokeWidth={2} strokeDasharray="6 10" />
      </g>
    );
  }

  trees.forEach((t, i) => add(t.gx + t.gy + 0.9, `tree${i}`, <Tree at={t.at} biome={view.biome} s={t.s} />));

  objects.sort((a, b) => a.depth - b.depth);

  return (
    <div className="campus" ref={boxRef}>
      <svg
        className={`campus-svg${canPan ? ' can-pan' : ''}`}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Your campus: ${view.halls} datacenter hall${view.halls > 1 ? 's' : ''} of ${HALL_PLOTS.length} plots, a river, ${view.solar ? 'a solar field, ' : ''}${view.wind ? 'wind turbines, ' : ''}${view.gas ? 'gas turbines, ' : ''}and the village.`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <Backdrop biome={view.biome} debt={view.debt} />
        <Ground biome={view.biome} lowWater={view.lowWater} />
        {heatPipe}
        {objects.map((o) => o.node)}
        {view.debt > 0 && <rect className="haze" x={BASE_VB.x - 200} y={BASE_VB.y - 200} width={BASE_VB.w + 400} height={BASE_VB.h + 400} fill="#7a5f3c" opacity={0.06 * view.debt} pointerEvents="none" />}
        {view.outage && (
          <g className="flash" transform={`translate(${iso(HALL_PLOTS[0].x + 1, HALL_PLOTS[0].y).x},${iso(HALL_PLOTS[0].x + 1, HALL_PLOTS[0].y).y - 96})`}>
            <rect x={-48} y={-14} width={96} height={24} fill="#e2574c" stroke={INK} strokeWidth={2} />
            <text x={0} y={3} textAnchor="middle" className="map-label" fill="#fff">
              OUTAGE!
            </text>
          </g>
        )}
      </svg>
      {limX > 40 && zoom === 1 && <span className="drag-hint">Drag to explore</span>}
      <div className="zoom">
        <button type="button" aria-label="Zoom in" onClick={() => setZ(Math.min(2.2, +(zoom + 0.4).toFixed(1)))}>
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => setZ(Math.max(1, +(zoom - 0.4).toFixed(1)))}>
          −
        </button>
      </div>
    </div>
  );
}
