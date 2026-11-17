/**
 * Datacenter Tycoon — shared contracts.
 *
 * This file is the single source of truth for the shapes shared by the engine,
 * the UI, the content files (/content/*.json) and the scripts. The JSON schemas
 * in /content/schema mirror these types. If you change a type here, update the
 * matching schema, run `npm run validate:content`, and log the change in
 * docs/HANDOFF.md so other people and agents notice.
 *
 * Units used everywhere:
 *   money      k€ (thousands of euros). 1500 = €1.5M
 *   time       1 tick = 1 quarter (3 months). A run is 40 ticks = 10 years.
 *   power      MW of IT load
 *   energy     MWh
 *   carbon     tonnes CO2e (t)
 *   water      m³
 *   e-waste    tonnes (t)
 */

// ---------------------------------------------------------------------------
// Content: shared building blocks
// ---------------------------------------------------------------------------

/** How sure we are about a number shown to players. */
export type Confidence = 'high' | 'approx' | 'illustrative';

/** Frugal-AI themes from the AFNOR / Ecolab framework (see docs/GAME_DESIGN.md §2). */
export type FrugalTheme =
  | 'question-the-need'
  | 'measure'
  | 'lifecycle'
  | 'efficiency'
  | 'energy-mix'
  | 'water'
  | 'rebound'
  | 'honest-communication'
  | 'governance'
  | 'skills';

/**
 * Numeric effects. Two kinds of keys:
 *  - ONE-OFF keys are applied once, immediately: cash, demandPct, envDebt.
 *  - PERSISTENT keys stack as modifiers for as long as their source is active
 *    (forever for upgrades, `durationTicks` for temporary event effects).
 * All values are deltas (added to the current value).
 */
export interface Effects {
  // one-off
  /** k€ added to (or removed from) cash right now. */
  cash?: number;
  /** Fraction of current client demand gained or lost right now (-0.2 = lose 20%). */
  demandPct?: number;
  /** Hidden environmental debt added right now. */
  envDebt?: number;

  // persistent
  /** Power Usage Effectiveness delta (facility energy / IT energy). Lower is better. */
  pue?: number;
  /** Water Usage Effectiveness delta, litres per kWh of IT energy. */
  wue?: number;
  /** Share of energy from additional renewables (0..1) delta. */
  renewableShare?: number;
  /** Demand growth per tick delta (0.01 = +1 % per quarter). */
  growthRate?: number;
  /** Upper bound on growth per tick while active (min of all active caps wins). */
  growthCap?: number;
  /** Probability of an outage per tick, delta. */
  failureRate?: number;
  /** Recurring k€ per tick (positive = income or savings, negative = running cost). */
  cashPerTick?: number;
  /** Environmental debt added every tick. */
  envDebtPerTick?: number;
  /** Price clients pay per MW, relative delta (0.1 = +10 %). */
  pricePct?: number;
  /** Energy price, relative delta (-0.2 = 20 % cheaper). */
  energyPricePct?: number;
  /** Less IT energy for the same work (model compression, better code), 0..0.6. */
  itEfficiency?: number;
  /** Server lifespan in ticks, delta (base 16 ticks = 4 years). */
  hardwareLifespan?: number;
  /** E-waste multiplier delta (-0.5 = half the e-waste per refresh). */
  eWasteFactor?: number;
  /** Grid carbon intensity delta in gCO2e/kWh (a fossil contract, a coal plant closing). */
  carbonIntensity?: number;
}

/** Score deltas, applied once when a choice is made or an upgrade is bought. */
export interface ScoreDelta {
  sustainability?: number;
  responsibility?: number;
}

/**
 * Conditions used by events, delayed effects and choices.
 * Every field is optional; all present fields must hold (logical AND).
 */
export interface Condition {
  locations?: string[];
  hasUpgrades?: string[];
  lacksUpgrades?: string[];
  flagsSet?: string[];
  flagsUnset?: string[];
  minTick?: number;
  maxTick?: number;
  /** Stat must be >= value, e.g. { "envDebt": 40 }. */
  statGte?: Partial<Record<StatKey, number>>;
  /** Stat must be <= value. */
  statLte?: Partial<Record<StatKey, number>>;
}

