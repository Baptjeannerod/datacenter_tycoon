import { describe, expect, it } from 'vitest';
import { createGame, loadContent, type Content } from '../../engine';
import { AREAS, DAM_ROW, GRID_H, GRID_W, HALL_D, HALL_W, HOUSES, PLOT_SLOTS, RIVER_X, campusView, inArea, isRiver, isRoad, landPlotCount, plotCenter } from './layout';

const content = loadContent();
const withPlots = (n: number): Content => ({ ...content, balance: { ...content.balance, landPlots: n } });

describe('campus layout', () => {
  it('has a position for every land plot in the content', () => {
    expect(PLOT_SLOTS.length).toBeGreaterThanOrEqual(content.balance.landPlots);
    expect(PLOT_SLOTS.length).toBeGreaterThanOrEqual(16);
  });

  it('keeps plots on the grid, off the river, roads and village, and apart', () => {
    const used = new Set<string>();
    PLOT_SLOTS.forEach((p, i) => {
      for (let dy = 0; dy < HALL_D; dy++) {
        for (let dx = 0; dx < HALL_W; dx++) {
          const gx = p.x + dx;
          const gy = p.y + dy;
          const where = `plot ${i} tile ${gx},${gy}`;
          expect(gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H, where).toBe(true);
          expect(isRiver(gx, gy), where).toBe(false);
          expect(isRoad(gx, gy), where).toBe(false);
          expect(inArea(gx, gy, AREAS.village) || inArea(gx, gy, AREAS.fields), where).toBe(false);
          expect(used.has(`${gx},${gy}`), where).toBe(false);
          used.add(`${gx},${gy}`);
        }
      }
    });
  });

  it('keeps houses in the village and off the road', () => {
    for (const h of HOUSES) {
      for (const [x, y] of [[h.x, h.y], [h.x + 0.8, h.y + 0.8]]) {
        expect(isRoad(Math.floor(x), Math.floor(y)) || isRiver(Math.floor(x), Math.floor(y))).toBe(false);
      }
    }
  });

  it('leaves room for the dam and its reservoir (river rows 0..DAM_ROW, one tile of bank)', () => {
    for (let gy = 0; gy <= DAM_ROW; gy++) {
      expect(isRiver(RIVER_X[gy], gy)).toBe(true);
      for (const p of PLOT_SLOTS) {
        if (gy < p.y || gy >= p.y + HALL_D) continue;
        expect(p.x + HALL_W <= RIVER_X[gy] - 1 || p.x >= RIVER_X[gy] + 3, `plot at ${p.x},${p.y}`).toBe(true);
      }
    }
  });

  it.each([8, 16])('shows exactly landPlots (%i) plots, river spot right after', (n) => {
    const c = withPlots(n);
    const loc = c.locations.find((l) => l.enabled) ?? c.locations[0];
    const state = createGame({ seed: 7, locationId: loc.id }, c);
    const view = campusView(state, c, loc, 0);
    expect(view.plots).toHaveLength(n);
    expect(view.river).toBe(n);
    expect(view.plots[0].kind).toBe('hall');
    // every plot has its own centre, and the river spot is not a land plot's centre
    const centres = Array.from({ length: n }, (_, i) => plotCenter(i, n));
    const key = (p: { x: number; y: number }) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    expect(new Set(centres.map(key)).size).toBe(n);
    expect(centres.map(key)).not.toContain(key(plotCenter(n, n)));
    expect(landPlotCount(c)).toBe(n);
  });
});
