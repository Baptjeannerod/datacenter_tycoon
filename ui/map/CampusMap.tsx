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
  DAM_ROW,
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
  type PlotView,
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
function Hall({ x, y, index, view, monitoring, outage }: { x: number; y: number; index: number; view: PlotView; monitoring: boolean; outage: boolean }) {
  const h = 38;
  const b = box(x, y, HALL_W, HALL_D, h);
  const D = iso(x, y + HALL_D);
  const C = iso(x + HALL_W, y + HALL_D);
  const B = iso(x + HALL_W, y);
  const up = new Set(view.upgrades);
  const gpu = up.has('gpu-hype-cluster');
  const dark = view.unpowered;
  const lightOn = dark ? '#3a3f5c' : outage ? '#ff6b5e' : gpu ? '#f39cff' : '#a8f5c9';
  const palettes = [
    { top: '#a9a6ec', left: '#5d63b4', right: '#474c96' },
    { top: '#f2a46a', left: '#d9673f', right: '#b8512f' },
    { top: '#8fd6cf', left: '#3f8f9a', right: '#2f7380' },
  ];
  const pal = gpu ? { top: '#c9a6f2', left: '#5d63b4', right: '#474c96' } : palettes[index % palettes.length];
  const roof = up.has('free-cooling') ? '#a8e3f2' : '#d9d8f3';
  return (
    <g className={`hall${dark ? ' dark' : ''}`}>
      <Box x={x} y={y} w={HALL_W} d={HALL_D} h={h} top={pal.top} left={pal.left} right={pal.right} />
      <Windows a={D} b={C} h={h} n={4} lit={4} color={lightOn} off="#2a2f55" />
      <Windows a={B} b={C} h={h} n={6} lit={6} color={lightOn} off="#23284a" />
      <g transform={`translate(0,${-h})`}>
        <Box x={x + 0.35} y={y + 0.5} w={0.6} d={0.8} h={8} top={roof} left="#9a99c8" right="#8483b8" />
        <Box x={x + 1.1} y={y + 1.6} w={0.6} d={0.8} h={8} top={roof} left="#9a99c8" right="#8483b8" />
      </g>
      {up.has('evaporative-cooling') && <Puffs at={{ x: b.topCenter.x - 14, y: b.topCenter.y - 12 }} color="#ffffff" count={2} size={7} />}
      {up.has('liquid-cooling') && <Cylinder at={{ x: B.x + 6, y: B.y + 4 }} r={8} h={18} body="#5fd0e0" topFill="#a6eef5" />}
      {up.has('water-closed-loop') && <Cylinder at={{ x: D.x - 4, y: D.y - 6 }} r={8} h={16} body="#b7a8ee" topFill="#d7cff4" />}
      {up.has('heat-reuse') && <line x1={C.x} y1={C.y - 4} x2={C.x + 22} y2={C.y + 8} stroke="#ef8a3a" strokeWidth={5} strokeLinecap="round" />}
      {monitoring && index === 0 && (
        <g>
          <line x1={b.topCenter.x + 18} y1={b.topCenter.y + 4} x2={b.topCenter.x + 18} y2={b.topCenter.y - 22} stroke={INK} strokeWidth={2} />
          <circle className="blink" cx={b.topCenter.x + 18} cy={b.topCenter.y - 24} r={3.5} fill="#8be36b" stroke={INK} strokeWidth={1} />
        </g>
      )}
      {gpu && (
        <g transform={`translate(${b.topCenter.x - 18},${b.topCenter.y - 14})`}>
          <rect width={36} height={13} fill={INK} />
          <text x={18} y={10} textAnchor="middle" className="map-tag" fill="#f39cff">
            GPU
          </text>
        </g>
      )}
      {view.hallNo && (
        <text x={b.groundCenter.x} y={b.groundCenter.y + 26} textAnchor="middle" className="map-tag" fill={INK}>
          HALL {String(view.hallNo).padStart(2, '0')}
        </text>
      )}
    </g>
  );
}

/** Red "!" above a building that has no power. */
function Alert({ at }: { at: Pt }) {
  return (
    <g className="alert" transform={`translate(${at.x},${at.y})`}>
      <title>No power: build a plant or upgrade one</title>
      <circle r={13} fill="#e2574c" stroke={INK} strokeWidth={2} />
      <rect x={-2.5} y={-8} width={5} height={10} fill="#fff" />
      <rect x={-2.5} y={4} width={5} height={4} fill="#fff" />
    </g>
  );
}

