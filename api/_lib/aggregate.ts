/**
 * Pure aggregation. Events are never stored raw: each event becomes a few
 * counter writes (toOps), and GET /api/stats turns the counters back into
 * dashboard numbers (buildStats). Both stores (Redis, memory) apply the same ops.
 */
import { FAMILIES, type AnalyticsEvent, type Family } from './events.js';

/** Counter hashes (field -> number) and one set (unique session ids). */
export const KEYS = {
  counts: 'counts', // event type -> count
  locations: 'locations', // locationId -> runs started
  choices: 'choices', // "<kind>:<id>:<choiceId>" -> count
  buildings: 'buildings', // buildingId -> count
  upgrades: 'upgrades', // "<family>:<upgradeId>" -> count
  quiz: 'quiz', // "<questionId>:ok" / "<questionId>:n" -> count
  runs: 'runs', // n, sustainability, responsibility, legacy, impact, profitNorm, quizCorrect, quizAnswered (sums)
  archetypes: 'archetypes', // archetype -> count
  statuses: 'statuses', // ended / bankrupt -> count
  ratings: 'ratings', // "<sessionId>:<seed>" -> value (one rating per run, last one wins)
  sessions: 'sessions', // set of anonymous session ids
} as const;
export const HASH_KEYS = [
  KEYS.counts,
  KEYS.locations,
  KEYS.choices,
  KEYS.buildings,
  KEYS.upgrades,
  KEYS.quiz,
  KEYS.runs,
  KEYS.archetypes,
  KEYS.statuses,
  KEYS.ratings,
] as const;
export type HashKey = (typeof HASH_KEYS)[number];

export type Op =
  | { op: 'incr'; key: HashKey; field: string; by: number }
  | { op: 'set'; key: HashKey; field: string; value: number }
  | { op: 'sadd'; key: typeof KEYS.sessions; member: string };

export interface Snapshot {
  hashes: Partial<Record<HashKey, Record<string, number>>>;
  sessions: number;
}

const incr = (key: HashKey, field: string, by = 1): Op => ({ op: 'incr', key, field, by });

export function toOps(e: AnalyticsEvent): Op[] {
  const ops: Op[] = [{ op: 'sadd', key: KEYS.sessions, member: e.sessionId }, incr(KEYS.counts, e.type)];
  switch (e.type) {
    case 'visit':
      break;
    case 'run_start':
      ops.push(incr(KEYS.locations, e.locationId));
      break;
    case 'decision':
      ops.push(incr(KEYS.counts, `decision:${e.action}`));
      if (e.action === 'choose') ops.push(incr(KEYS.choices, `${e.kind}:${e.id}:${e.choiceId}`));
      if (e.action === 'build') ops.push(incr(KEYS.buildings, e.id));
      if (e.action === 'buy') ops.push(incr(KEYS.upgrades, `${e.family}:${e.id}`));
      break;
    case 'quiz_answer':
      ops.push(incr(KEYS.quiz, `${e.id}:n`));
      if (e.correct) ops.push(incr(KEYS.quiz, `${e.id}:ok`));
      break;
    case 'run_end':
      ops.push(
        incr(KEYS.runs, 'n'),
        incr(KEYS.runs, 'sustainability', e.sustainability),
        incr(KEYS.runs, 'responsibility', e.responsibility),
        incr(KEYS.runs, 'legacy', e.legacy),
        incr(KEYS.runs, 'impact', e.impact),
        incr(KEYS.runs, 'profitNorm', e.profitNorm),
        incr(KEYS.runs, 'quizCorrect', e.quizCorrect),
        incr(KEYS.runs, 'quizAnswered', e.quizAnswered),
        incr(KEYS.archetypes, e.archetype),
        incr(KEYS.statuses, e.status),
      );
      break;
    case 'rating':
      ops.push({ op: 'set', key: KEYS.ratings, field: `${e.sessionId}:${e.seed}`, value: e.value });
      break;
  }
  return ops;
}

export interface Ranked {
  id: string;
  count: number;
}
export interface QuizStat {
  id: string;
  answered: number;
  correct: number;
  /** 0..100 */
  pct: number;
}

export interface Stats {
  generatedAt: string;
  storage: 'redis' | 'memory' | 'demo';
  visitors: number;
  sessions: number;
  runsStarted: number;
  runsEnded: number;
  events: number;
  decisions: Record<'choose' | 'answer' | 'build' | 'buy', number>;
  quiz: { answered: number; correct: number; pct: number | null; perQuestion: QuizStat[]; mostFailed: QuizStat[] };
  ratings: { count: number; mean: number | null; distribution: number[] };
  scores: { sustainability: number; responsibility: number; legacy: number; impact: number; profitNorm: number } | null;
  archetypes: Ranked[];
  statuses: Ranked[];
  locations: Ranked[];
  buildings: Ranked[];
  upgrades: Record<Family, Ranked[]>;
  choices: (Ranked & { kind: string; decisionId: string; choiceId: string })[];
}

