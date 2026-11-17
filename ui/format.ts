/** Formatting helpers shared by the UI. Money in the engine is k€. */
import type { Effects, Upgrade } from '../engine';
import { copy } from './copy';

export const money = (k: number, signed = false): string => {
  const sign = k < 0 ? '−' : signed ? '+' : '';
  const a = Math.abs(k);
  const body = a >= 1000 ? `€${(a / 1000).toFixed(a >= 10000 ? 1 : 2)}M` : `€${Math.round(a)}k`;
  return sign + body;
};

export const num = (n: number, digits = 0) => n.toLocaleString('en', { maximumFractionDigits: digits, minimumFractionDigits: digits });

export const quarterLabel = (tick: number) => `Year ${Math.floor(tick / 4) + 1} · Q${(tick % 4) + 1}`;

const pct = (v: number) => `${v > 0 ? '+' : '−'}${Math.abs(Math.round(v * 1000) / 10)}%`;

/**
 * Visible, honest effect chips for an upgrade card. Deliberately hides the
 * hidden bill (envDebtPerTick, delayed effects): spotting the trap is the game.
 */
export function effectChips(e: Effects): { text: string; tone: 'up' | 'down' }[] {
  const out: { text: string; tone: 'up' | 'down' }[] = [];
  const push = (cond: boolean | undefined, text: string, good: boolean) => cond && out.push({ text, tone: good ? 'up' : 'down' });
  push(e.pue !== undefined && e.pue !== 0, `PUE ${e.pue! > 0 ? '+' : '−'}${Math.abs(e.pue!)}`, (e.pue ?? 0) < 0);
  push(e.wue !== undefined && e.wue !== 0, `Water ${e.wue! > 0 ? '+' : '−'}${Math.abs(e.wue!)} L/kWh`, (e.wue ?? 0) < 0);
  push(e.renewableShare !== undefined && e.renewableShare !== 0, `${pct(e.renewableShare!)} clean power`, (e.renewableShare ?? 0) > 0);
  push(e.carbonIntensity !== undefined && e.carbonIntensity !== 0, `Grid ${e.carbonIntensity! > 0 ? '+' : '−'}${Math.abs(e.carbonIntensity!)} gCO₂/kWh`, (e.carbonIntensity ?? 0) < 0);
  push(e.growthRate !== undefined && e.growthRate !== 0, `Growth ${pct(e.growthRate!)}/qtr`, (e.growthRate ?? 0) > 0);
  push(e.growthCap !== undefined, `Growth capped at ${Math.round((e.growthCap ?? 0) * 1000) / 10}%/qtr`, false);
  push(e.pricePct !== undefined && e.pricePct !== 0, `Revenue/MW ${pct(e.pricePct!)}`, (e.pricePct ?? 0) > 0);
  push(e.energyPricePct !== undefined && e.energyPricePct !== 0, `Energy price ${pct(e.energyPricePct!)}`, (e.energyPricePct ?? 0) < 0);
  push(e.itEfficiency !== undefined && e.itEfficiency !== 0, `IT energy −${Math.round((e.itEfficiency ?? 0) * 100)}%`, true);
  push(e.cashPerTick !== undefined && e.cashPerTick !== 0, `${money(e.cashPerTick!, true)}/qtr`, (e.cashPerTick ?? 0) > 0);
  push(e.failureRate !== undefined && e.failureRate !== 0, `Outage risk ${pct(e.failureRate!)}`, (e.failureRate ?? 0) < 0);
  push(e.hardwareLifespan !== undefined && e.hardwareLifespan !== 0, `Servers last ${e.hardwareLifespan! > 0 ? '+' : '−'}${Math.abs(e.hardwareLifespan! / 4)} yr`, (e.hardwareLifespan ?? 0) > 0);
  push(e.eWasteFactor !== undefined && e.eWasteFactor !== 0, `E-waste ${pct(e.eWasteFactor!)}`, (e.eWasteFactor ?? 0) < 0);
  return out;
}

export const CATEGORY_LABEL: Record<Upgrade['category'], string> = {
  cooling: 'Cooling',
  energy: 'Energy',
  hardware: 'Hardware',
  ai: 'AI',
  governance: 'Governance',
  communication: 'Communication',
  water: 'Water',
};

/** Archetype titles and one-liners come from content/copy.json (GD-2). */
export const ARCHETYPES = copy.archetypes;