function GasPlant({ x, y }: { x: number; y: number }) {
  const b = box(x + 0.3, y + 0.6, 1.4, 1.8, 20);
  return (
    <g>
      <Box x={x + 0.3} y={y + 0.6} w={1.4} d={1.8} h={20} top="#cfd3dc" left="#9ea4b3" right="#878d9d" />
      <rect x={b.topCenter.x + 6} y={b.topCenter.y - 34} width={8} height={36} fill="#b9bdc8" stroke={INK} strokeWidth={1.4} />
      <Puffs at={{ x: b.topCenter.x + 10, y: b.topCenter.y - 40 }} color="#d8dade" count={2} size={7} />
      <Cylinder at={{ x: b.groundCenter.x - 30, y: b.groundCenter.y + 12 }} r={10} h={14} body="#e9e2c9" topFill="#f5f0de" />
    </g>
  );
}

function CoalPlant({ x, y }: { x: number; y: number }) {
  const b = box(x + 0.2, y + 0.4, 1.6, 2.2, 26);
  return (
    <g>
      <Box x={x + 0.2} y={y + 0.4} w={1.6} d={2.2} h={26} top="#7b808c" left="#5d6270" right="#4a4f5c" />
      {[-10, 10].map((dx) => (
        <g key={dx}>
          <rect x={b.topCenter.x + dx - 5} y={b.topCenter.y - 48} width={10} height={50} fill="#8a8f9c" stroke={INK} strokeWidth={1.4} />
          <rect x={b.topCenter.x + dx - 5} y={b.topCenter.y - 48} width={10} height={6} fill="#e2574c" />
          <Puffs at={{ x: b.topCenter.x + dx, y: b.topCenter.y - 54 }} color="#4e5260" count={3} size={9} />
        </g>
      ))}
      <polygon points={pts([iso(x + 0.1, y + 2.75), iso(x + 0.9, y + 2.6, 10), iso(x + 1.6, y + 2.85)])} fill="#2b2b2f" stroke={INK} strokeWidth={1.2} />
    </g>
  );
}

function BiomassPlant({ x, y }: { x: number; y: number }) {
  const b = box(x + 0.3, y + 0.5, 1.4, 1.6, 20);
  return (
    <g>
      <Box x={x + 0.3} y={y + 0.5} w={1.4} d={1.6} h={20} top="#c9b38a" left="#9c7f53" right="#866b43" />
      <rect x={b.topCenter.x + 4} y={b.topCenter.y - 30} width={8} height={32} fill="#a68e6a" stroke={INK} strokeWidth={1.4} />
      <Puffs at={{ x: b.topCenter.x + 8, y: b.topCenter.y - 36 }} color="#b9b2a2" count={2} size={7} />
      {[0, 1, 2].map((i) => {
        const p = iso(x + 0.5 + i * 0.35, y + 2.6);
        return <ellipse key={i} cx={p.x} cy={p.y - 4} rx={9} ry={5} fill="#8a5a33" stroke={INK} strokeWidth={1.2} />;
      })}
    </g>
  );
}

function SolarPlot({ x, y, batteries }: { x: number; y: number; batteries: boolean }) {
  const rows: ReactNode[] = [];
  for (let gy = 0; gy < HALL_D; gy++) for (let gx = 0; gx < HALL_W; gx++) rows.push(<SolarRow key={`${gx}-${gy}`} gx={x + gx} gy={y + gy} />);
  return (
    <g>
      {rows}
      {batteries && <Box x={x + 1.4} y={y + 2.4} w={0.5} d={0.5} h={10} top="#9be36b" left="#5e9e48" right="#467a36" />}
    </g>
  );
}

function WindPlot({ x, y, batteries }: { x: number; y: number; batteries: boolean }) {
  return (
    <g>
      {[
        { gx: x + 0.5, gy: y + 0.6 },
        { gx: x + 1.5, gy: y + 1.5 },
        { gx: x + 0.6, gy: y + 2.4 },
      ].map((t, i) => (
        <WindTurbine key={i} at={iso(t.gx, t.gy)} />
      ))}
      {batteries && <Box x={x + 1.4} y={y + 2.4} w={0.5} d={0.5} h={10} top="#9be36b" left="#5e9e48" right="#467a36" />}
    </g>
  );
}

