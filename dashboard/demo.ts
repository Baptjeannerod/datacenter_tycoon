/**
 * Fallback numbers shown when /api/stats cannot be reached. The page labels them
 * "demo data" in large type: they are made up and must never be quoted as results.
 */
import type { Stats } from '../api/_lib/aggregate';

export const DEMO_STATS: Stats = {
  generatedAt: new Date(0).toISOString(),
  storage: 'demo',
  visitors: 64,
  sessions: 81,
  runsStarted: 97,
  runsEnded: 72,
  events: 2140,
  decisions: { choose: 610, answer: 288, build: 402, buy: 515 },
  quiz: {
    answered: 288,
    correct: 181,
    pct: 62.8,
    perQuestion: [
      { id: 'q-pue', answered: 30, correct: 12, pct: 40 },
      { id: 'q-rebound', answered: 26, correct: 13, pct: 50 },
      { id: 'q-greenwashing', answered: 28, correct: 17, pct: 60.7 },
    ],
    mostFailed: [
      { id: 'q-pue', answered: 30, correct: 12, pct: 40 },
      { id: 'q-rebound', answered: 26, correct: 13, pct: 50 },
      { id: 'q-greenwashing', answered: 28, correct: 17, pct: 60.7 },
    ],
  },
  ratings: { count: 58, mean: 7.6, distribution: [0, 1, 1, 2, 4, 6, 11, 15, 10, 8] },
  scores: { sustainability: 58.3, responsibility: 61.9, legacy: 712, impact: 60.1, profitNorm: 0.92 },
  archetypes: [
    { id: 'frugal-tycoon', count: 27 },
    { id: 'planet-burner', count: 21 },
    { id: 'cloud-monk', count: 14 },
    { id: 'lost-in-the-fog', count: 10 },
  ],
  statuses: [
    { id: 'ended', count: 63 },
    { id: 'bankrupt', count: 9 },
  ],
  locations: [
    { id: 'paris-basin', count: 51 },
    { id: 'sun-belt', count: 46 },
  ],
  buildings: [
    { id: 'datacenter-hall', count: 160 },
    { id: 'solar-farm', count: 98 },
    { id: 'wind-farm', count: 71 },
    { id: 'coal-plant', count: 44 },
    { id: 'gas-plant', count: 29 },
  ],
  upgrades: {
    good: [
      { id: 'hot-aisle-containment', count: 61 },
      { id: 'free-cooling', count: 40 },
    ],
    trap: [{ id: 'fast-refresh', count: 33 }],
    tradeoff: [{ id: 'extend-hardware-life', count: 18 }],
  },
  choices: [
    { id: 'client:astro-gpt:accept', kind: 'client', decisionId: 'astro-gpt', choiceId: 'accept', count: 38 },
    { id: 'client:astro-gpt:alternative', kind: 'client', decisionId: 'astro-gpt', choiceId: 'alternative', count: 21 },
  ],
};
