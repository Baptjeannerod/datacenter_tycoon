import { clamp, derive, getLocation } from './derive';
import type { Archetype, Content, DerivedStats, GameState, RunSummary, Scores } from './types';

/**
 * Sustainability = measured index (from physical stats) + decision bonus.
 * Every weight and bound lives here and is documented in docs/GAME_DESIGN.md §4.
 */
export const SUSTAINABILITY_WEIGHTS = {
  pue: 0.25,
  carbon: 0.25,
  water: 0.15,
  lifecycle: 0.15,
  footprint: 0.2,
} as const;

export function computeScores(state: GameState, content: Content, d: DerivedStats = derive(state, content)): Scores {
  const loc = getLocation(content, state.locationId);
  const lastEnergy = state.history.at(-1)?.energyMWh ?? state.baselineEnergyMWh;

  const breakdown = {
    // PUE 2.0 -> 0, PUE 1.1 -> 100
    pue: clamp((2.0 - d.pue) / 0.9, 0, 1) * 100,
    // 700 gCO2e/kWh (coal) -> 0, 0 -> 100
    carbon: clamp(1 - d.effectiveCarbon / 700, 0, 1) * 100,
    // Water weighted by local stress: WUE x stress of 2 or more -> 0
    water: clamp(1 - (d.wue * loc.waterStress) / 2, 0, 1) * 100,
    // Lifespan 2 years -> 0, 8 years -> 60 pts; e-waste cut by 70 % -> +40 pts
    lifecycle:
      clamp((d.hardwareLifespan - 8) / 24, 0, 1) * 60 + clamp((1 - d.eWasteMultiplier) / 0.7, 0, 1) * 40,
    // Planetary boundaries: absolute energy vs. day one. 4x the energy -> 0
    footprint: clamp(1 - (lastEnergy / state.baselineEnergyMWh - 1) / 3, 0, 1) * 100,
  };

  const measured =
    breakdown.pue * SUSTAINABILITY_WEIGHTS.pue +
    breakdown.carbon * SUSTAINABILITY_WEIGHTS.carbon +
    breakdown.water * SUSTAINABILITY_WEIGHTS.water +
    breakdown.lifecycle * SUSTAINABILITY_WEIGHTS.lifecycle +
    breakdown.footprint * SUSTAINABILITY_WEIGHTS.footprint;

  return {
    sustainability: clamp(measured + state.sustainabilityBonus, 0, 100),
    responsibility: clamp(state.responsibility, 0, 100),
    breakdown,
  };
}

/** Profit axis threshold and impact axis threshold for the end-screen quadrants. */
export const ARCHETYPE_THRESHOLDS = { profitNorm: 0.6, impact: 60 } as const;

export function archetypeOf(profitNorm: number, impact: number): Archetype {
  const rich = profitNorm >= ARCHETYPE_THRESHOLDS.profitNorm;
  const good = impact >= ARCHETYPE_THRESHOLDS.impact;
  if (rich && good) return 'frugal-tycoon';
  if (rich) return 'planet-burner';
  if (good) return 'cloud-monk';
  return 'lost-in-the-fog';
}

/** Legacy = 1000 x geometric mean of profit and impact. Balance beats extremes. */
export function legacyScore(profitNorm: number, impact: number, bankrupt: boolean): number {
  const raw = 1000 * Math.sqrt(Math.max(0, profitNorm) * clamp(impact / 100, 0, 1));
  return Math.round(bankrupt ? raw * 0.5 : raw);
}

const fmtMoney = (k: number) => (Math.abs(k) >= 1000 ? `€${(k / 1000).toFixed(1)}M` : `€${Math.round(k)}k`);

export function summarize(state: GameState, content: Content): RunSummary {
  const b = content.balance;
  const scores = computeScores(state, content);
  const netWorth = state.cash;
  const profitNorm = clamp(netWorth / b.profitReference, 0, 1.5);
  const impact =
    state.history.length === 0
      ? (scores.sustainability + scores.responsibility) / 2
      : state.history.reduce((acc, h) => acc + (h.sustainability + h.responsibility) / 2, 0) / state.history.length;

  const greenSpend = state.owned
    .map((id) => content.upgrades.find((u) => u.id === id))
    .filter((u) => u && u.family === 'good')
    .reduce((acc, u) => acc + (u?.cost ?? 0), 0);
  const traps = state.owned.filter((id) => content.upgrades.find((u) => u.id === id)?.family === 'trap');
  const declined = state.decisions.filter((d) => d.startsWith('client:') && !d.endsWith(':accept')).length;
  const accepted = state.decisions.filter((d) => d.startsWith('client:') && d.endsWith(':accept')).length;
  const consequences = state.firedEvents.filter(
    (id) => content.events.find((e) => e.id === id)?.kind === 'consequence',
  ).length;

  const gained: string[] = [`${fmtMoney(netWorth)} net worth`];
  if (accepted > 0) gained.push(`${accepted} client deal${accepted > 1 ? 's' : ''} accepted`);
  if (traps.length > 0) gained.push(`Fast growth from ${traps.length} shortcut${traps.length > 1 ? 's' : ''}`);
  gained.push(`Sustainability ${Math.round(scores.sustainability)}/100, Responsibility ${Math.round(scores.responsibility)}/100`);

  const gaveUp: string[] = [];
  if (greenSpend > 0) gaveUp.push(`${fmtMoney(greenSpend)} invested in green upgrades`);
  if (declined > 0) gaveUp.push(`${declined} client deal${declined > 1 ? 's' : ''} refused or downsized`);
  if (state.totals.carbonTax > 0) gaveUp.push(`${fmtMoney(state.totals.carbonTax)} paid in carbon tax`);
  if (consequences > 0) gaveUp.push(`${consequences} environmental bill${consequences > 1 ? 's' : ''} came due`);
  gaveUp.push(`${Math.round(state.totals.co2T).toLocaleString('en')} t CO2e emitted`);
  gaveUp.push(`${Math.round(state.totals.waterM3).toLocaleString('en')} m³ of water used`);

  const quizCorrect = state.quizAnswers.filter((q) => q.correct).length;
  return {
    seed: state.seed,
    locationId: state.locationId,
    status: state.status,
    ticksPlayed: state.tick,
    netWorth,
    profitNorm,
    impact,
    finalSustainability: scores.sustainability,
    finalResponsibility: scores.responsibility,
    legacy: legacyScore(profitNorm, impact, state.status === 'bankrupt'),
    archetype: archetypeOf(profitNorm, impact),
    totals: { ...state.totals },
    envDebt: state.envDebt,
    quizCorrect,
    quizAnswered: state.quizAnswers.length,
    gained,
    gaveUp,
  };
}
