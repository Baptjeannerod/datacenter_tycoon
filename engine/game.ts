/**
 * The game loop. Pure functions: (state, content, input) -> new state.
 * No DOM, no Math.random, no Date. The UI and the balance sim both drive this.
 *
 *   const s0 = createGame({ seed: 42, locationId: 'paris-basin' }, content);
 *   let s = step(s0, content);                         // advance one quarter
 *   s = applyAction(s, { type: 'buy', upgradeId: 'free-cooling' }, content);
 *   const d = currentDecision(s, content);             // pending card, if any
 *   s = applyAction(s, { type: 'choose', choiceId: d.choices[0].id }, content);
 */
import { checkCondition } from './conditions';
import { clamp, derive, getLocation, getUpgrade, persistentPart, resolveUpgrade } from './derive';
import { nextRandom } from './rng';
import { computeScores } from './scoring';
import type {
  Action,
  Choice,
  Client,
  Content,
  DelayedEffect,
  Effects,
  GameEvent,
  GameState,
  LogKind,
  QuizQuestion,
  ScoreDelta,
  StatKey,
  TemporaryEffect,
  Upgrade,
} from './types';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export interface NewGameOptions {
  seed: number;
  locationId: string;
}

export function createGame(opts: NewGameOptions, content: Content): GameState {
  const loc = getLocation(content, opts.locationId);
  const b = content.balance;
  return {
    version: 1,
    seed: opts.seed >>> 0,
    rng: opts.seed >>> 0,
    tick: 0,
    status: 'playing',
    locationId: loc.id,
    cash: loc.startCash,
    demandMW: loc.startDemandMW,
    capacityMW: loc.startDemandMW,
    hardwareAge: 0,
    envDebt: 0,
    responsibility: 50,
    sustainabilityBonus: 0,
    owned: [],
    modifiers: [],
    scheduled: [],
    flags: [],
    firedEvents: [],
    seenClients: [],
    queue: [],
    quizAnswers: [],
    decisions: [],
    baselineEnergyMWh: loc.startDemandMW * b.hoursPerTick * loc.basePue,
    totals: { revenue: 0, energyMWh: 0, co2T: 0, waterM3: 0, eWasteT: 0, outages: 0, carbonTax: 0 },
    history: [],
    log: [{ tick: 0, kind: 'info', text: `You open a ${loc.startDemandMW} MW datacenter in ${loc.name}.` }],
  };
}

// ---------------------------------------------------------------------------
// Queries (used by the UI)
// ---------------------------------------------------------------------------

export function readStat(state: GameState, content: Content, key: StatKey): number {
  switch (key) {
    case 'envDebt':
      return state.envDebt;
    case 'cash':
      return state.cash;
    case 'demandMW':
      return state.demandMW;
    case 'hardwareAge':
      return state.hardwareAge;
    case 'responsibility':
      return state.responsibility;
    case 'sustainability':
      return computeScores(state, content).sustainability;
    default:
      return derive(state, content)[key];
  }
}

const reader = (state: GameState, content: Content) => (key: StatKey) => readStat(state, content, key);

/** Upgrades the player can see in the shop right now (affordable or not). */
export function shopUpgrades(state: GameState, content: Content): Upgrade[] {
  const takenGroups = new Set(
    state.owned.map((id) => getUpgrade(content, id).exclusiveGroup).filter((g): g is string => Boolean(g)),
  );
  return content.upgrades.filter(
    (u) =>
      !state.owned.includes(u.id) &&
      !(u.exclusiveGroup && takenGroups.has(u.exclusiveGroup)) &&
      checkCondition(u.requires, state, reader(state, content)),
  );
}

export function canBuy(state: GameState, content: Content, upgradeId: string): boolean {
  if (state.status !== 'playing' || state.queue.length > 0) return false;
  const up = shopUpgrades(state, content).find((u) => u.id === upgradeId);
  return Boolean(up && state.cash >= up.cost);
}

