import { describe, expect, it } from 'vitest';
import { applyOps, buildStats, toOps, type Snapshot } from './aggregate';
import { parseEvent, validateEvent, type AnalyticsEvent } from './events';

const S1 = 'aaaaaaaa-1111';
const S2 = 'bbbbbbbb-2222';

function run(events: AnalyticsEvent[]) {
  const state = { hashes: {} as Snapshot['hashes'], sessions: new Set<string>() };
  for (const e of events) applyOps(state, toOps(e));
  return buildStats({ hashes: state.hashes, sessions: state.sessions.size }, 'memory', new Date(0));
}

const end = (sessionId: string, over: Partial<Extract<AnalyticsEvent, { type: 'run_end' }>> = {}): AnalyticsEvent => ({
  type: 'run_end',
  sessionId,
  seed: 1,
  locationId: 'paris-basin',
  status: 'ended',
  legacy: 800,
  sustainability: 60,
  responsibility: 70,
  impact: 65,
  profitNorm: 1,
  archetype: 'frugal-tycoon',
  quizCorrect: 2,
  quizAnswered: 3,
  ...over,
});

describe('validateEvent', () => {
  it('accepts every whitelisted type', () => {
    const ok: unknown[] = [
      { type: 'visit', sessionId: S1 },
      { type: 'run_start', sessionId: S1, seed: 42, locationId: 'paris-basin' },
      { type: 'decision', sessionId: S1, action: 'choose', kind: 'client', id: 'astro-gpt', choiceId: 'accept' },
      { type: 'decision', sessionId: S1, action: 'buy', id: 'hot-aisle-containment', family: 'good' },
      { type: 'decision', sessionId: S1, action: 'build', id: 'coal' },
      { type: 'quiz_answer', sessionId: S1, id: 'q-pue', correct: true },
      end(S1),
      { type: 'rating', sessionId: S1, seed: 1, value: 10 },
    ];
    for (const e of ok) expect(validateEvent(e)).toMatchObject({ ok: true });
  });

  it('rejects unknown types, bad ids, out-of-range values and extra junk', () => {
    expect(validateEvent({ type: 'pageview', sessionId: S1 }).ok).toBe(false);
    expect(validateEvent({ type: 'visit', sessionId: 'x' }).ok).toBe(false);
    expect(validateEvent({ type: 'rating', sessionId: S1, seed: 1, value: 11 }).ok).toBe(false);
    expect(validateEvent({ type: 'rating', sessionId: S1, seed: 1, value: 4.5 }).ok).toBe(false);
    expect(validateEvent({ type: 'quiz_answer', sessionId: S1, id: '<script>', correct: true }).ok).toBe(false);
    expect(validateEvent({ type: 'decision', sessionId: S1, action: 'buy', id: 'x', family: 'evil' }).ok).toBe(false);
    expect(validateEvent({ ...end(S1), sustainability: 101 }).ok).toBe(false);
    expect(validateEvent([]).ok).toBe(false);
  });

  it('drops fields outside the schema', () => {
    const r = validateEvent({ type: 'visit', sessionId: S1, email: 'a@b.c', ip: '1.2.3.4' });
    expect(r).toEqual({ ok: true, event: { type: 'visit', sessionId: S1 } });
  });

  it('limits body size and survives bad JSON', () => {
    expect(parseEvent('{')).toMatchObject({ ok: false });
    expect(parseEvent(JSON.stringify({ type: 'visit', sessionId: S1, pad: 'x'.repeat(3000) }))).toEqual({ ok: false, error: 'body too large' });
  });
});

