/**
 * Scripted players for the headless balance simulation (scripts/sim.ts) and tests.
 * They are deliberately simple caricatures. If "balanced" stops beating "greedy"
 * and "virtuous" on legacy score, the numbers in /content need tuning.
 *
 * Each tick a strategy may take a few actions (build a plant or a hall, install
 * an upgrade, adopt a policy) before time moves on.
 */
import { derive, getBuilding, getLocation } from './derive';
import { applyAction, buildOptions, createGame, currentDecision, policyOptions, step, upgradeOptions, type PendingDecision } from './game';
import { mwPerLoad, powerBudget } from './power';
import { nextRandom } from './rng';
import type { Action, Choice, Content, GameState, Stance } from './types';

export interface Strategy {
  id: string;
  description: string;
  /** Next thing to do this tick, or null to let time pass. */
  plan: (state: GameState, content: Content) => Action | null;
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

const freeLandPlots = (s: GameState, content: Content) => s.plots.map((p, i) => (p === null && i < content.balance.landPlots ? i : -1)).filter((i) => i >= 0);

interface BuildPrefs {
  /** Plants to try, in order, when power runs short. */
  plants: (s: GameState, content: Content) => string[];
  /** Build a new hall when demand exceeds this share of capacity. */
  hallAt: number;
  /** Keep this many land plots for plants (0 = halls may take every plot). */
  reservePlots: number;
  /** Hall, plant and policy upgrades to install (in order), with a cash buffer. */
  hallUpgrades: string[];
  plantUpgrades: string[];
  policies: string[];
  buffer: number;
}

function makePlan(prefs: BuildPrefs) {
  return (s: GameState, content: Content): Action | null => {
    const d = derive(s, content);
    const budget = powerBudget(s, content, d);
    const free = freeLandPlots(s, content);
    const hallNeed = 2 * mwPerLoad(d);
    const wantHall = s.demandMW > s.capacityMW * prefs.hallAt && free.length > prefs.reservePlots;

    // 1. Power first: if halls are short of power, or the next hall would be, build a plant.
    if (budget.spareMW < 0 || (wantHall && budget.spareMW < hallNeed)) {
      for (const id of prefs.plants(s, content)) {
        const river = content.balance.landPlots;
        const plot = getBuilding(content, id).placement === 'river' ? river : free.at(-1);
        if (plot === undefined) continue;
        const opt = buildOptions(s, content, plot).find((o) => o.item.id === id);
        if (opt?.ok && s.cash - opt.item.cost >= prefs.buffer / 2) return { type: 'build', plot, buildingId: id };
      }
    }
    // 2. Then capacity.
    if (wantHall && free.length > 0) {
      const opt = buildOptions(s, content, free[0]).find((o) => o.item.kind === 'datacenter');
      if (opt?.ok) return { type: 'build', plot: free[0], buildingId: opt.item.id };
    }
    // 3. Upgrades and policies.
    for (const id of prefs.policies) {
      const o = policyOptions(s, content).find((x) => x.item.id === id);
      if (o?.ok && s.cash - o.item.cost >= prefs.buffer) return { type: 'buy', upgradeId: id };
    }
    for (let plot = 0; plot < s.plots.length; plot++) {
      const p = s.plots[plot];
      if (!p) continue;
      const list = getBuilding(content, p.building).kind === 'datacenter' ? prefs.hallUpgrades : prefs.plantUpgrades;
      for (const id of list) {
        const o = upgradeOptions(s, content, plot).find((x) => x.item.id === id);
        if (o?.ok && s.cash - o.item.cost >= prefs.buffer) return { type: 'buy', upgradeId: id, plot };
      }
    }
    return null;
  };
}

const bestRenewables = (s: GameState, content: Content) => {
  const r = getLocation(content, s.locationId).resources;
  return r.solar * 12 * 0.16 > r.wind * 9 * 0.33 ? ['solar-farm', 'wind-farm'] : ['wind-farm', 'solar-farm'];
};

export const greedy: Strategy = {
  id: 'greedy',
  description: 'Maximise short-term profit: coal, every client, every shortcut.',
  quizSkill: 0.4,
  plan: makePlan({
    plants: () => ['coal-plant', 'gas-plant'],
    hallAt: 0.9,
    reservePlots: 0,
    hallUpgrades: ['hot-aisle-containment', 'overclock-and-cram', 'evaporative-cooling', 'gpu-hype-cluster'],
    plantUpgrades: ['cheap-lignite', 'imported-pellets', 'gas-heat-recovery'],
    policies: ['carbon-offsets-greenwash'],
    buffer: 300,
  }),
  choose(decision) {
    return byStance(decision.choices, ['greedy', 'neutral', 'responsible']).id;
  },
};

export const virtuous: Strategy = {
  id: 'virtuous',
  description: 'Only wind and sun, every green upgrade, always the responsible option.',
  quizSkill: 0.9,
  plan: makePlan({
    plants: (s, content) => [...bestRenewables(s, content)],
    hallAt: 0.95,
    reservePlots: 1,
    hallUpgrades: ['hot-aisle-containment', 'free-cooling', 'extend-hardware-life', 'water-closed-loop', 'heat-reuse'],
    plantUpgrades: ['battery-storage', 'bigger-rotors', 'solar-trackers', 'fish-ladders'],
    policies: ['staff-training', 'frugal-ai-policy', 'energy-monitoring', 'refurb-circular', 'sufficiency-pledge', 'model-right-sizing'],
    buffer: 100,
  }),
  choose(decision) {
    return byStance(decision.choices, ['responsible', 'neutral', 'greedy']).id;
  },
};

/** Clean where it pays, gas as backup, frugal with clients, keeps growing. */
export const balanced: Strategy = {
  id: 'balanced',
  description: 'River and wind or sun first, gas as backup, green where it pays.',
  quizSkill: 0.75,
  plan: makePlan({
    plants: (s, content) => {
      const loc = getLocation(content, s.locationId);
      const dam = loc.resources.river >= 0.8 ? ['dam'] : [];
      return [...dam, ...bestRenewables(s, content).slice(0, 1), 'gas-plant'];
    },
    hallAt: 0.9,
    reservePlots: 0,
    hallUpgrades: ['hot-aisle-containment', 'free-cooling', 'extend-hardware-life'],
    plantUpgrades: ['methane-leak-checks', 'gas-heat-recovery', 'fish-ladders', 'battery-storage'],
    policies: ['energy-monitoring', 'staff-training', 'frugal-ai-policy'],
    buffer: 400,
  }),
  choose(decision, state) {
    const choices = decision.choices;
    if (decision.kind === 'client') {
      const need = decision.client.aiNeed;
      const accept = choices.find((c) => c.id === 'accept');
      const alt = choices.find((c) => c.id === 'alternative');
      if ((need === 'needed' || need === 'partly') && accept) return accept.id;
      if (alt) return alt.id;
      if (accept && accept.stance !== 'greedy') return accept.id;
      return byStance(choices, ['responsible', 'neutral', 'greedy']).id;
    }
    const responsible = choices.find((c) => c.stance === 'responsible');
    const cost = -(responsible?.effects?.cash ?? 0);
    const capsGrowth = Boolean(responsible?.temporary?.effects.growthCap !== undefined || responsible?.effects?.growthCap !== undefined);
    if (responsible && !capsGrowth && cost <= Math.min(300, state.cash * 0.2)) return responsible.id;
    return byStance(choices, ['neutral', 'responsible', 'greedy']).id;
  },
};

export const idle: Strategy = {
  id: 'idle',
  description: 'Never builds or buys anything, always picks the first option. Baseline.',
  quizSkill: 0.5,
  plan: () => null,
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
    description: 'Random choices, random builds and purchases. Checks robustness, not skill.',
    quizSkill: 0.5,
    plan(s, content) {
      if (rand() > 0.35) return null;
      const plot = Math.floor(rand() * s.plots.length);
      if (!s.plots[plot]) {
        const opts = buildOptions(s, content, plot).filter((o) => o.ok);
        return opts.length ? { type: 'build', plot, buildingId: opts[Math.floor(rand() * opts.length)].item.id } : null;
      }
      const opts = upgradeOptions(s, content, plot).filter((o) => o.ok);
      return opts.length ? { type: 'buy', upgradeId: opts[Math.floor(rand() * opts.length)].item.id, plot } : null;
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
    for (let actions = 0; actions < 4; actions++) {
      const action = strategy.plan(s, content);
      if (!action) break;
      const next = applyAction(s, action, content);
      if (next === s) break;
      s = next;
    }
    s = step(s, content);
  }
  return s;
}