export type PendingDecision =
  | { kind: 'event'; event: GameEvent; choices: Choice[] }
  | { kind: 'client'; client: Client; choices: Choice[] }
  | { kind: 'quiz'; question: QuizQuestion };

/** The card the player must answer before time moves on, or null. */
export function currentDecision(state: GameState, content: Content): PendingDecision | null {
  const head = state.queue[0];
  if (!head) return null;
  const visible = (choices: Choice[]) => choices.filter((c) => checkCondition(c.requires, state, reader(state, content)));
  if (head.kind === 'event') {
    const event = content.events.find((e) => e.id === head.id);
    if (!event) throw new Error(`Unknown event "${head.id}"`);
    return { kind: 'event', event, choices: visible(event.choices) };
  }
  if (head.kind === 'client') {
    const client = content.clients.find((c) => c.id === head.id);
    if (!client) throw new Error(`Unknown client "${head.id}"`);
    return { kind: 'client', client, choices: visible(client.choices) };
  }
  const question = content.quiz.find((q) => q.id === head.id);
  if (!question) throw new Error(`Unknown quiz question "${head.id}"`);
  return { kind: 'quiz', question };
}

// ---------------------------------------------------------------------------
// Internal helpers (mutate the cloned draft)
// ---------------------------------------------------------------------------

function log(s: GameState, kind: LogKind, text: string) {
  s.log.push({ tick: s.tick, kind, text });
  if (s.log.length > 200) s.log.splice(0, s.log.length - 200);
}

function roll(s: GameState): number {
  const r = nextRandom(s.rng);
  s.rng = r.state;
  return r.value;
}

function applyEffects(s: GameState, effects: Effects | undefined, source: string, temporary?: TemporaryEffect) {
  if (effects) {
    if (effects.cash) s.cash += effects.cash;
    if (effects.demandPct) s.demandMW = Math.max(0.1, s.demandMW * (1 + effects.demandPct));
    if (effects.envDebt) s.envDebt = Math.max(0, s.envDebt + effects.envDebt);
    const persistent = persistentPart(effects);
    if (Object.keys(persistent).length > 0) s.modifiers.push({ source, effects: persistent });
  }
  if (temporary) {
    if (temporary.effects.cash) s.cash += temporary.effects.cash;
    if (temporary.effects.demandPct) s.demandMW = Math.max(0.1, s.demandMW * (1 + temporary.effects.demandPct));
    if (temporary.effects.envDebt) s.envDebt = Math.max(0, s.envDebt + temporary.effects.envDebt);
    s.modifiers.push({
      source: `${source}:temporary`,
      effects: persistentPart(temporary.effects),
      expiresAt: s.tick + temporary.durationTicks,
    });
  }
}

/**
 * Diminishing returns: gains shrink as you approach 100, losses shrink as you approach 0.
 * At 50 a +8 is +8; at 80 it is +3.2; at 95 it is +0.8.
 */
export function saturate(current: number, delta: number): number {
  const factor = delta > 0 ? (100 - current) / 50 : current / 50;
  return clamp(current + delta * Math.min(1, factor), 0, 100);
}

function applyScore(s: GameState, delta: ScoreDelta | undefined, content: Content) {
  if (!delta) return;
  if (delta.responsibility) s.responsibility = saturate(s.responsibility, delta.responsibility);
  const cap = content.balance.sustainabilityBonusCap;
  if (delta.sustainability) s.sustainabilityBonus = clamp(s.sustainabilityBonus + delta.sustainability, -cap, cap);
}

function schedule(s: GameState, delayed: DelayedEffect[] | undefined, source: string) {
  for (const d of delayed ?? []) s.scheduled.push({ ...d, dueTick: s.tick + d.afterTicks, source });
}

