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
 *   carbon     tonnes CO2e (t); intensities in kg/MWh (= g/kWh)
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

/**
 * Where an upgrade is installed:
 *  - "hall":   on one datacenter hall (intensive effects like PUE are averaged over all halls)
 *  - "plant":  on one power plant of a type listed in `plantTypes` (uses `plantEffects`)
 *  - "policy": campus-wide, bought from the Policies menu
 */
export type UpgradeScope = 'hall' | 'plant' | 'policy';

/** Effects of a plant upgrade on that plant only (relative deltas). */
export interface PlantEffects {
  outputPct?: number;
  carbonPct?: number;
  costPct?: number;
  waterPct?: number;
  variabilityPct?: number;
}

export interface Upgrade extends Sourced {
  id: string;
  name: string;
  /** One line, punchy, shown on the card. */
  pitch: string;
  family: UpgradeFamily;
  category: UpgradeCategory;
  themes: FrugalTheme[];
  scope: UpgradeScope;
  /** For scope "plant": which plant types can take it. */
  plantTypes?: PlantType[];
  /** Upfront cost in k€ (per building for hall and plant upgrades). */
  cost: number;
  /** Extra power the upgrade draws, MW. Needs that much spare power to install. */
  powerMW?: number;
  plantEffects?: PlantEffects;
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

// ---------------------------------------------------------------------------
// Buildings: datacenter halls and power plants, built on map plots
// ---------------------------------------------------------------------------

export type PlantType = 'gas' | 'coal' | 'biomass' | 'wind' | 'solar' | 'hydro';
export type Resource = 'wind' | 'solar' | 'river';

export interface Building extends Sourced {
  id: string;
  name: string;
  /** One line shown in the build ring. */
  pitch: string;
  kind: 'datacenter' | 'plant';
  plantType?: PlantType;
  /** "land" plots or the single "river" spot (the dam). */
  placement: 'land' | 'river';
  /** Upfront cost, k€. */
  cost: number;
  /** Datacenter: IT capacity added, MW. Needs itMW x PUE of spare power to build. */
  itMW?: number;
  /** Plant: nameplate power, MW. */
  nameplateMW?: number;
  /** Plant: average share of nameplate actually delivered (before the location's resource multiplier). */
  capacityFactor?: number;
  /** Plant: the location resource that scales its output (wind, sun, river). Thermal plants: none. */
  resource?: Resource;
  /** Plant: random swing of output each quarter (0.3 = ±30 %). Renewables vary, thermal does not. */
  variability?: number;
  /** Plant: fuel + variable O&M, € per MWh produced. */
  costPerMWh?: number;
  /** Plant: true if the location's fuel price applies (gas, coal, biomass). */
  fuel?: boolean;
  /** Fixed running cost, k€ per tick. */
  fixedCostPerTick?: number;
  /** Plant: life-cycle emissions, kg CO2e per MWh (= g/kWh). */
  carbonPerMWh?: number;
  /** Plant: cooling water consumed, m³ per MWh. */
  waterPerMWh?: number;
  /** Persistent effects while the building stands (e.g. envDebtPerTick for a dam). One-off keys apply at build. */
  effects?: Effects;
  scoreDelta: ScoreDelta;
  delayed?: DelayedEffect[];
  setFlags?: string[];
  requires?: Condition;
  whyItMatters: string;
}

/** What stands on a plot. */
export interface PlotState {
  building: string;
  upgrades: string[];
  /** Tick the building (for halls: its current servers) was installed. */
  builtTick: number;
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
  /** 0 = plenty of water, 1 = stressed, >1 = severe. Weighs water in scores and debt. */
  waterStress: number;
  /** Multipliers on renewable plant output here (1 = average). */
  resources: Record<Resource, number>;
  /** Multiplier on fuel costs (gas, coal, biomass) here. */
  fuelPrice: number;
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
  /** Number of land plots on the map (the river spot comes after them). */
  landPlots: number;
  /** Buildings standing at the start of a run. */
  startBuildings: { plot: number; building: string }[];
  fixedOpexPerTick: number;
  maintenancePerMW: number;
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
  /** Demolition fee as a share of the building's price. No refund of the price or its upgrades. */
  demolishCostPct: number;
}

export interface Content {
  balance: Balance;
  locations: Location[];
  buildings: Building[];
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
  /** "hall": installed on one hall; intensive effects (PUE, WUE…) are averaged over all halls. */
  scope?: 'hall';
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
  /** Average power the plants could deliver this tick, MW. */
  supplyMW: number;
  /** Facility power needed to serve all demand the halls could take, MW. */
  needMW: number;
  /** Halls (by plot index) that had no power this tick. */
  unpoweredPlots: number[];
  /** Emissions per MWh of electricity used this tick, kg/MWh (= g/kWh). */
  carbonIntensity: number;
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
  /** IT capacity of all built halls, MW. */
  capacityMW: number;
  hardwareAge: number;
  envDebt: number;
  /** Running score from decisions. 0..100. */
  responsibility: number;
  /** Bonus on top of measured sustainability, from decisions. Clamped ±30. */
  sustainabilityBonus: number;

  /** One entry per plot (land plots, then the river spot). null = empty. */
  plots: (PlotState | null)[];
  /** Campus-wide policies bought. */
  policies: string[];
  /** Every upgrade id installed anywhere (hall, plant or policy). Used by conditions. */
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
  carbonPrice: number;
  /** Number of datacenter halls standing. */
  halls: number;
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
  | { type: 'build'; plot: number; buildingId: string }
  | { type: 'buy'; upgradeId: string; plot?: number }
  /** Tear down the building on a plot: its upgrades and their persistent effects go with it. Costs a fee, no refund. */
  | { type: 'demolish'; plot: number }
  | { type: 'choose'; choiceId: string }
  | { type: 'answer'; answerIndex: number };
