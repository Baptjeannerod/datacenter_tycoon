/**
 * Campus layout: where the river, roads, hall plots and features sit on the grid.
 * Pure data + helpers, no React. Grid: GRID_W x GRID_H tiles, isometric.
 *
 * To add a plot or move a feature, edit the constants below. Keep hall plots off
 * the river, the roads and the village (`layout.test.ts` checks it; `isBlocked`
 * is used by the tree scatter).
 *
 * The map defines 16 plot positions (PLOT_SLOTS) but only the first
 * `content.balance.landPlots` are shown and clickable. The river spot (dam) is
 * plot index `landPlots`, as in the engine.
 */
import { getBuilding, loadContent, type Content, type GameState, type Location, type PlantType } from '../../engine';

export const TW = 64; // tile width in px (screen)
export const TH = 32; // tile height in px (screen)
export const GRID_W = 24;
export const GRID_H = 18;
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
export const RIVER_X = [8, 8, 8, 9, 9, 10, 10, 10, 9, 9, 8, 8, 8, 9, 9, 10, 10, 10];
/** The main road runs along this row (bridge over the river); side roads run along ROAD_COLS. */
export const ROAD_Y = 8;
export const ROAD_COLS = [4, 15] as const;
export const isRiver = (gx: number, gy: number) => gy >= 0 && gy < GRID_H && (gx === RIVER_X[gy] || gx === RIVER_X[gy] + 1);
export const isRoad = (gx: number, gy: number) => gy === ROAD_Y || (ROAD_COLS as readonly number[]).includes(gx);

export interface Slot {
  x: number;
  y: number;
}

/**
 * Land plot positions (2 x 3 tiles each), indexed like `state.plots`.
 * 0-7: the core campus around the bridge (balance.landPlots = 8).
 * 8-15: the expansion ring (shown when balance.landPlots = 16).
 * Plot 0 holds the starting hall and plot 1 the starting plant, so keep them side by side.
 */
export const PLOT_SLOTS: readonly Slot[] = [
  { x: 13, y: 5 },
  { x: 16, y: 5 },
  { x: 13, y: 9 },
  { x: 16, y: 9 },
  { x: 5, y: 5 },
  { x: 2, y: 5 },
  { x: 13, y: 1 },
  { x: 16, y: 1 },
  // expansion
  { x: 19, y: 5 },
  { x: 19, y: 9 },
  { x: 5, y: 1 },
  { x: 2, y: 1 },
  { x: 19, y: 1 },
  { x: 13, y: 13 },
  { x: 16, y: 13 },
  { x: 19, y: 13 },
];
export const HALL_W = 2;
export const HALL_D = 3;
/** The river spot (plot index landPlots): where a dam can go. Upstream rows become a reservoir. */
export const DAM_ROW = 2;

/**
 * How many land plots the map shows: `content.balance.landPlots`, capped at the
 * positions we have. Dev assertion: logs an error if the content asks for more.
 */
export function landPlotCount(content: Content): number {
  const n = content.balance.landPlots;
  console.assert(PLOT_SLOTS.length >= n, `ui/map/layout.ts: balance.landPlots is ${n} but the map only has ${PLOT_SLOTS.length} plot positions`);
  return Math.min(n, PLOT_SLOTS.length);
}

/**
 * @deprecated Use `view.plots` (from campusView) or `landPlotCount(content)`.
 * Kept for GameScreen ("N of M plots free"): the plots shown with the bundled content.
 */
export const HALL_PLOTS: readonly Slot[] = PLOT_SLOTS.slice(0, landPlotCount(loadContent()));

/** Fixed decor areas. */
export const AREAS = {
  village: { x: 0, y: 11, w: 8, d: 5 },
  fields: { x: 16, y: 16, w: 6, d: 2 },
} as const;

/** Village houses (0.8 x 0.8 tiles), on both sides of the west road. */
export const HOUSES: readonly Slot[] = [
  { x: 0.3, y: 11.3 },
  { x: 1.7, y: 11.2 },
  { x: 2.9, y: 11.5 },
  { x: 5.2, y: 11.2 },
  { x: 6.6, y: 11.4 },
  { x: 0.7, y: 12.8 },
  { x: 2.2, y: 12.9 },
  { x: 5.4, y: 12.9 },
  { x: 6.8, y: 13.1 },
  { x: 1.2, y: 14.4 },
  { x: 2.8, y: 14.6 },
  { x: 5.6, y: 14.5 },
];