function enqueueEvent(s: GameState, content: Content, eventId: string, front = false): boolean {
  const ev = content.events.find((e) => e.id === eventId);
  if (!ev) throw new Error(`Unknown event "${eventId}"`);
  if (!ev.repeatable && s.firedEvents.includes(ev.id)) return false;
  if (s.queue.some((q) => q.kind === 'event' && q.id === ev.id)) return false;
  if (front) s.queue.unshift({ kind: 'event', id: ev.id });
  else s.queue.push({ kind: 'event', id: ev.id });
  return true;
}

function pickWeighted<T extends { weight?: number }>(s: GameState, items: T[]): T | undefined {
  const total = items.reduce((acc, i) => acc + (i.weight ?? 1), 0);
  if (total <= 0) return undefined;
  let r = roll(s) * total;
  for (const item of items) {
    r -= item.weight ?? 1;
    if (r <= 0) return item;
  }
  return items.at(-1);
}

function runScheduled(s: GameState, content: Content) {
  const due = s.scheduled.filter((d) => d.dueTick <= s.tick);
  s.scheduled = s.scheduled.filter((d) => d.dueTick > s.tick);
  for (const d of due) {
    if (d.chance !== undefined && roll(s) >= d.chance) continue;
    if (!checkCondition(d.if, s, reader(s, content))) continue;
    applyEffects(s, d.effects, `${d.source}:delayed`);
    applyScore(s, d.scoreDelta, content);
    for (const f of d.setFlags ?? []) if (!s.flags.includes(f)) s.flags.push(f);
    if (d.message) log(s, 'debt', d.message);
    if (d.triggerEvent) enqueueEvent(s, content, d.triggerEvent);
  }
}

function scheduleDecisions(s: GameState, content: Content) {
  const read = reader(s, content);
  const eligible = (e: GameEvent) =>
    (e.repeatable || !s.firedEvents.includes(e.id)) &&
    !s.queue.some((q) => q.id === e.id) &&
    checkCondition(e.when, s, read);

  // 1. Bills come due: consequence and milestone events fire as soon as their condition holds.
  const due = content.events.find((e) => e.kind !== 'random' && e.when !== undefined && eligible(e));
  if (due) {
    enqueueEvent(s, content, due.id);
    return;
  }
  if (s.queue.length > 0) return;

  // 2. A client knocks every `clientEvery` ticks.
  if (s.tick % content.balance.clientEvery === 0) {
    const clients = content.clients.filter((c) => !s.seenClients.includes(c.id) && checkCondition(c.when, s, read));
    const client = pickWeighted(s, clients);
    if (client) {
      s.queue.push({ kind: 'client', id: client.id });
      return;
    }
  }

  // 3. Otherwise, maybe a random event.
  if (roll(s) < content.balance.randomEventChance) {
    const ev = pickWeighted(s, content.events.filter((e) => e.kind === 'random' && eligible(e)));
    if (ev) enqueueEvent(s, content, ev.id);
  }
}

function maybeQueueQuiz(s: GameState, content: Content, quizId: string | undefined) {
  if (!quizId) return;
  const asked = s.quizAnswers.length + s.queue.filter((q) => q.kind === 'quiz').length;
  if (asked >= content.balance.maxQuizPerRun) return;
  if (s.quizAnswers.some((q) => q.id === quizId)) return;
  if (!content.quiz.some((q) => q.id === quizId)) throw new Error(`Unknown quiz question "${quizId}"`);
  s.queue.unshift({ kind: 'quiz', id: quizId });
}

function applyChoice(s: GameState, content: Content, choice: Choice, source: string) {
  applyEffects(s, choice.effects, source, choice.temporary);
  applyScore(s, choice.scoreDelta, content);
  schedule(s, choice.delayed, source);
  for (const f of choice.setFlags ?? []) if (!s.flags.includes(f)) s.flags.push(f);
  if (choice.clearFlags) s.flags = s.flags.filter((f) => !choice.clearFlags?.includes(f));
  for (const id of choice.removeUpgrades ?? []) {
    s.owned = s.owned.filter((o) => o !== id);
    s.modifiers = s.modifiers.filter((m) => m.source !== `upgrade:${id}`);
  }
  const stanceKind: LogKind = choice.stance === 'responsible' ? 'good' : choice.stance === 'greedy' ? 'bad' : 'info';
  log(s, stanceKind, choice.outcome);
}