describe('buildStats', () => {
  it('returns zeros on an empty store', () => {
    const s = run([]);
    expect(s.visitors).toBe(0);
    expect(s.quiz.pct).toBeNull();
    expect(s.ratings.mean).toBeNull();
    expect(s.scores).toBeNull();
    expect(s.upgrades).toEqual({ good: [], trap: [], tradeoff: [] });
  });

  it('counts visitors, sessions and runs', () => {
    const s = run([
      { type: 'visit', sessionId: S1 },
      { type: 'visit', sessionId: S1 },
      { type: 'visit', sessionId: S2 },
      { type: 'run_start', sessionId: S1, seed: 1, locationId: 'paris-basin' },
      { type: 'run_start', sessionId: S2, seed: 2, locationId: 'sun-belt' },
      end(S1),
    ]);
    expect(s.visitors).toBe(2);
    expect(s.sessions).toBe(3);
    expect(s.runsStarted).toBe(2);
    expect(s.runsEnded).toBe(1);
    expect(s.events).toBe(6);
  });

  it('computes quiz % per question and sorts the most failed first', () => {
    const s = run([
      { type: 'quiz_answer', sessionId: S1, id: 'q-pue', correct: true },
      { type: 'quiz_answer', sessionId: S2, id: 'q-pue', correct: true },
      { type: 'quiz_answer', sessionId: S1, id: 'q-water', correct: false },
      { type: 'quiz_answer', sessionId: S2, id: 'q-water', correct: true },
      { type: 'quiz_answer', sessionId: S1, id: 'q-ai', correct: false },
    ]);
    expect(s.quiz).toMatchObject({ answered: 5, correct: 3, pct: 60 });
    expect(s.quiz.perQuestion.map((q) => [q.id, q.pct])).toEqual([
      ['q-ai', 0],
      ['q-water', 50],
      ['q-pue', 100],
    ]);
    expect(s.quiz.mostFailed.map((q) => q.id)).toEqual(['q-ai', 'q-water']);
  });

  it('keeps one rating per run (last one wins) and computes the distribution', () => {
    const s = run([
      { type: 'rating', sessionId: S1, seed: 1, value: 3 },
      { type: 'rating', sessionId: S1, seed: 1, value: 8 },
      { type: 'rating', sessionId: S1, seed: 2, value: 10 },
      { type: 'rating', sessionId: S2, seed: 1, value: 9 },
    ]);
    expect(s.ratings.count).toBe(3);
    expect(s.ratings.mean).toBe(9);
    expect(s.ratings.distribution).toEqual([0, 0, 0, 0, 0, 0, 0, 1, 1, 1]);
  });

  it('averages end-of-run scores and counts archetypes', () => {
    const s = run([end(S1), end(S2, { sustainability: 20, responsibility: 30, legacy: 400, archetype: 'planet-burner', status: 'bankrupt' })]);
    expect(s.scores).toMatchObject({ sustainability: 40, responsibility: 50, legacy: 600 });
    expect(s.archetypes).toEqual([
      { id: 'frugal-tycoon', count: 1 },
      { id: 'planet-burner', count: 1 },
    ]);
    expect(s.statuses.find((x) => x.id === 'bankrupt')?.count).toBe(1);
  });

  it('ranks buildings, upgrades by family and client answers', () => {
    const s = run([
      { type: 'decision', sessionId: S1, action: 'build', id: 'coal' },
      { type: 'decision', sessionId: S1, action: 'build', id: 'wind' },
      { type: 'decision', sessionId: S2, action: 'build', id: 'wind' },
      { type: 'decision', sessionId: S1, action: 'buy', id: 'hot-aisle-containment', family: 'good' },
      { type: 'decision', sessionId: S2, action: 'buy', id: 'cheap-servers', family: 'trap' },
      { type: 'decision', sessionId: S2, action: 'buy', id: 'cheap-servers', family: 'trap' },
      { type: 'decision', sessionId: S1, action: 'choose', kind: 'client', id: 'astro-gpt', choiceId: 'accept' },
    ]);
    expect(s.buildings[0]).toEqual({ id: 'wind', count: 2 });
    expect(s.upgrades.good).toEqual([{ id: 'hot-aisle-containment', count: 1 }]);
    expect(s.upgrades.trap).toEqual([{ id: 'cheap-servers', count: 2 }]);
    expect(s.upgrades.tradeoff).toEqual([]);
    expect(s.choices[0]).toMatchObject({ kind: 'client', decisionId: 'astro-gpt', choiceId: 'accept', count: 1 });
    expect(s.decisions).toEqual({ choose: 1, answer: 0, build: 3, buy: 3 });
  });
});
