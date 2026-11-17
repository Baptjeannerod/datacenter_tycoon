import { describe, expect, it } from 'vitest';
import { loadContent } from './content';
import { derive, resolveUpgrade } from './derive';
import { applyAction, canBuy, createGame, currentDecision, saturate, shopUpgrades, step } from './game';
import { nextRandom, seedFromString } from './rng';
import { archetypeOf, computeScores, legacyScore, summarize } from './scoring';
import { balanced, greedy, playRun, virtuous } from './strategies';
import type { GameState } from './types';

const content = loadContent();
const newGame = (locationId = 'paris-basin', seed = 42) => createGame({ seed, locationId }, content);

/** Advance n ticks, auto-resolving any card with its first visible option. */
function advance(s: GameState, n: number): GameState {
  for (let i = 0; i < n && s.status === 'playing'; i++) {
    let d = currentDecision(s, content);
    while (d) {
      s =
        d.kind === 'quiz'
          ? applyAction(s, { type: 'answer', answerIndex: 0 }, content)
          : applyAction(s, { type: 'choose', choiceId: d.choices[0].id }, content);
      d = currentDecision(s, content);
    }
    s = step(s, content);
  }
  return s;
}

describe('rng', () => {
  it('is deterministic', () => {
    expect(nextRandom(1)).toEqual(nextRandom(1));
    expect(nextRandom(1).value).not.toEqual(nextRandom(2).value);
  });
  it('turns strings into stable seeds', () => {
    expect(seedFromString('2026-11-17')).toBe(seedFromString('2026-11-17'));
    expect(seedFromString('a')).not.toBe(seedFromString('b'));
  });
});

describe('createGame', () => {
  it('starts from the location values', () => {
    const s = newGame();
    expect(s.cash).toBe(1500);
    expect(s.demandMW).toBe(2);
    expect(s.responsibility).toBe(50);
    expect(s.status).toBe('playing');
  });
  it('rejects unknown locations', () => {
    expect(() => newGame('atlantis')).toThrow(/Unknown location/);
  });
});

describe('step', () => {
  it('advances one quarter and records history', () => {
    const s = step(newGame(), content);
    expect(s.tick).toBe(1);
    expect(s.history).toHaveLength(1);
    expect(s.history[0].revenue).toBeGreaterThan(0);
    expect(s.totals.co2T).toBeGreaterThan(0);
  });
  it('is pure: does not mutate its input', () => {
    const s0 = newGame();
    const snapshot = JSON.stringify(s0);
    step(s0, content);
    expect(JSON.stringify(s0)).toBe(snapshot);
  });
  it('is deterministic for a given seed', () => {
    expect(JSON.stringify(advance(newGame('paris-basin', 7), 20))).toBe(JSON.stringify(advance(newGame('paris-basin', 7), 20)));
  });
  it('does not advance while a decision is pending', () => {
    const s = { ...newGame(), queue: [{ kind: 'event' as const, id: 'heatwave' }] };
    expect(step(s, content)).toBe(s);
  });
  it('ends the run after maxTicks', () => {
    const s = advance(newGame(), 100);
    expect(['ended', 'bankrupt']).toContain(s.status);
    expect(s.tick).toBeLessThanOrEqual(content.balance.maxTicks);
  });
});

describe('upgrades', () => {
  it('buying costs cash and applies persistent effects', () => {
    const s0 = newGame();
    const s1 = applyAction(s0, { type: 'buy', upgradeId: 'hot-aisle-containment' }, content);
    expect(s1.cash).toBe(s0.cash - 120);
    expect(derive(s1, content).pue).toBeCloseTo(derive(s0, content).pue - 0.08);
    expect(s1.owned).toContain('hot-aisle-containment');
  });
  it('cannot buy what you cannot afford, or twice', () => {
    const s0 = newGame();
    expect(canBuy(s0, content, 'liquid-cooling')).toBe(false); // 1600 > 1500
    const s1 = applyAction(s0, { type: 'buy', upgradeId: 'staff-training' }, content);
    expect(applyAction(s1, { type: 'buy', upgradeId: 'staff-training' }, content)).toBe(s1);
  });
  it('respects exclusive groups', () => {
    const s = applyAction(newGame(), { type: 'buy', upgradeId: 'evaporative-cooling' }, content);
    expect(shopUpgrades(s, content).map((u) => u.id)).not.toContain('free-cooling');
  });
  it('applies location overrides (context matters)', () => {
    const up = content.upgrades.find((u) => u.id === 'free-cooling')!;
    expect(resolveUpgrade(up, 'paris-basin').effects.pue).toBe(-0.25);
    expect(resolveUpgrade(up, 'sun-belt').effects.pue).toBe(-0.05);
  });
  it('hides location-restricted upgrades', () => {
    expect(shopUpgrades(newGame('sun-belt'), content).map((u) => u.id)).not.toContain('heat-reuse');
  });
});