// ---------------------------------------------------------------------------
// Public transitions
// ---------------------------------------------------------------------------

/** Advance one quarter. No-op if the run is over or a decision is pending. */
export function step(state: GameState, content: Content): GameState {
  if (state.status !== 'playing' || state.queue.length > 0) return state;
  const s = structuredClone(state);
  const b = content.balance;
  const loc = getLocation(content, s.locationId);
  const d = derive(s, content);

  // Growth: demand compounds but slows as it nears the market size (logistic);
  // capacity follows it up (and has to be paid for).
  const growth = d.growthRate > 0 ? d.growthRate * Math.max(0, 1 - s.demandMW / loc.marketMW) : d.growthRate;
  s.demandMW = Math.max(0.1, s.demandMW * (1 + growth));
  // Debt-driven churn: clients leave providers with a bad footprint.
  const churn = clamp((s.envDebt - b.debtChurnStart) * b.debtChurnPerPoint, 0, b.maxDebtChurn);
  if (churn > 0) s.demandMW = Math.max(0.1, s.demandMW * (1 - churn));
  let capex = 0;
  if (s.demandMW > s.capacityMW) {
    capex = (s.demandMW - s.capacityMW) * b.capexPerMW;
    s.capacityMW = s.demandMW;
  }

  // Hardware ages; at end of life the whole fleet is refreshed (cost + e-waste + embodied carbon).
  s.hardwareAge += 1;
  let refreshCost = 0;
  let eWasteT = 0;
  let embodiedCo2 = 0;
  if (s.hardwareAge >= d.hardwareLifespan) {
    refreshCost = s.capacityMW * b.refreshCostPerMW;
    eWasteT = s.capacityMW * b.eWastePerMW * d.eWasteMultiplier;
    embodiedCo2 = s.capacityMW * b.embodiedCarbonPerMW;
    s.hardwareAge = 0;
    log(s, 'info', `Server fleet refreshed: ${Math.round(eWasteT)} t of e-waste, ${Math.round(refreshCost)}k€.`);
  }

  // Outages.
  const outage = roll(s) < d.failureRate;
  if (outage) {
    s.demandMW = Math.max(0.1, s.demandMW * (1 - b.outageChurn));
    s.totals.outages += 1;
    log(s, 'outage', 'Outage! Clients lost service and some of them left.');
  }

  // Money and physics.
  const loadMW = Math.min(s.demandMW, s.capacityMW);
  const revenue = loadMW * loc.pricePerMW * d.priceMultiplier * (outage ? 1 - b.outageRevenueLoss : 1);
  const itEnergyMWh = loadMW * b.hoursPerTick * (1 - d.itEfficiency);
  const energyMWh = itEnergyMWh * d.pue;
  const energyCost = (energyMWh * loc.energyPrice * d.energyPriceMultiplier) / 1000;
  const co2T = (energyMWh * d.effectiveCarbon) / 1000 + embodiedCo2;
  const waterM3 = itEnergyMWh * d.wue;
  const opex = b.fixedOpexPerTick + s.capacityMW * b.maintenancePerMW;
  const carbonTax = (co2T * d.carbonPrice) / 1000;
  const net = revenue - energyCost - opex - carbonTax + d.cashPerTick - capex - refreshCost;
  s.cash += net;

  // Environmental debt: the hidden bill.
  const debtBefore = s.envDebt;
  s.envDebt = Math.max(
    0,
    s.envDebt +
      co2T / b.carbonDebtDivisor +
      (waterM3 * loc.waterStress) / b.waterDebtDivisor +
      eWasteT * b.eWasteDebtPerT +
      d.envDebtPerTick -
      b.envDebtDecay,
  );
  for (const threshold of [25, 50, 75]) {
    if (debtBefore < threshold && s.envDebt >= threshold) {
      log(s, 'debt', 'Your environmental debt is growing. Someone will send the bill.');
    }
  }

  s.totals.revenue += revenue;
  s.totals.energyMWh += energyMWh;
  s.totals.co2T += co2T;
  s.totals.waterM3 += waterM3;
  s.totals.eWasteT += eWasteT;
  s.totals.carbonTax += carbonTax;

  // Trust fades unless maintained: responsibility drifts back toward 50.
  s.responsibility += (50 - s.responsibility) * b.responsibilityDrift;

  s.tick += 1;
  runScheduled(s, content);

  const reportTick = s.tick;
  // Scores are computed after the tick, against this tick's energy.
  const provisional = {
    tick: reportTick,
    demandMW: s.demandMW,
    loadMW,
    revenue,
    energyCost,
    opex,
    carbonTax,
    capex: capex + refreshCost,
    net,
    cash: s.cash,
    energyMWh,
    co2T,
    waterM3,
    eWasteT,
    outage,
    sustainability: 0,
    responsibility: 0,
    envDebt: s.envDebt,
  };
  s.history.push(provisional);
  const scores = computeScores(s, content);
  provisional.sustainability = scores.sustainability;
  provisional.responsibility = scores.responsibility;

  if (s.cash < b.bankruptcyAt) {
    s.status = 'bankrupt';
    s.queue = [];
    log(s, 'bad', 'Bankrupt. The creditors take the keys.');
    return s;
  }
  if (s.tick >= b.maxTicks) {
    s.status = 'ended';
    s.queue = [];
    log(s, 'info', 'Ten years have passed. Time to look back.');
    return s;
  }

  scheduleDecisions(s, content);
  return s;
}