export const inArea = (gx: number, gy: number, a: { x: number; y: number; w: number; d: number }) => gx >= a.x && gx < a.x + a.w && gy >= a.y && gy < a.y + a.d;
export const inSlot = (gx: number, gy: number, p: Slot) => inArea(gx, gy, { x: p.x, y: p.y, w: HALL_W, d: HALL_D });

/** Tiles where nothing else may be drawn (used to place trees). Unused plot slots grow trees. */
export function isBlocked(gx: number, gy: number, landPlots: number = PLOT_SLOTS.length): boolean {
  if (isRiver(gx, gy) || isRoad(gx, gy)) return true;
  if (PLOT_SLOTS.slice(0, landPlots).some((p) => inSlot(gx, gy, p))) return true;
  return Object.values(AREAS).some((a) => inArea(gx, gy, a));
}

/** Screen (SVG) centre of a plot; index `river` (= landPlots) and above is the river spot. */
export function plotCenter(i: number, river: number): Pt {
  const p = i < river ? PLOT_SLOTS[i] : undefined;
  if (!p) return iso(RIVER_X[DAM_ROW] + 1, DAM_ROW + 0.5);
  return box(p.x, p.y, HALL_W, HALL_D, 0).groundCenter;
}

/** Deterministic pseudo-random in [0, 1) for a tile (stable tree positions). */
export function hash2(gx: number, gy: number, salt = 0): number {
  let h = (gx * 374761393 + gy * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// What the map shows, derived from game state (no game rules here).
// ---------------------------------------------------------------------------
export type DebtLevel = 0 | 1 | 2 | 3;
export type PlotKind = 'empty' | 'hall' | PlantType;

export interface PlotView {
  kind: PlotKind;
  upgrades: string[];
  /** A hall with no power this quarter (red "!"). */
  unpowered: boolean;
  /** Hall number (1-based) for labels. */
  hallNo?: number;
}

export interface CampusView {
  /** The land plots shown on the map (balance.landPlots of them). */
  plots: PlotView[];
  /** The river spot (dam), last entry of state.plots. */
  dam: PlotView;
  /** Plot index of the river spot (= balance.landPlots). */
  river: number;
  halls: number;
  outage: boolean;
  debt: DebtLevel;
  lowWater: boolean;
  gpu: boolean;
  monitoring: boolean;
  biome: 'temperate' | 'nordic' | 'coal' | 'desert';
}

export function debtLevel(envDebt: number): DebtLevel {
  if (envDebt >= 80) return 3;
  if (envDebt >= 40) return 2;
  if (envDebt >= 15) return 1;
  return 0;
}

export function campusView(state: GameState, content: Content, loc: Location, wue: number): CampusView {
  const unpowered = new Set(state.history.at(-1)?.unpoweredPlots ?? []);
  let hallNo = 0;
  const view = (i: number): PlotView => {
    const p = state.plots[i];
    if (!p) return { kind: 'empty', upgrades: [], unpowered: false };
    const b = getBuilding(content, p.building);
    if (b.kind === 'datacenter') {
      hallNo += 1;
      return { kind: 'hall', upgrades: p.upgrades, unpowered: unpowered.has(i), hallNo };
    }
    return { kind: b.plantType ?? 'gas', upgrades: p.upgrades, unpowered: false };
  };
  const plots = Array.from({ length: landPlotCount(content) }, (_, i) => view(i));
  const river = content.balance.landPlots;
  return {
    plots,
    dam: view(river),
    river,
    halls: hallNo,
    outage: Boolean(state.history.at(-1)?.outage),
    debt: debtLevel(state.envDebt),
    lowWater: wue * loc.waterStress >= 1.5 || state.firedEvents.includes('water-restriction'),
    gpu: state.flags.includes('ai-hype'),
    monitoring: state.policies.includes('energy-monitoring'),
    biome: loc.id === 'nordic-fjord' ? 'nordic' : loc.id === 'coal-valley' ? 'coal' : loc.id === 'sun-belt' ? 'desert' : 'temperate',
  };
}