/** Stats that conditions can read (see engine/derive.ts). */
export type StatKey =
  | 'envDebt'
  | 'cash'
  | 'demandMW'
  | 'pue'
  | 'wue'
  | 'renewableShare'
  | 'growthRate'
  | 'failureRate'
  | 'itEfficiency'
  | 'sustainability'
  | 'responsibility'
  | 'hardwareAge';

/** An effect that fires later. Traps use this to hide their bill. */
export interface DelayedEffect {
  afterTicks: number;
  /** Optional 0..1 probability (rolled with the run's seeded RNG). Default 1. */
  chance?: number;
  /** Only fires if this holds at the time it is due. */
  if?: Condition;
  effects?: Effects;
  scoreDelta?: ScoreDelta;
  /** Force an event (by id) onto the decision queue. */
  triggerEvent?: string;
  /** Flags set when it fires (e.g. a lobbied exemption expiring). */
  setFlags?: string[];
  /** Shown in the log when it fires. */
  message?: string;
}

/** A temporary effect (e.g. heatwave, power cap) that expires on its own. */
export interface TemporaryEffect {
  durationTicks: number;
  effects: Effects;
}

/** Location-specific overrides. Values REPLACE the base values for the keys given. */
export interface ContextOverride {
  effects?: Effects;
  scoreDelta?: ScoreDelta;
  /** Shown next to the upgrade in this location ("Free cooling barely works in the desert"). */
  note?: string;
}

export interface Sourced {
  /** Short citation or URL. Use "game design" for pure game numbers. */
  source: string;
  confidence: Confidence;
}

// ---------------------------------------------------------------------------
// Content: entities
// ---------------------------------------------------------------------------

export type UpgradeFamily = 'good' | 'trap' | 'tradeoff';
export type UpgradeCategory =
  | 'cooling'
  | 'energy'
  | 'hardware'
  | 'ai'
  | 'governance'
  | 'communication'
  | 'water';

export interface Upgrade extends Sourced {
  id: string;
  name: string;
  /** One line, punchy, shown on the card. */
  pitch: string;
  family: UpgradeFamily;
  category: UpgradeCategory;
  themes: FrugalTheme[];
  /** Upfront cost in k€. */
  cost: number;
  /** Persistent effects while owned. One-off keys (cash, demandPct, envDebt) apply at purchase. */
  effects: Effects;
  scoreDelta: ScoreDelta;
  delayed?: DelayedEffect[];
  /** Keyed by location id. */
  contextModifiers?: Record<string, ContextOverride>;
  /** Only one upgrade per group can be owned (e.g. one cooling system). */
  exclusiveGroup?: string;
  /** Must hold for the upgrade to appear in the shop. */
  requires?: Condition;
  /** Flags set on purchase (e.g. "efficiency-gain" arms the rebound event). */
  setFlags?: string[];
  /** One sentence shown after purchase. Teach, don't lecture. */
  whyItMatters: string;
  /** True if part of the vertical slice (first playable). */
  slice?: boolean;
}

/** How a choice leans. Used by the balance sim and by analytics (good vs trap picks). */
export type Stance = 'responsible' | 'neutral' | 'greedy';

export interface Choice {
  id: string;
  label: string;
  stance: Stance;
  /** Shown under the label: what you get / what you give up. */
  hint?: string;
  /** Hidden from the player unless this holds. */
  requires?: Condition;
  effects?: Effects;
  temporary?: TemporaryEffect;
  scoreDelta?: ScoreDelta;
  delayed?: DelayedEffect[];
  setFlags?: string[];
  clearFlags?: string[];
  /** Sell back / drop upgrades (their persistent effects stop). No refund. */
  removeUpgrades?: string[];
  /** Shown after choosing. */
  outcome: string;
}

export type EventKind = 'random' | 'consequence' | 'milestone';