export function applyAction(state: GameState, action: Action, content: Content): GameState {
  if (state.status !== 'playing') return state;
  const s = structuredClone(state);

  if (action.type === 'buy') {
    if (!canBuy(s, content, action.upgradeId)) return state;
    const up = getUpgrade(content, action.upgradeId);
    const resolved = resolveUpgrade(up, s.locationId);
    s.cash -= up.cost;
    s.owned.push(up.id);
    s.decisions.push(`upgrade:${up.id}`);
    applyEffects(s, resolved.effects, `upgrade:${up.id}`);
    applyScore(s, resolved.scoreDelta, content);
    schedule(s, up.delayed, `upgrade:${up.id}`);
    for (const f of up.setFlags ?? []) if (!s.flags.includes(f)) s.flags.push(f);
    log(s, up.family === 'good' ? 'good' : up.family === 'trap' ? 'bad' : 'info', `Bought ${up.name}. ${up.whyItMatters}`);
    return s;
  }

  const pending = currentDecision(s, content);
  if (!pending) return state;

  if (action.type === 'answer') {
    if (pending.kind !== 'quiz') return state;
    const correct = action.answerIndex === pending.question.correctIndex;
    s.quizAnswers.push({ id: pending.question.id, correct, tick: s.tick });
    if (correct) applyScore(s, { responsibility: 2 }, content);
    s.queue.shift();
    return s;
  }

  // action.type === 'choose'
  if (pending.kind === 'quiz') return state;
  const choice = pending.choices.find((c) => c.id === action.choiceId);
  if (!choice) return state;
  s.queue.shift();
  if (pending.kind === 'event') {
    if (!s.firedEvents.includes(pending.event.id)) s.firedEvents.push(pending.event.id);
    s.decisions.push(`event:${pending.event.id}:${choice.id}`);
    applyChoice(s, content, choice, `event:${pending.event.id}:${choice.id}`);
    maybeQueueQuiz(s, content, pending.event.quizId);
  } else {
    s.seenClients.push(pending.client.id);
    s.decisions.push(`client:${pending.client.id}:${choice.id}`);
    applyChoice(s, content, choice, `client:${pending.client.id}:${choice.id}`);
    maybeQueueQuiz(s, content, pending.client.quizId);
  }
  return s;
}