function Dam({ reservoir }: { reservoir: boolean }) {
  const rx = RIVER_X[DAM_ROW];
  return (
    <g>
      {reservoir && [0, 1].map((gy) => <polygon key={gy} points={pts([iso(RIVER_X[gy] - 0.4, gy), iso(RIVER_X[gy] + 2.4, gy), iso(RIVER_X[gy] + 2.4, gy + 1), iso(RIVER_X[gy] - 0.4, gy + 1)])} fill="#3fa2d6" stroke={INK} strokeWidth={1} />)}
      <Box x={rx - 0.3} y={DAM_ROW + 0.35} w={2.6} d={0.4} h={18} top="#d9d6cc" left="#b4b0a4" right="#9c988c" />
      <Box x={rx + 0.8} y={DAM_ROW + 0.1} w={0.5} d={0.5} h={26} top="#e6e2d6" left="#c4c0b4" right="#aaa69a" />
      <line className="ripple" x1={iso(rx + 0.5, DAM_ROW + 0.8).x} y1={iso(rx + 0.5, DAM_ROW + 0.8).y} x2={iso(rx + 0.5, DAM_ROW + 1.4).x} y2={iso(rx + 0.5, DAM_ROW + 1.4).y} stroke="#ffffff" strokeWidth={3} />
    </g>
  );
}

