/**
 * Scripted players for the headless balance simulation (scripts/sim.ts) and tests.
 * They are deliberately simple caricatures. If "balanced" stops beating "greedy"
 * and "virtuous" on legacy score, the numbers in /content need tuning.
 */
import { resolveUpgrade } from './derive';
import { applyAction, createGame, currentDecision, shopUpgrades, step, type PendingDecision } from './game';
import { nextRandom } from './rng';
import type { Choice, Content, GameState, Stance, Upgrade } from './types';

export interface Strategy {
  id: string;
  description: string;
  /** Upgrade to buy now, or null to stop buying this tick. */
  buy: (state: GameState, content: Content) => string | null;
  choose: (decision: Exclude<PendingDecision, { kind: 'quiz' }>, state: GameState, content: Content) => string;
  /** Probability of answering a quiz question correctly. */
  quizSkill: number;
}

const byStance = (choices: Choice[], order: Stance[]): Choice => {
  for (const stance of order) {
    const found = choices.find((c) => c.stance === stance);
    if (found) return found;
  }
  return choices[0];
};

const affordable = (state: GameState, content: Content, buffer: number) =>
  shopUpgrades(state, content).filter((u) => u.cost <= state.cash - buffer);

const cheapestFirst = (a: Upgrade, b: Upgrade) => a.cost - b.cost;

export const greedy: Strategy = {
  id: 'greedy',
  description: 'Maximise short-term profit: every shortcut, every client, every hype.',
  quizSkill: 0.4,
  buy(state, content) {
    const options = affordable(state, content, 200).filter((u) => {
      const e = resolveUpgrade(u, state.locationId).effects;
      if (u.family === 'trap') return true;
      // Rational greed: take green upgrades only if they make money and never slow growth.
      const savesEnergy = (e.pue ?? 0) < 0 || (e.itEfficiency ?? 0) > 0;
      return (e.growthRate ?? 0) >= 0 && e.growthCap === undefined && (e.cashPerTick ?? 0) >= 0 && savesEnergy && (e.wue ?? 0) <= 0.5;
    });
    return options.sort(cheapestFirst)[0]?.id ?? null;
  },
  choose(decision) {
    return byStance(decision.choices, ['greedy', 'neutral', 'responsible']).id;
  },
};

export const virtuous: Strategy = {
  id: 'virtuous',
  description: 'Always the responsible option, every green upgrade, never a trap.',
  quizSkill: 0.9,
  buy(state, content) {
    const options = affordable(state, content, 100).filter((u) => {
      if (u.family === 'trap') return false;
      const sd = resolveUpgrade(u, state.locationId).scoreDelta;
      return (sd.sustainability ?? 0) + (sd.responsibility ?? 0) > 0;
    });
    return options.sort(cheapestFirst)[0]?.id ?? null;
  },
  choose(decision) {
    return byStance(decision.choices, ['responsible', 'neutral', 'greedy']).id;
  },
};

/** Green where it pays or matters most, refuses the worst clients, rides some growth. */
const BALANCED_PRIORITY = [
  'energy-monitoring',
  'hot-aisle-containment',
  'staff-training',
  'frugal-ai-policy',
  'free-cooling',
  'extend-hardware-life',
  'refurb-circular',
  'renewable-ppa',
  'water-closed-loop',
  'heat-reuse',
  'onsite-solar',
  'model-right-sizing',
];

export const balanced: Strategy = {
  id: 'balanced',
  description: 'Green where it pays or matters, frugal with clients, keeps growing.',
  quizSkill: 0.75,
  buy(state, content) {
    const shop = affordable(state, content, 300);
    for (const id of BALANCED_PRIORITY) {
      const up = shop.find((u) => u.id === id);
      if (!up) continue;
      // Skip water fixes where water is not scarce, and PPAs where the grid is already clean.
      const loc = content.locations.find((l) => l.id === state.locationId);
      if (id === 'water-closed-loop' && (loc?.waterStress ?? 0) < 1) continue;
      if (id === 'renewable-ppa' && (loc?.gridCarbon ?? 0) < 100) continue;
      return up.id;
    }
    return null;
  },
  choose(decision, state) {
    const choices = decision.choices;
    if (decision.kind === 'client') {
      // Host what is useful or partly useful as asked; redirect pure hype; refuse the indefensible.
      const need = decision.client.aiNeed;
      const accept = choices.find((c) => c.id === 'accept');
      const alt = choices.find((c) => c.id === 'alternative');
      if ((need === 'needed' || need === 'partly') && accept) return accept.id;
      if (alt) return alt.id;
      if (accept && accept.stance !== 'greedy') return accept.id;
      return byStance(choices, ['responsible', 'neutral', 'greedy']).id;
    }
    // Events: the pragmatic middle option, unless the responsible one is cheap.
    const responsible = choices.find((c) => c.stance === 'responsible');
    const cost = -(responsible?.effects?.cash ?? 0);
    const capsGrowth = Boolean(responsible?.temporary?.effects.growthCap !== undefined || responsible?.effects?.growthCap !== undefined);
    if (responsible && !capsGrowth && cost <= Math.min(300, state.cash * 0.2)) return responsible.id;
    return byStance(choices, ['neutral', 'responsible', 'greedy']).id;
  },
};

export const idle: Strategy = {
  id: 'idle',
  description: 'Never buys anything, always picks the first option. Baseline.',
  quizSkill: 0.5,
  buy: () => null,
  choose: (decision) => decision.choices[0].id,
};

export function randomStrategy(seed: number): Strategy {
  let rng = seed;
  const rand = () => {
    const r = nextRandom(rng);
    rng = r.state;
    return r.value;
  };
  return {
    id: 'random',
    description: 'Random choices and random purchases. Checks robustness, not skill.',
    quizSkill: 0.5,
    buy(state, content) {
      if (rand() > 0.3) return null;
      const options = affordable(state, content, 0);
      return options.length ? options[Math.floor(rand() * options.length)].id : null;
    },
    choose(decision) {
      return decision.choices[Math.floor(rand() * decision.choices.length)].id;
    },
  };
}

export const STRATEGIES: Strategy[] = [greedy, virtuous, balanced, idle];

/** Play a full run with a scripted strategy. Deterministic for a given seed. */
export function playRun(strategy: Strategy, seed: number, locationId: string, content: Content): GameState {
  let s = createGame({ seed, locationId }, content);
  let quizRng = seed ^ 0x9e3779b9;
  for (let guard = 0; guard < 10_000 && s.status === 'playing'; guard++) {
    const decision = currentDecision(s, content);
    if (decision) {
      if (decision.kind === 'quiz') {
        const r = nextRandom(quizRng);
        quizRng = r.state;
        const correct = r.value < strategy.quizSkill;
        const wrong = (decision.question.correctIndex + 1) % decision.question.answers.length;
        s = applyAction(s, { type: 'answer', answerIndex: correct ? decision.question.correctIndex : wrong }, content);
      } else {
        s = applyAction(s, { type: 'choose', choiceId: strategy.choose(decision, s, content) }, content);
      }
      continue;
    }
    for (let buys = 0; buys < 3; buys++) {
      const id = strategy.buy(s, content);
      if (!id) break;
      const next = applyAction(s, { type: 'buy', upgradeId: id }, content);
      if (next === s) break;
      s = next;
    }
    s = step(s, content);
  }
  return s;
}