describe('traps and delayed effects', () => {
  it('greenwashing without measurement comes back as a scandal', () => {
    let s = applyAction(newGame(), { type: 'buy', upgradeId: 'carbon-offsets-greenwash' }, content);
    let sawScandal = false;
    for (let i = 0; i < 12 && !sawScandal; i++) {
      const d = currentDecision(s, content);
      if (d?.kind === 'event' && d.event.id === 'greenwash-scandal') sawScandal = true;
      s = advance(s, 1);
    }
    expect(sawScandal).toBe(true);
  });
  it('measuring first defuses the greenwashing scandal', () => {
    let s = applyAction(newGame(), { type: 'buy', upgradeId: 'energy-monitoring' }, content);
    s = applyAction(s, { type: 'buy', upgradeId: 'carbon-offsets-greenwash' }, content);
    let sawScandal = false;
    for (let i = 0; i < 12; i++) {
      const d = currentDecision(s, content);
      if (d?.kind === 'event' && d.event.id === 'greenwash-scandal') sawScandal = true;
      s = advance(s, 1);
    }
    expect(sawScandal).toBe(false);
  });
});

describe('decisions', () => {
  it('a client card can be answered and is logged', () => {
    const s0 = { ...newGame(), queue: [{ kind: 'client' as const, id: 'crypto-farm' }] };
    const d = currentDecision(s0, content);
    expect(d?.kind).toBe('client');
    const s1 = applyAction(s0, { type: 'choose', choiceId: 'refuse' }, content);
    expect(s1.queue).toHaveLength(0);
    expect(s1.decisions).toContain('client:crypto-farm:refuse');
    expect(s1.responsibility).toBeGreaterThan(s0.responsibility);
  });
  it('choices with unmet requirements are hidden', () => {
    const s = { ...newGame(), queue: [{ kind: 'event' as const, id: 'permit-audit' }] };
    const d = currentDecision(s, content);
    expect(d?.kind === 'event' && d.choices.map((c) => c.id)).not.toContain('show-data');
  });
  it('queues a quiz after an event that has one', () => {
    const s0 = { ...newGame(), queue: [{ kind: 'event' as const, id: 'heatwave' }] };
    const s1 = applyAction(s0, { type: 'choose', choiceId: 'throttle' }, content);
    const d = currentDecision(s1, content);
    expect(d?.kind).toBe('quiz');
    const s2 = applyAction(s1, { type: 'answer', answerIndex: 0 }, content);
    expect(s2.quizAnswers).toEqual([{ id: 'q-pue', correct: true, tick: 0 }]);
  });
  it('lobbying delays the carbon tax instead of cancelling it', () => {
    let s: GameState = { ...newGame(), queue: [{ kind: 'event', id: 'carbon-tax' }] };
    s = applyAction(s, { type: 'choose', choiceId: 'lobby' }, content);
    expect(s.flags).not.toContain('carbon-tax');
    s = advance(s, 9);
    expect(s.flags).toContain('carbon-tax');
  });
});

describe('scoring', () => {
  it('scores stay within 0..100', () => {
    const s = advance(newGame(), 40);
    const sc = computeScores(s, content);
    expect(sc.sustainability).toBeGreaterThanOrEqual(0);
    expect(sc.sustainability).toBeLessThanOrEqual(100);
    expect(sc.responsibility).toBeGreaterThanOrEqual(0);
    expect(sc.responsibility).toBeLessThanOrEqual(100);
  });
  it('responsibility has diminishing returns', () => {
    expect(saturate(50, 8)).toBe(58);
    expect(saturate(90, 8) - 90).toBeCloseTo(1.6);
    expect(saturate(10, -8)).toBeCloseTo(8.4);
  });
  it('legacy rewards balance over extremes', () => {
    expect(legacyScore(1, 0.7 * 100, false)).toBeGreaterThan(legacyScore(1.5, 25, false));
    expect(legacyScore(1, 70, true)).toBeLessThan(legacyScore(1, 70, false));
  });
  it('maps quadrants to archetypes', () => {
    expect(archetypeOf(1.2, 80)).toBe('frugal-tycoon');
    expect(archetypeOf(1.2, 20)).toBe('planet-burner');
    expect(archetypeOf(0.3, 80)).toBe('cloud-monk');
    expect(archetypeOf(0.3, 20)).toBe('lost-in-the-fog');
  });
  it('summarize explains what was gained and given up', () => {
    const sum = summarize(advance(newGame(), 40), content);
    expect(sum.gained.length).toBeGreaterThan(0);
    expect(sum.gaveUp.length).toBeGreaterThan(0);
    expect(Number.isFinite(sum.legacy)).toBe(true);
  });
});

describe('design rules (smoke version of npm run sim)', () => {
  it('balanced beats greedy and virtuous on legacy in Paris', () => {
    const mean = (f: (seed: number) => number) => {
      let total = 0;
      for (let seed = 1; seed <= 20; seed++) total += f(seed);
      return total / 20;
    };
    const legacy = (strategy: typeof greedy) => mean((seed) => summarize(playRun(strategy, seed, 'paris-basin', content), content).legacy);
    const b = legacy(balanced);
    expect(b).toBeGreaterThan(legacy(greedy));
    expect(b).toBeGreaterThan(legacy(virtuous));
  });
});
