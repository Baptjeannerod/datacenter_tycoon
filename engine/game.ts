/**
 * The game loop. Pure functions: (state, content, input) -> new state.
 * No DOM, no Math.random, no Date. The UI and the balance sim both drive this.
 *
 *   const s0 = createGame({ seed: 42, locationId: 'paris-basin' }, content);
 *   let s = step(s0, content);                                            // one quarter
 *   s = applyAction(s, { type: 'build', plot: 2, buildingId: 'wind-farm' }, content);
 *   s = applyAction(s, { type: 'buy', upgradeId: 'free-cooling', plot: 0 }, content);   // on the hall on plot 0
 *   s = applyAction(s, { type: 'buy', upgradeId: 'staff-training' }, content);          // a policy
 *   s = applyAction(s, { type: 'demolish', plot: 2 }, content);                         // tear the wind farm down again
 *   const d = currentDecision(s, content);                                // pending card, if any
 *
 * Power: there is no grid. Halls only run on power from plants you built (engine/power.ts).
 */
import { checkCondition } from './conditions';
import { clamp, derive, getBuilding, getLocation, getUpgrade, persistentPart, resolveUpgrade } from './derive';
import { dispatch, mwPerLoad, plantInfos, powerBudget, upgradeDrawMW } from './power';
import { nextRandom } from './rng';
import { computeScores } from './scoring';
import type {
  Action,
  Building,
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

export const plotCount = (content: Content) => content.balance.landPlots + 1;
export const riverPlot = (content: Content) => content.balance.landPlots;
export const plotPlacement = (content: Content, plot: number): 'land' | 'river' => (plot === riverPlot(content) ? 'river' : 'land');

const hallMW = (content: Content, state: GameState) =>
  state.plots.reduce((a, p) => {
    if (!p) return a;
    const b = getBuilding(content, p.building);
    return a + (b.kind === 'datacenter' ? (b.itMW ?? 0) : 0);
  }, 0);

export function createGame(opts: NewGameOptions, content: Content): GameState {
  const loc = getLocation(content, opts.locationId);
  const b = content.balance;
  const s: GameState = {
    version: 1,
    seed: opts.seed >>> 0,
    rng: opts.seed >>> 0,
    tick: 0,
    status: 'playing',
    locationId: loc.id,
    cash: loc.startCash,
    demandMW: loc.startDemandMW,
    capacityMW: 0,
    hardwareAge: 0,
    envDebt: 0,
    responsibility: 50,
    sustainabilityBonus: 0,
    plots: Array.from({ length: plotCount(content) }, () => null),
    policies: [],
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
    totals: { revenue: 0, energyMWh: 0, co2T: 0, waterM3: 0, eWasteT: 0, outages: 0, carbonTax: 0, sustainabilityTax: 0 },
    history: [],
    log: [],
  };
  for (const sb of b.startBuildings) {
    const building = getBuilding(content, sb.building);
    s.plots[sb.plot] = { building: building.id, upgrades: [], builtTick: 0 };
    const persistent = persistentPart(building.effects ?? {});
    if (Object.keys(persistent).length) s.modifiers.push({ source: `plot:${sb.plot}:building`, effects: persistent });
  }
  s.capacityMW = hallMW(content, s);
  s.log.push({ tick: 0, kind: 'info', text: `You open a small campus in ${loc.name}: one datacenter hall and the plant that powers it. No grid here: every MW comes from what you build.` });
  return s;
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

export interface Option<T> {
  item: T;
  ok: boolean;
  /** Why it can't be done right now (money, power, a pending card…). */
  reason?: string;
  /** Already installed here. */
  installed?: boolean;
  /** Spare power it needs, MW. */
  needMW?: number;
}

const fmtK = (k: number) => (k >= 1000 ? `€${(k / 1000).toFixed(1)}M` : `€${Math.round(k)}k`);

function blocked(state: GameState): string | undefined {
  if (state.status !== 'playing') return 'The run is over';
  if (state.queue.length > 0) return 'Answer the open card first';
  return undefined;
}

/** What can be built on an empty plot. */
export function buildOptions(state: GameState, content: Content, plot: number): Option<Building>[] {
  if (state.plots[plot]) return [];
  const placement = plotPlacement(content, plot);
  const d = derive(state, content);
  const spare = powerBudget(state, content, d).spareMW;
  return content.buildings
    .filter((b) => b.placement === placement && checkCondition(b.requires, state, reader(state, content)))
    .map((b) => {
      const needMW = b.kind === 'datacenter' ? (b.itMW ?? 0) * mwPerLoad(d) : 0;
      const reason = blocked(state) ?? (state.cash < b.cost ? `Needs ${fmtK(b.cost)}` : needMW > 0 && needMW > spare + 1e-9 ? `Needs ${needMW.toFixed(1)} MW spare power` : undefined);
      return { item: b, ok: !reason, reason, needMW };
    });
}

/** Upgrades for the building on a plot (hall or plant). */
export function upgradeOptions(state: GameState, content: Content, plot: number): Option<Upgrade>[] {
  const p = state.plots[plot];
  if (!p) return [];
  const b = getBuilding(content, p.building);
  const spare = powerBudget(state, content).spareMW;
  const groups = new Set(p.upgrades.map((id) => getUpgrade(content, id).exclusiveGroup).filter(Boolean));
  return content.upgrades
    .filter((u) => (b.kind === 'datacenter' ? u.scope === 'hall' : u.scope === 'plant' && b.plantType !== undefined && Boolean(u.plantTypes?.includes(b.plantType))))
    .filter((u) => checkCondition(u.requires, state, reader(state, content)))
    .map((u) => {
      const installed = p.upgrades.includes(u.id);
      const needMW = u.powerMW ?? 0;
      const reason = installed
        ? 'Installed'
        : (blocked(state) ??
          (u.exclusiveGroup && groups.has(u.exclusiveGroup)
            ? 'One per building'
            : state.cash < u.cost
              ? `Needs ${fmtK(u.cost)}`
              : needMW > 0 && needMW > spare + 1e-9
                ? `Needs ${needMW.toFixed(1)} MW spare power`
                : undefined));
      return { item: u, ok: !reason, reason, installed, needMW };
    });
}

/** Campus-wide policies. */
export function policyOptions(state: GameState, content: Content): Option<Upgrade>[] {
  const spare = powerBudget(state, content).spareMW;
  const groups = new Set(state.policies.map((id) => getUpgrade(content, id).exclusiveGroup).filter(Boolean));
  return content.upgrades
    .filter((u) => u.scope === 'policy' && checkCondition(u.requires, state, reader(state, content)))
    .map((u) => {
      const installed = state.policies.includes(u.id);
      const needMW = u.powerMW ?? 0;
      const reason = installed
        ? 'Active'
        : (blocked(state) ??
          (u.exclusiveGroup && groups.has(u.exclusiveGroup)
            ? 'Exclusive with another policy'
            : state.cash < u.cost
              ? `Needs ${fmtK(u.cost)}`
              : needMW > 0 && needMW > spare + 1e-9
                ? `Needs ${needMW.toFixed(1)} MW spare power`
                : undefined));
      return { item: u, ok: !reason, reason, installed, needMW };
    });
}

export interface DemolishOption {
  ok: boolean;
  /** Demolition fee, k€ (a share of the building's price; nothing is refunded). */
  cost: number;
  reason?: string;
}

/** Can the building on this plot be torn down right now, and what does it cost? */
export function demolishOption(state: GameState, content: Content, plot: number): DemolishOption | null {
  const p = state.plots[plot];
  if (!p) return null;
  const bld = getBuilding(content, p.building);
  const cost = Math.round(bld.cost * content.balance.demolishCostPct);
  const lastHall = bld.kind === 'datacenter' && state.plots.filter((x) => x && getBuilding(content, x.building).kind === 'datacenter').length <= 1;
  const reason = blocked(state) ?? (lastHall ? 'Your only hall: build another first' : state.cash < cost ? `Needs ${fmtK(cost)}` : undefined);
  return { ok: !reason, cost, reason };
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

function applyEffects(s: GameState, effects: Effects | undefined, source: string, temporary?: TemporaryEffect, scope?: 'hall') {
  if (effects) {
    if (effects.cash) s.cash += effects.cash;
    if (effects.demandPct) s.demandMW = Math.max(0.1, s.demandMW * (1 + effects.demandPct));
    if (effects.envDebt) s.envDebt = Math.max(0, s.envDebt + effects.envDebt);
    const persistent = persistentPart(effects);
    if (Object.keys(persistent).length > 0) s.modifiers.push({ source, effects: persistent, ...(scope ? { scope } : {}) });
  }
  if (temporary) {
    if (temporary.effects.cash) s.cash += temporary.effects.cash;
    if (temporary.effects.demandPct) s.demandMW = Math.max(0.1, s.demandMW * (1 + temporary.effects.demandPct));
    if (temporary.effects.envDebt) s.envDebt = Math.max(0, s.envDebt + temporary.effects.envDebt);
    s.modifiers.push({ source: `${source}:temporary`, effects: persistentPart(temporary.effects), expiresAt: s.tick + temporary.durationTicks });
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

function addFlags(s: GameState, flags: string[] | undefined) {
  for (const f of flags ?? []) if (!s.flags.includes(f)) s.flags.push(f);
}

function refreshOwned(s: GameState) {
  const all = new Set<string>(s.policies);
  for (const p of s.plots) for (const id of p?.upgrades ?? []) all.add(id);
  s.owned = [...all];
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
    addFlags(s, d.setFlags);
    if (d.message) log(s, 'debt', d.message);
    if (d.triggerEvent) enqueueEvent(s, content, d.triggerEvent);
  }
}

function scheduleDecisions(s: GameState, content: Content) {
  const read = reader(s, content);
  const eligible = (e: GameEvent) => (e.repeatable || !s.firedEvents.includes(e.id)) && !s.queue.some((q) => q.id === e.id) && checkCondition(e.when, s, read);

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

function removeUpgradeEverywhere(s: GameState, id: string) {
  s.policies = s.policies.filter((p) => p !== id);
  s.plots.forEach((p) => {
    if (p) p.upgrades = p.upgrades.filter((u) => u !== id);
  });
  s.modifiers = s.modifiers.filter((m) => m.source !== `policy:${id}` && !m.source.endsWith(`:${id}`));
  refreshOwned(s);
}

function applyChoice(s: GameState, content: Content, choice: Choice, source: string) {
  applyEffects(s, choice.effects, source, choice.temporary);
  applyScore(s, choice.scoreDelta, content);
  schedule(s, choice.delayed, source);
  addFlags(s, choice.setFlags);
  if (choice.clearFlags) s.flags = s.flags.filter((f) => !choice.clearFlags?.includes(f));
  for (const id of choice.removeUpgrades ?? []) removeUpgradeEverywhere(s, id);
  const stanceKind: LogKind = choice.stance === 'responsible' ? 'good' : choice.stance === 'greedy' ? 'bad' : 'info';
  log(s, stanceKind, choice.outcome);
}

/**
 * Sustainability tax for one quarter: below the threshold, a share of revenue that grows
 * linearly as the score falls. revenue × maxPct × (threshold − score) / threshold.
 */
export function sustainabilityTaxFor(revenue: number, sustainability: number, content: Content): number {
  const { sustainabilityTaxThreshold: t, sustainabilityTaxMaxPct: pct } = content.balance;
  if (t <= 0 || sustainability >= t || revenue <= 0) return 0;
  return (revenue * pct * (t - Math.max(0, sustainability))) / t;
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

  // Demand: grows toward the local market size (logistic), and leaves providers with a bad footprint.
  const growth = d.growthRate > 0 ? d.growthRate * Math.max(0, 1 - s.demandMW / loc.marketMW) : d.growthRate;
  s.demandMW = Math.max(0.1, s.demandMW * (1 + growth));
  const churn = clamp((s.envDebt - b.debtChurnStart) * b.debtChurnPerPoint, 0, b.maxDebtChurn);
  if (churn > 0) s.demandMW = Math.max(0.1, s.demandMW * (1 - churn));

  // Hardware ages hall by hall; at end of life a hall's servers are replaced (cost + e-waste + embodied carbon).
  let refreshCost = 0;
  let eWasteT = 0;
  let embodiedCo2 = 0;
  let refreshed = 0;
  const ages: number[] = [];
  s.plots.forEach((p) => {
    if (!p) return;
    const bld = getBuilding(content, p.building);
    if (bld.kind !== 'datacenter') return;
    if (s.tick + 1 - p.builtTick >= d.hardwareLifespan) {
      const mw = bld.itMW ?? 0;
      refreshCost += mw * b.refreshCostPerMW;
      eWasteT += mw * b.eWastePerMW * d.eWasteMultiplier;
      embodiedCo2 += mw * b.embodiedCarbonPerMW;
      p.builtTick = s.tick + 1;
      refreshed += 1;
    }
    ages.push(s.tick + 1 - p.builtTick);
  });
  s.hardwareAge = ages.length ? ages.reduce((a, x) => a + x, 0) / ages.length : 0;
  if (refreshed > 0) log(s, 'info', `Servers replaced in ${refreshed} hall${refreshed > 1 ? 's' : ''}: ${Math.round(eWasteT)} t of e-waste, ${fmtK(refreshCost)}.`);

  // Outages.
  const outage = roll(s) < d.failureRate;
  if (outage) {
    s.demandMW = Math.max(0.1, s.demandMW * (1 - b.outageChurn));
    s.totals.outages += 1;
    log(s, 'outage', 'Outage! Clients lost service and some of them left.');
  }

  // Power: what the plants deliver this quarter (renewables swing), what the halls can run.
  const plants = plantInfos(s, content, d);
  const available = plants.map((p) => Math.max(0, p.avgMW * (1 + (p.variability > 0 ? p.variability * (2 * roll(s) - 1) : 0))));
  const supply = available.reduce((a, x) => a + x, 0);
  const draw = upgradeDrawMW(s, content);
  const perLoad = mwPerLoad(d);
  const maxLoadByPower = Math.max(0, (supply - draw) / perLoad);
  const servable = Math.min(s.demandMW, s.capacityMW);
  const loadMW = Math.min(servable, maxLoadByPower);
  const facilityMW = Math.min(supply, loadMW * perLoad + draw);

  // Which halls are dark: those the power cannot run at full capacity (last built first).
  const hallPlots = s.plots.map((p, i) => (p && getBuilding(content, p.building).kind === 'datacenter' ? i : -1)).filter((i) => i >= 0);
  const unpoweredPlots: number[] = [];
  if (maxLoadByPower < s.capacityMW - 1e-6 && hallPlots.length > 0) {
    const perHall = s.capacityMW / hallPlots.length;
    const dark = Math.min(hallPlots.length, Math.ceil((s.capacityMW - maxLoadByPower) / perHall - 1e-9));
    unpoweredPlots.push(...hallPlots.slice(hallPlots.length - dark));
  }
  if (loadMW < servable - 0.05) log(s, 'bad', `Brownout: not enough power. ${Math.round((1 - loadMW / servable) * 100)}% of client load could not run.`);

  // Money and physics.
  const revenue = loadMW * loc.pricePerMW * d.priceMultiplier * (outage ? 1 - b.outageRevenueLoss : 1);
  const production = dispatch(plants, available, facilityMW);
  const H = b.hoursPerTick;
  const itEnergyMWh = loadMW * (1 - d.itEfficiency) * H;
  const energyMWh = facilityMW * H;
  const energyCost = production.reduce((a, mw, i) => a + (mw * H * plants[i].costPerMWh) / 1000, 0) + plants.reduce((a, p) => a + p.fixedCost, 0);
  const plantCo2 = production.reduce((a, mw, i) => a + (mw * H * plants[i].carbonPerMWh) / 1000, 0);
  const co2T = plantCo2 + embodiedCo2;
  const waterM3 = itEnergyMWh * d.wue + production.reduce((a, mw, i) => a + mw * H * plants[i].waterPerMWh, 0);
  const opex = b.fixedOpexPerTick + s.capacityMW * b.maintenancePerMW;
  const carbonTax = (co2T * d.carbonPrice) / 1000;
  // Sustainability tax: based on last quarter's score (no circular dependency on this quarter's numbers).
  const prevSustainability = s.history.at(-1)?.sustainability ?? computeScores(state, content).sustainability;
  const sustainabilityTax = sustainabilityTaxFor(revenue, prevSustainability, content);
  if (sustainabilityTax > 0)
    log(s, 'bad', `Sustainability tax: ${fmtK(sustainabilityTax)} (${Math.round((100 * sustainabilityTax) / revenue)}% of revenue) because your Sustainability was ${Math.round(prevSustainability)} < ${b.sustainabilityTaxThreshold}.`);
  const net = revenue - energyCost - opex - carbonTax - sustainabilityTax + d.cashPerTick - refreshCost;
  s.cash += net;

  // Environmental debt: the hidden bill.
  const debtBefore = s.envDebt;
  s.envDebt = Math.max(0, s.envDebt + co2T / b.carbonDebtDivisor + (waterM3 * loc.waterStress) / b.waterDebtDivisor + eWasteT * b.eWasteDebtPerT + d.envDebtPerTick - b.envDebtDecay);
  for (const threshold of [25, 50, 75]) {
    if (debtBefore < threshold && s.envDebt >= threshold) log(s, 'debt', 'Your environmental debt is growing. Someone will send the bill.');
  }

  s.totals.revenue += revenue;
  s.totals.energyMWh += energyMWh;
  s.totals.co2T += co2T;
  s.totals.waterM3 += waterM3;
  s.totals.eWasteT += eWasteT;
  s.totals.carbonTax += carbonTax;
  s.totals.sustainabilityTax += sustainabilityTax;

  // Trust fades unless maintained: responsibility drifts back toward 50.
  s.responsibility += (50 - s.responsibility) * b.responsibilityDrift;

  s.tick += 1;
  runScheduled(s, content);

  const report = {
    tick: s.tick,
    demandMW: s.demandMW,
    loadMW,
    revenue,
    energyCost,
    opex,
    carbonTax,
    sustainabilityTax,
    capex: refreshCost,
    net,
    cash: s.cash,
    energyMWh,
    co2T,
    waterM3,
    eWasteT,
    outage,
    supplyMW: supply,
    needMW: s.capacityMW * perLoad + draw,
    unpoweredPlots,
    carbonIntensity: energyMWh > 0 ? (plantCo2 * 1000) / energyMWh : 0,
    sustainability: 0,
    responsibility: 0,
    envDebt: s.envDebt,
  };
  s.history.push(report);
  const scores = computeScores(s, content);
  report.sustainability = scores.sustainability;
  report.responsibility = scores.responsibility;

  if (s.cash < b.bankruptcyAt) {
    s.status = 'bankrupt';
    s.queue = [];
    log(s, 'bad', 'Bankrupt. The creditors take the keys.');
    return s;
  }
  if (s.tick >= b.maxTicks) {
    s.status = 'ended';
    s.queue = [];
    log(s, 'info', `${b.maxTicks / 4} years have passed. Time to look back.`);
    return s;
  }

  scheduleDecisions(s, content);
  return s;
}

function build(s: GameState, content: Content, plot: number, buildingId: string): boolean {
  const opt = buildOptions(s, content, plot).find((o) => o.item.id === buildingId);
  if (!opt?.ok) return false;
  const bld = opt.item;
  s.cash -= bld.cost;
  s.plots[plot] = { building: bld.id, upgrades: [], builtTick: s.tick };
  s.capacityMW = hallMW(content, s);
  applyEffects(s, bld.effects, `plot:${plot}:building`);
  applyScore(s, bld.scoreDelta, content);
  schedule(s, bld.delayed, `plot:${plot}:building`);
  addFlags(s, bld.setFlags);
  s.decisions.push(`build:${bld.id}`);
  log(s, bld.kind === 'datacenter' ? 'info' : (bld.carbonPerMWh ?? 0) > 300 ? 'bad' : 'good', `Built ${bld.name}. ${bld.whyItMatters}`);
  return true;
}

function buy(s: GameState, content: Content, upgradeId: string, plot?: number): boolean {
  const up = getUpgrade(content, upgradeId);
  const opts = up.scope === 'policy' ? policyOptions(s, content) : plot === undefined ? [] : upgradeOptions(s, content, plot);
  const opt = opts.find((o) => o.item.id === upgradeId);
  if (!opt?.ok) return false;
  const resolved = resolveUpgrade(up, s.locationId);
  s.cash -= up.cost;
  if (up.scope === 'policy') {
    s.policies.push(up.id);
    applyEffects(s, resolved.effects, `policy:${up.id}`);
  } else {
    s.plots[plot!]!.upgrades.push(up.id);
    applyEffects(s, resolved.effects, `plot:${plot}:${up.id}`, undefined, up.scope === 'hall' ? 'hall' : undefined);
  }
  refreshOwned(s);
  applyScore(s, resolved.scoreDelta, content);
  schedule(s, up.delayed, `upgrade:${up.id}`);
  addFlags(s, up.setFlags);
  s.decisions.push(`upgrade:${up.id}`);
  log(s, up.family === 'good' ? 'good' : up.family === 'trap' ? 'bad' : 'info', `Installed ${up.name}. ${up.whyItMatters}`);
  return true;
}

/**
 * Tear down a building. Its upgrades go with it, and so do their persistent effects
 * (modifiers sourced "plot:<n>:building" and "plot:<n>:<upgradeId>"). Score deltas
 * already earned stay, and bills already scheduled (delayed effects) still arrive:
 * demolishing the coal plant does not erase the smoke it made.
 */
function demolish(s: GameState, content: Content, plot: number): boolean {
  const opt = demolishOption(s, content, plot);
  const p = s.plots[plot];
  if (!opt?.ok || !p) return false;
  const bld = getBuilding(content, p.building);
  const sources = new Set([`plot:${plot}:building`, ...p.upgrades.map((id) => `plot:${plot}:${id}`)]);
  s.cash -= opt.cost;
  s.modifiers = s.modifiers.filter((m) => !sources.has(m.source));
  s.plots[plot] = null;
  s.capacityMW = hallMW(content, s);
  refreshOwned(s);
  s.decisions.push(`demolish:${bld.id}`);
  log(s, 'info', `Demolished ${bld.name}${p.upgrades.length ? ` and its ${p.upgrades.length} upgrade${p.upgrades.length > 1 ? 's' : ''}` : ''} for ${fmtK(opt.cost)}. The plot is free again.`);
  return true;
}

export function applyAction(state: GameState, action: Action, content: Content): GameState {
  if (state.status !== 'playing') return state;
  const s = structuredClone(state);

  if (action.type === 'build') return build(s, content, action.plot, action.buildingId) ? s : state;
  if (action.type === 'buy') return buy(s, content, action.upgradeId, action.plot) ? s : state;
  if (action.type === 'demolish') return demolish(s, content, action.plot) ? s : state;

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

/** True if this upgrade can be bought right now (on `plot` for hall and plant upgrades). */
export function canBuy(state: GameState, content: Content, upgradeId: string, plot?: number): boolean {
  const up = getUpgrade(content, upgradeId);
  const opts = up.scope === 'policy' ? policyOptions(state, content) : plot === undefined ? [] : upgradeOptions(state, content, plot);
  return Boolean(opts.find((o) => o.item.id === upgradeId)?.ok);
}
