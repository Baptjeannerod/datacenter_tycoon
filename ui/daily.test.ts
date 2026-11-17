import { describe, expect, it } from 'vitest';
import { createGame, loadContent, seedFromString, step } from '../engine';
import { dailyRun, isDailyRun } from './daily';

const content = loadContent();

describe('daily run', () => {
  it('two players get the same run on the same day', () => {
    const a = dailyRun(content, new Date(2026, 10, 17, 8, 0));
    const b = dailyRun(content, new Date(2026, 10, 17, 23, 59));
    expect(a).toEqual(b);
    expect(a.date).toBe('2026-11-17');
    expect(a.seed).toBe(seedFromString('2026-11-17'));
    const run = (d: typeof a) => JSON.stringify(step(createGame({ seed: d.seed, locationId: d.locationId }, content), content));
    expect(run(a)).toBe(run(b));
  });
  it('changes seed and rotates the valley from one day to the next', () => {
    const enabled = content.locations.filter((l) => l.enabled);
    const days = Array.from({ length: enabled.length }, (_, i) => dailyRun(content, new Date(2026, 10, 17 + i)));
    expect(new Set(days.map((d) => d.seed)).size).toBe(days.length);
    expect(new Set(days.map((d) => d.locationId)).size).toBe(enabled.length);
  });
  it('recognises the daily run', () => {
    const d = dailyRun(content, new Date(2026, 10, 17));
    expect(isDailyRun(d, d.seed, d.locationId)).toBe(true);
    expect(isDailyRun(d, d.seed + 1, d.locationId)).toBe(false);
  });
});