const ranked = (h: Record<string, number> = {}): Ranked[] =>
  Object.entries(h)
    .map(([id, count]) => ({ id, count: Number(count) || 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

export function buildStats(snap: Snapshot, storage: Stats['storage'], now: Date = new Date()): Stats {
  const h = (k: HashKey) => snap.hashes[k] ?? {};
  const counts = h(KEYS.counts);
  const c = (f: string) => Number(counts[f]) || 0;

  // Quiz, per question.
  const perQ = new Map<string, QuizStat>();
  for (const [field, v] of Object.entries(h(KEYS.quiz))) {
    const cut = field.lastIndexOf(':');
    const qid = field.slice(0, cut);
    const s = perQ.get(qid) ?? { id: qid, answered: 0, correct: 0, pct: 0 };
    if (field.endsWith(':n')) s.answered += Number(v) || 0;
    else if (field.endsWith(':ok')) s.correct += Number(v) || 0;
    perQ.set(qid, s);
  }
  const perQuestion = [...perQ.values()]
    .filter((q) => q.answered > 0)
    .map((q) => ({ ...q, pct: round((100 * q.correct) / q.answered) }))
    .sort((a, b) => a.pct - b.pct || b.answered - a.answered || a.id.localeCompare(b.id));
  const answered = perQuestion.reduce((a, q) => a + q.answered, 0);
  const correct = perQuestion.reduce((a, q) => a + q.correct, 0);

  // Ratings: one value per (session, run).
  const distribution = Array.from({ length: 10 }, () => 0);
  let rSum = 0;
  let rCount = 0;
  for (const v of Object.values(h(KEYS.ratings))) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 10) continue;
    distribution[n - 1]++;
    rSum += n;
    rCount++;
  }

  // Average end-of-run scores.
  const runs = h(KEYS.runs);
  const n = Number(runs.n) || 0;
  const avg = (f: string) => round((Number(runs[f]) || 0) / n);
  const scores =
    n > 0
      ? { sustainability: avg('sustainability'), responsibility: avg('responsibility'), legacy: Math.round((Number(runs.legacy) || 0) / n), impact: avg('impact'), profitNorm: round((Number(runs.profitNorm) || 0) / n, 2) }
      : null;

  // Upgrades split by family.
  const upgrades = Object.fromEntries(FAMILIES.map((f) => [f, [] as Ranked[]])) as Record<Family, Ranked[]>;
  for (const r of ranked(h(KEYS.upgrades))) {
    const [fam, ...rest] = r.id.split(':');
    if ((FAMILIES as readonly string[]).includes(fam)) upgrades[fam as Family].push({ id: rest.join(':'), count: r.count });
  }

  const choices = ranked(h(KEYS.choices)).map((r) => {
    const [kind, decisionId, choiceId] = r.id.split(':');
    return { ...r, kind, decisionId, choiceId };
  });

  return {
    generatedAt: now.toISOString(),
    storage,
    visitors: snap.sessions,
    sessions: c('visit'),
    runsStarted: c('run_start'),
    runsEnded: c('run_end'),
    events: ['visit', 'run_start', 'decision', 'quiz_answer', 'run_end', 'rating'].reduce((a, t) => a + c(t), 0),
    decisions: { choose: c('decision:choose'), answer: c('decision:answer'), build: c('decision:build'), buy: c('decision:buy') },
    quiz: { answered, correct, pct: answered > 0 ? round((100 * correct) / answered) : null, perQuestion, mostFailed: perQuestion.filter((q) => q.pct < 100).slice(0, 5) },
    ratings: { count: rCount, mean: rCount > 0 ? round(rSum / rCount) : null, distribution },
    scores,
    archetypes: ranked(h(KEYS.archetypes)),
    statuses: ranked(h(KEYS.statuses)),
    locations: ranked(h(KEYS.locations)),
    buildings: ranked(h(KEYS.buildings)),
    upgrades,
    choices: choices.slice(0, 15),
  };
}

/** Apply ops to an in-memory snapshot. Used by the memory store and by tests. */
export function applyOps(state: { hashes: Snapshot['hashes']; sessions: Set<string> }, ops: Op[]): void {
  for (const o of ops) {
    if (o.op === 'sadd') {
      state.sessions.add(o.member);
      continue;
    }
    const hash = (state.hashes[o.key] ??= {});
    if (o.op === 'incr') hash[o.field] = (hash[o.field] ?? 0) + o.by;
    else hash[o.field] = o.value;
  }
}
