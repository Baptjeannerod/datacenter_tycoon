/**
 * Campus layout: where the river, roads, hall plots and features sit on the grid.
 * Pure data + helpers, no React. Grid: GRID_W x GRID_H tiles, isometric.
 *
 * To add a plot or move a feature, edit the constants below. Keep hall plots off
 * the river and the road (the `isBlocked` helper is used by the tree scatter).
 */
import type { GameState, Location } from '../../engine';

export const TW = 64; // tile width in px (screen)
export const TH = 32; // tile height in px (screen)
export const GRID_W = 16;
export const GRID_H = 12;
export const SLAB_DEPTH = 28;

export interface Pt {
  x: number;
  y: number;
}

/** Grid → screen (top corner of the tile). */
export const iso = (gx: number, gy: number, z = 0): Pt => ({ x: ((gx - gy) * TW) / 2, y: ((gx + gy) * TH) / 2 - z });
export const pts = (list: Pt[]) => list.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/** Polygons for an iso box with footprint (w x d) at (x, y), height h. */
export function box(x: number, y: number, w: number, d: number, h: number) {
  const a = iso(x, y);
  const b = iso(x + w, y);
  const c = iso(x + w, y + d);
  const dd = iso(x, y + d);
  const up = (p: Pt) => ({ x: p.x, y: p.y - h });
  return {
    top: pts([up(a), up(b), up(c), up(dd)]),
    right: pts([up(b), up(c), c, b]),
    left: pts([up(dd), up(c), c, dd]),
    /** Screen-space centre of the top face. */
    topCenter: { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 - h },
    groundCenter: { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 },
  };
}

export const tile = (gx: number, gy: number) => pts([iso(gx, gy), iso(gx + 1, gy), iso(gx + 1, gy + 1), iso(gx, gy + 1)]);

// ---------------------------------------------------------------------------
// The river: two tiles wide, meanders north → south (top-right → bottom-left on screen).
// RIVER_X[gy] is its first column on row gy.
// ---------------------------------------------------------------------------
export const RIVER_X = [10, 10, 9, 9, 9, 9, 8, 8, 9, 9, 10, 10];
export const ROAD_Y = 5;
export const isRiver = (gx: number, gy: number) => gy >= 0 && gy < GRID_H && (gx === RIVER_X[gy] || gx === RIVER_X[gy] + 1);
export const isRoad = (gx: number, gy: number) => gy === ROAD_Y || (gx === 3 && gy >= 1 && gy <= 9);

/** Datacenter hall plots, in build order. Footprint 2 x 3 tiles. The campus crosses the river at hall 5. */
export const HALL_PLOTS: { x: number; y: number }[] = [
  { x: 1, y: 1 },
  { x: 4, y: 1 },
  { x: 4, y: 7 },
  { x: 0, y: 7 },
  { x: 12, y: 1 },
  { x: 14, y: 0 },
  { x: 12, y: 7 },
  { x: 14, y: 7 },
];
export const HALL_W = 2;
export const HALL_D = 3;

/** Fixed feature areas. */
export const AREAS = {
  cooling: { x: 6, y: 1, w: 2, d: 3 },
  water: { x: 6, y: 7, w: 2, d: 2 },
  gas: { x: 0, y: 4, w: 3, d: 1 },
  solar: { x: 0, y: 10, w: 7, d: 2 },
  village: { x: 12, y: 10, w: 4, d: 2 },
  wind: { x: 11, y: 6, w: 5, d: 1 },
} as const;

const inArea = (gx: number, gy: number, a: { x: number; y: number; w: number; d: number }) => gx >= a.x && gx < a.x + a.w && gy >= a.y && gy < a.y + a.d;

/** Tiles where nothing else may be drawn (used to place trees). */
export function isBlocked(gx: number, gy: number): boolean {
  if (isRiver(gx, gy) || isRoad(gx, gy)) return true;
  if (HALL_PLOTS.some((p) => inArea(gx, gy, { x: p.x, y: p.y, w: HALL_W, d: HALL_D }))) return true;
  return Object.values(AREAS).some((a) => inArea(gx, gy, a));
}

/** Deterministic pseudo-random in [0, 1) for a tile (stable tree positions). */
export function hash2(gx: number, gy: number, salt = 0): number {
  let h = (gx * 374761393 + gy * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// What the map shows, derived from game state (no engine changes needed).
// ---------------------------------------------------------------------------
export type Cooling = 'chillers' | 'free' | 'evaporative' | 'liquid';
export type DebtLevel = 0 | 1 | 2 | 3;

export interface CampusView {
  halls: number;
  mwPerHall: number;
  /** Fill of the newest hall, 0..1. */
  newestFill: number;
  nextHallAtMW: number | null;
  cooling: Cooling;
  solar: boolean;
  wind: boolean;
  heatReuse: boolean;
  waterLoop: boolean;
  gas: boolean;
  gpu: boolean;
  monitoring: boolean;
  outage: boolean;
  debt: DebtLevel;
  lowWater: boolean;
  biome: 'temperate' | 'nordic' | 'coal' | 'desert';
}

export function debtLevel(envDebt: number): DebtLevel {
  if (envDebt >= 80) return 3;
  if (envDebt >= 40) return 2;
  if (envDebt >= 15) return 1;
  return 0;
}

export function campusView(state: GameState, loc: Location, wue: number): CampusView {
  const owned = new Set(state.owned);
  const chose = (id: string) => state.decisions.includes(id);
  const mwPerHall = loc.marketMW / HALL_PLOTS.length;
  const raw = state.capacityMW / mwPerHall;
  const halls = Math.max(1, Math.min(HALL_PLOTS.length, Math.ceil(raw - 1e-6)));
  const cooling: Cooling = owned.has('liquid-cooling')
    ? 'liquid'
    : owned.has('evaporative-cooling')
      ? 'evaporative'
      : owned.has('free-cooling')
        ? 'free'
        : 'chillers';
  return {
    halls,
    mwPerHall,
    newestFill: Math.min(1, Math.max(0.05, raw - (halls - 1))),
    nextHallAtMW: halls < HALL_PLOTS.length ? halls * mwPerHall : null,
    cooling,
    solar: owned.has('onsite-solar'),
    wind: owned.has('renewable-ppa') || chose('event:carbon-tax:clean-contract'),
    heatReuse: owned.has('heat-reuse'),
    waterLoop: owned.has('water-closed-loop') || chose('event:water-restriction:closed-loop'),
    gas: owned.has('gas-turbines') || chose('event:power-cap:turbines'),
    gpu: state.flags.includes('ai-hype'),
    monitoring: owned.has('energy-monitoring'),
    outage: Boolean(state.history.at(-1)?.outage),
    debt: debtLevel(state.envDebt),
    lowWater: wue * loc.waterStress >= 1.5 || state.firedEvents.includes('water-restriction'),
    biome: loc.id === 'nordic-fjord' ? 'nordic' : loc.id === 'coal-valley' ? 'coal' : loc.id === 'sun-belt' ? 'desert' : 'temperate',
  };
}