function EmptyPlot({ x, y, selected }: { x: number; y: number; selected: boolean }) {
  const b = box(x, y, HALL_W, HALL_D, 0);
  return (
    <g>
      <polygon points={b.top} fill={selected ? 'rgba(220,236,143,0.8)' : 'rgba(255,253,246,0.35)'} stroke={INK} strokeWidth={selected ? 2.5 : 1.5} strokeDasharray="6 5" />
      <g transform={`translate(${b.groundCenter.x},${b.groundCenter.y})`} className="plot-plus">
        <circle r={13} fill="#dcec8f" stroke={INK} strokeWidth={2} />
        <path d="M-6 0h12M0 -6v12" stroke={INK} strokeWidth={2.5} />
      </g>
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

/** Screen (SVG) centre of a plot; the last index is the river spot. */
export function plotCenter(i: number): Pt {
  if (i >= HALL_PLOTS.length) return iso(RIVER_X[DAM_ROW] + 1, DAM_ROW + 0.5);
  const p = HALL_PLOTS[i];
  return box(p.x, p.y, HALL_W, HALL_D, 0).groundCenter;
}

interface MapProps {
  view: CampusView;
  seed: number;
  /** Selected plot (index into state.plots), -1 for the Policies menu, null for none. */
  selected?: number | null;
  onSelect?: (plot: number | null) => void;
  /** The ring menu, positioned around the selected plot (or the centre for -1). */
  ring?: ReactNode;
  /** Anything to float over the map (onboarding hints). */
  overlay?: ReactNode;
}

export function CampusMap({ view, seed, selected = null, onSelect, ring, overlay }: MapProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: BASE_VB.w, h: BASE_VB.h });
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const interactive = Boolean(onSelect);

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
  const toScreen = (p: Pt) => ({ x: ((p.x - vb.x) / vb.w) * size.w, y: ((p.y - vb.y) / vb.h) * size.h });

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!canPan) return;
    drag.current = { x: e.clientX, y: e.clientY, px: cp.x, py: cp.y, moved: false };
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const dr = drag.current;
    if (!dr) return;
    if (!dr.moved && Math.hypot(e.clientX - dr.x, e.clientY - dr.y) < 6) return;
    if (!dr.moved) {
      dr.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const scale = vbW / size.w;
    setPan(clampPan({ x: dr.px - (e.clientX - dr.x) * scale, y: dr.py - (e.clientY - dr.y) * scale }));
  };
  const endDrag = () => {
    setTimeout(() => (drag.current = null), 0);
  };
  const pick = (i: number) => {
    if (drag.current?.moved) return;
    onSelect?.(selected === i ? null : i);
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
  const alerts: ReactNode[] = [];

  HALL_PLOTS.forEach((p, i) => {
    const v = view.plots[i];
    const depth = p.x + HALL_W + p.y + HALL_D;
    const isSel = selected === i;
    const hit = (
      <polygon
        className={`plot-hit${isSel ? ' selected' : ''}`}
        points={box(p.x, p.y, HALL_W, HALL_D, 0).top}
        onClick={() => pick(i)}
        role={interactive ? 'button' : undefined}
        aria-label={interactive ? (v.kind === 'empty' ? `Empty plot ${i + 1}: build here` : `Plot ${i + 1}: ${v.kind}, upgrade`) : undefined}
      />
    );
    if (v.kind === 'empty') {
      add(-1, `plot${i}`, (
        <g>
          <EmptyPlot x={p.x} y={p.y} selected={isSel} />
          {interactive && hit}
        </g>
      ));
      return;
    }
    let node: ReactNode;
    if (v.kind === 'hall') node = <Hall x={p.x} y={p.y} index={i} view={v} monitoring={view.monitoring} outage={view.outage} />;
    else if (v.kind === 'gas') node = <GasPlant x={p.x} y={p.y} />;
    else if (v.kind === 'coal') node = <CoalPlant x={p.x} y={p.y} />;
    else if (v.kind === 'biomass') node = <BiomassPlant x={p.x} y={p.y} />;
    else if (v.kind === 'solar') node = <SolarPlot x={p.x} y={p.y} batteries={v.upgrades.includes('battery-storage')} />;
    else node = <WindPlot x={p.x} y={p.y} batteries={v.upgrades.includes('battery-storage')} />;
    add(depth, `b${i}`, (
      <g className="building" onClick={() => pick(i)}>
        {isSel && <polygon points={box(p.x, p.y, HALL_W, HALL_D, 0).top} fill="rgba(220,236,143,0.7)" stroke={INK} strokeWidth={2.5} />}
        {interactive && hit}
        {node}
      </g>
    ));
    if (v.kind === 'hall' && view.debt >= 2) add(depth + 0.1, `smoke${i}`, <Puffs at={box(p.x, p.y, HALL_W, HALL_D, 46).topCenter} color={view.debt >= 3 ? '#6b6457' : '#9a9385'} count={view.debt} size={8} />);
    if (v.unpowered) alerts.push(<Alert key={`alert${i}`} at={{ x: box(p.x, p.y, HALL_W, HALL_D, 70).topCenter.x, y: box(p.x, p.y, HALL_W, HALL_D, 70).topCenter.y }} />);
  });

  // River spot: the dam, or an empty build marker on the water
  const rc = plotCenter(HALL_PLOTS.length);
  if (view.dam.kind === 'hydro') {
    add(RIVER_X[DAM_ROW] + DAM_ROW + 2, 'dam', (
      <g className="building" onClick={() => pick(HALL_PLOTS.length)}>
        <Dam reservoir />
      </g>
    ));
  } else if (interactive) {
    add(RIVER_X[DAM_ROW] + DAM_ROW + 2, 'dam-spot', (
      <g className="plot-plus river-spot" onClick={() => pick(HALL_PLOTS.length)} role="button" aria-label="River spot: build a dam">
        <circle cx={rc.x} cy={rc.y} r={selected === HALL_PLOTS.length ? 17 : 13} fill="#9fe0f7" stroke={INK} strokeWidth={2} strokeDasharray="4 3" />
        <path d={`M${rc.x - 6} ${rc.y}h12M${rc.x} ${rc.y - 6}v12`} stroke={INK} strokeWidth={2.5} />
      </g>
    ));
  }

  // Village (the neighbours); warm windows if any hall shares its heat
  const heat = view.plots.some((p) => p.upgrades.includes('heat-reuse'));
  const vA = AREAS.village;
  [
    { x: vA.x + 0.2, y: vA.y + 0.2 },
    { x: vA.x + 1.6, y: vA.y + 0.1 },
    { x: vA.x + 2.9, y: vA.y + 0.3 },
    { x: vA.x + 0.9, y: vA.y + 1.2 },
    { x: vA.x + 2.3, y: vA.y + 1.2 },
  ].forEach((h, i) => add(h.x + h.y + 1.6, `house${i}`, <House x={h.x} y={h.y} warm={heat} />));

  trees.forEach((t, i) => add(t.gx + t.gy + 0.9, `tree${i}`, <Tree at={t.at} biome={view.biome} s={t.s} />));
  objects.sort((a, b) => a.depth - b.depth);

  const anchor = selected === null ? null : selected < 0 ? { x: size.w / 2, y: size.h / 2 } : toScreen(plotCenter(selected));
  const R = Math.min(118, size.w / 2 - 50, size.h / 2 - 50);
  const ringPos = anchor ? { x: Math.max(R + 44, Math.min(size.w - R - 44, anchor.x)), y: Math.max(R + 40, Math.min(size.h - R - 40, anchor.y)) } : null;

  return (
    <div className={`campus${interactive ? ' interactive' : ''}`} ref={boxRef}>
      <svg
        className={`campus-svg${canPan ? ' can-pan' : ''}`}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Your campus: ${view.halls} datacenter hall${view.halls === 1 ? '' : 's'}, ${view.plots.filter((p) => p.kind !== 'empty' && p.kind !== 'hall').length} power plants, ${view.plots.filter((p) => p.kind === 'empty').length} free plots, a river.`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <Backdrop biome={view.biome} debt={view.debt} />
        <Ground biome={view.biome} lowWater={view.lowWater} />
        {objects.map((o) => o.node)}
        {alerts}
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
      {ring && ringPos && (
        <div className="ring-anchor" style={{ left: ringPos.x, top: ringPos.y, ['--ring-r' as string]: `${R}px` }}>
          {ring}
        </div>
      )}
      {limX > 40 && zoom === 1 && !ring && !overlay && <span className="drag-hint">Drag to explore · tap a plot to build</span>}
      {overlay}
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
