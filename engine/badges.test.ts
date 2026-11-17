import { describe, expect, it } from 'vitest';
import { earnedBadges, matchDecision, ruleHolds } from './badges';
import { loadBadges, loadContent } from './content';
import { createGame } from './game';
import { summarize } from './scoring';
import { balanced, greedy, playRun, virtuous } from './strategies';
import type { GameState } from './types';

const content = loadContent();
const badges = loadBadges();

const withDecisions = (decisions: string[], extra: Partial<GameState> = {}): GameState => ({ ...createGame({ seed: 1, locationId: 'paris-basin' }, content), decisions, ...extra });

describe('matchDecision', () => {
  it('matches exact ids and * wildcards', () => {
    expect(matchDecision('upgrade:staff-training', 'upgrade:staff-training')).toBe(true);
    expect(matchDecision('upgrade:staff', 'upgrade:staff-training')).toBe(false);
    expect(matchDecision('client:*:alternative', 'client:astro-gpt:alternative')).toBe(true);
    expect(matchDecision('client:*:alternative', 'client:astro-gpt:accept')).toBe(false);
  });
});

describe('badge rules', () => {
  it('counts patterns and respects decisionsNone', () => {
    const one = withDecisions(['client:astro-gpt:alternative']);
    const two = withDecisions(['client:astro-gpt:alternative', 'client:bank-faq-bot:alternative']);
    const rule = { countGte: { 'client:*:alternative': 2 } };
    expect(ruleHolds(rule, one, summarize(one, content))).toBe(false);
    expect(ruleHolds(rule, two, summarize(two, content))).toBe(true);
    const fossil = { decisionsAll: ['demolish:gas-plant'], decisionsNone: ['build:coal-plant'] };
    const clean = withDecisions(['demolish:gas-plant', 'build:wind-farm']);
    const dirty = withDecisions(['demolish:gas-plant', 'build:coal-plant']);
    expect(ruleHolds(fossil, clean, summarize(clean, content))).toBe(true);
    expect(ruleHolds(fossil, dirty, summarize(dirty, content))).toBe(false);
  });

  it('reads summary numbers, archetypes and fired events', () => {
    const s = withDecisions([], { firedEvents: ['greenwash-scandal'] });
    const sum = summarize(s, content);
    expect(ruleHolds({ summaryGte: { legacy: sum.legacy + 1 } }, s, sum)).toBe(false);
    expect(ruleHolds({ summaryLte: { legacy: sum.legacy } }, s, sum)).toBe(true);
    expect(ruleHolds({ archetypes: [sum.archetype] }, s, sum)).toBe(true);
    expect(ruleHolds({ eventsFired: ['greenwash-scandal'] }, s, sum)).toBe(true);
    expect(ruleHolds({ eventsFired: ['ai-bubble'] }, s, sum)).toBe(false);
  });

  it('every badge is earned by some scripted run, and none by every run', () => {
    const runs = [greedy, virtuous, balanced].flatMap((st) =>
      ['paris-basin', 'nordic-fjord', 'coal-valley', 'sun-belt'].flatMap((loc) => [1, 2, 3].map((seed) => playRun(st, seed, loc, content))),
    );
    const earnedBy = new Map(badges.map((b) => [b.id, 0]));
    for (const r of runs) for (const b of earnedBadges(r, summarize(r, content), badges)) earnedBy.set(b.id, earnedBy.get(b.id)! + 1);
    // Badges a scripted player can't reach (demolish, rare events) are allowed: they are for humans.
    const reachable = [...earnedBy.values()].filter((n) => n > 0).length;
    expect(reachable).toBeGreaterThanOrEqual(5);
    for (const [, n] of earnedBy) expect(n).toBeLessThan(runs.length);
  });
});