export interface GameEvent extends Sourced {
  id: string;
  title: string;
  /** 1-3 sentences. */
  body: string;
  kind: EventKind;
  themes: FrugalTheme[];
  /**
   * When the event may happen. Consequence events fire as soon as `when` holds
   * (envDebt thresholds etc). Random events are drawn by weight among eligible ones.
   */
  when?: Condition;
  /** Draw weight for random events. Default 1. */
  weight?: number;
  /** Can it happen more than once per run? Default false. */
  repeatable?: boolean;
  choices: Choice[];
  /** Quiz question id shown after this event resolves (if quiz budget remains). */
  quizId?: string;
  slice?: boolean;
}

/** Is AI actually needed for this workload? Core of "question the need". */
export type AiNeed = 'needed' | 'partly' | 'not-needed' | 'not-ai';

export interface Client extends Sourced {
  id: string;
  name: string;
  /** What they want, one or two sentences. */
  request: string;
  aiNeed: AiNeed;
  /** Accept / refuse / propose-alternative, in that order by convention. */
  choices: Choice[];
  when?: Condition;
  weight?: number;
  quizId?: string;
  slice?: boolean;
}

export interface Location extends Sourced {
  id: string;
  name: string;
  /** One line shown on the location card. */
  tagline: string;
  /** Teaching point: what makes this place different. */
  context: string;
  basePue: number;
  /** L/kWh */
  baseWue: number;
  /** gCO2e/kWh of the local grid. */
  gridCarbon: number;
  /** 0 = plenty of water, 1 = stressed, >1 = severe. Weighs water in scores and debt. */
  waterStress: number;
  /** €/MWh */
  energyPrice: number;
  /** k€ revenue per MW of IT load per tick. */
  pricePerMW: number;
  /** Demand growth per tick. */
  baseGrowth: number;
  startDemandMW: number;
  /** Size of the local market in MW. Organic growth slows to zero as demand approaches it (logistic). */
  marketMW: number;
  startCash: number;
  enabled: boolean;
}

export interface QuizQuestion extends Sourced {
  id: string;
  question: string;
  answers: string[];
  correctIndex: number;
  /** Shown after answering, right or wrong. One or two sentences. */
  explanation: string;
  themes: FrugalTheme[];
}

/** Global tuning knobs. Lives in content/balance.json so designers can tweak without code. */
export interface Balance {
  maxTicks: number;
  hoursPerTick: number;
  fixedOpexPerTick: number;
  maintenancePerMW: number;
  capexPerMW: number;
  refreshCostPerMW: number;
  eWastePerMW: number;
  embodiedCarbonPerMW: number;
  baseHardwareLifespan: number;
  baseFailureRate: number;
  /** Extra failure probability per tick of hardware age beyond 75 % of lifespan. */
  agingFailurePerTick: number;
  outageRevenueLoss: number;
  outageChurn: number;
  carbonPriceWhenTaxed: number;
  /** envDebt added per tick: co2T / carbonDebtDivisor */
  carbonDebtDivisor: number;
  /** envDebt added per tick: waterM3 * waterStress / waterDebtDivisor */
  waterDebtDivisor: number;
  /** envDebt added per t of e-waste */
  eWasteDebtPerT: number;
  /** envDebt repaid per tick (nature and society forgive slowly). */
  envDebtDecay: number;
  /** Above this envDebt, clients start leaving every tick (ESG procurement, reputation). */
  debtChurnStart: number;
  /** Demand lost per tick per point of envDebt above debtChurnStart. */
  debtChurnPerPoint: number;
  /** Cap on debt-driven churn per tick. */
  maxDebtChurn: number;
  /** Each tick, responsibility moves this fraction of the way back to 50 (trust must be maintained). */
  responsibilityDrift: number;
  /** Max absolute value of the sustainability bonus from decisions. */
  sustainabilityBonusCap: number;
  bankruptcyAt: number;
  /** Ticks between two client intake requests. */
  clientEvery: number;
  /** Probability per tick of a random event when no decision is pending. */
  randomEventChance: number;
  maxQuizPerRun: number;
  /** Net worth that counts as "full marks" for the profit axis. */
  profitReference: number;
  minPue: number;
}

export interface Content {
  balance: Balance;
  locations: Location[];
  upgrades: Upgrade[];
  events: GameEvent[];
  clients: Client[];
  quiz: QuizQuestion[];
}

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

export interface Modifier {
  /** e.g. "upgrade:free-cooling", "event:heatwave:run-hot" */
  source: string;
  effects: Effects;
  /** Tick at which it stops applying (exclusive). Undefined = permanent. */
  expiresAt?: number;
}

export interface ScheduledEffect extends DelayedEffect {
  dueTick: number;
  source: string;
}

export type Decision =
  | { kind: 'event'; id: string }
  | { kind: 'client'; id: string }
  | { kind: 'quiz'; id: string };

export interface TickReport {
  tick: number;
  demandMW: number;
  loadMW: number;
  revenue: number;
  energyCost: number;
  opex: number;
  carbonTax: number;
  capex: number;
  net: number;
  cash: number;
  energyMWh: number;
  co2T: number;
  waterM3: number;
  eWasteT: number;
  outage: boolean;
  sustainability: number;
  responsibility: number;
  envDebt: number;
}

export type LogKind = 'info' | 'good' | 'bad' | 'debt' | 'outage';

export interface LogEntry {
  tick: number;
  kind: LogKind;
  text: string;
}

export interface QuizAnswer {
  id: string;
  correct: boolean;
  tick: number;
}

export type RunStatus = 'playing' | 'ended' | 'bankrupt';

export interface GameState {
  version: 1;
  seed: number;
  rng: number;
  tick: number;
  status: RunStatus;
  locationId: string;

  cash: number;
  demandMW: number;
  /** Built capacity. Follows demand up (capex), does not shrink when clients leave. */
  capacityMW: number;
  hardwareAge: number;
  envDebt: number;
  /** Running score from decisions. 0..100. */
  responsibility: number;
  /** Bonus on top of measured sustainability, from decisions. Clamped ±30. */
  sustainabilityBonus: number;

  owned: string[];
  modifiers: Modifier[];
  scheduled: ScheduledEffect[];
  flags: string[];
  firedEvents: string[];
  seenClients: string[];
  queue: Decision[];
  quizAnswers: QuizAnswer[];
  /** Every choice made: "event:<id>:<choiceId>", "client:<id>:<choiceId>", "upgrade:<id>". */
  decisions: string[];
  /** First tick's facility energy, used for the absolute-footprint score. */
  baselineEnergyMWh: number;

  totals: {
    revenue: number;
    energyMWh: number;
    co2T: number;
    waterM3: number;
    eWasteT: number;
    outages: number;
    carbonTax: number;
  };
  history: TickReport[];
  log: LogEntry[];
}

/** Snapshot of everything derived from state + modifiers at a given tick. */
export interface DerivedStats {
  pue: number;
  wue: number;
  renewableShare: number;
  growthRate: number;
  failureRate: number;
  cashPerTick: number;
  envDebtPerTick: number;
  priceMultiplier: number;
  energyPriceMultiplier: number;
  itEfficiency: number;
  hardwareLifespan: number;
  eWasteMultiplier: number;
  /** gCO2e/kWh after renewables. */
  effectiveCarbon: number;
  carbonPrice: number;
}

export interface Scores {
  sustainability: number;
  responsibility: number;
  /** The measured part of sustainability, by component, each 0..100. */
  breakdown: {
    pue: number;
    carbon: number;
    water: number;
    lifecycle: number;
    footprint: number;
  };
}

export type Archetype = 'frugal-tycoon' | 'planet-burner' | 'cloud-monk' | 'lost-in-the-fog';

export interface RunSummary {
  seed: number;
  locationId: string;
  status: RunStatus;
  ticksPlayed: number;
  netWorth: number;
  /** 0..1.5, netWorth / profitReference */
  profitNorm: number;
  /** Time-averaged (sustainability + responsibility) / 2, 0..100. */
  impact: number;
  finalSustainability: number;
  finalResponsibility: number;
  /** The single shareable number. Geometric mean rewards balance. 0..~1200 */
  legacy: number;
  archetype: Archetype;
  totals: GameState['totals'];
  envDebt: number;
  quizCorrect: number;
  quizAnswered: number;
  gained: string[];
  gaveUp: string[];
}

export type Action =
  | { type: 'buy'; upgradeId: string }
  | { type: 'choose'; choiceId: string }
  | { type: 'answer'; answerIndex: number };
