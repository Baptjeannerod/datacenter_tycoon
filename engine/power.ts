/**
 * Power: there is no grid. Every MW your halls use comes from plants you built.
 * Plants deliver nameplate x capacity factor x location resource on average;
 * renewables swing around that average each quarter. Cheapest plants run first.
 */
import { derive, getBuilding, getLocation, getUpgrade } from './derive';
import type { Building, Content, DerivedStats, GameState, PlantEffects } from './types';

export interface PlantInfo {
  plot: number;
  building: Building;
  /** Average deliverable power, MW. */
  avgMW: number;
  /** € per MWh produced. */
  costPerMWh: number;
  /** kg CO2e per MWh. */
  carbonPerMWh: number;
  /** m³ per MWh. */
  waterPerMWh: number;
  /** ± share of output that varies each quarter. */
  variability: number;
  /** k€ per tick. */
  fixedCost: number;
}

function plantEffectsOf(upgradeIds: string[], content: Content): Required<PlantEffects> {
  const sum = { outputPct: 0, carbonPct: 0, costPct: 0, waterPct: 0, variabilityPct: 0 };
  for (const id of upgradeIds) {
    const pe = getUpgrade(content, id).plantEffects;
    if (!pe) continue;
    for (const k of Object.keys(sum) as (keyof typeof sum)[]) sum[k] += pe[k] ?? 0;
  }
  return sum;
}

export function plantInfos(state: GameState, content: Content, d: DerivedStats = derive(state, content)): PlantInfo[] {
  const loc = getLocation(content, state.locationId);
  const out: PlantInfo[] = [];
  state.plots.forEach((p, plot) => {
    if (!p) return;
    const b = getBuilding(content, p.building);
    if (b.kind !== 'plant') return;
    const pe = plantEffectsOf(p.upgrades, content);
    const resource = b.resource ? loc.resources[b.resource] : 1;
    out.push({
      plot,
      building: b,
      avgMW: (b.nameplateMW ?? 0) * (b.capacityFactor ?? 1) * resource * Math.max(0, 1 + pe.outputPct),
      costPerMWh: (b.costPerMWh ?? 0) * (b.fuel ? loc.fuelPrice * d.energyPriceMultiplier : 1) * Math.max(0, 1 + pe.costPct),
      carbonPerMWh: (b.carbonPerMWh ?? 0) * Math.max(0, 1 + pe.carbonPct),
      waterPerMWh: (b.waterPerMWh ?? 0) * Math.max(0, 1 + pe.waterPct),
      variability: (b.variability ?? 0) * Math.max(0, 1 + pe.variabilityPct),
      fixedCost: b.fixedCostPerTick ?? 0,
    });
  });
  return out;
}

/** Extra power drawn by installed upgrades (pumps, GPUs…), MW. */
export function upgradeDrawMW(state: GameState, content: Content): number {
  let draw = 0;
  for (const p of state.plots) for (const id of p?.upgrades ?? []) draw += getUpgrade(content, id).powerMW ?? 0;
  for (const id of state.policies) draw += getUpgrade(content, id).powerMW ?? 0;
  return draw;
}

/** Facility MW needed per MW of client load. */
export const mwPerLoad = (d: DerivedStats) => (1 - d.itEfficiency) * d.pue;

export interface PowerBudget {
  /** Average supply from all plants, MW. */
  supplyMW: number;
  /** Power needed to run every hall at full capacity, MW. */
  needMW: number;
  /** supply − need. Building a hall or an upgrade needs this much headroom. */
  spareMW: number;
}

export function powerBudget(state: GameState, content: Content, d: DerivedStats = derive(state, content)): PowerBudget {
  const supplyMW = plantInfos(state, content, d).reduce((a, p) => a + p.avgMW, 0);
  const needMW = state.capacityMW * mwPerLoad(d) + upgradeDrawMW(state, content);
  return { supplyMW, needMW, spareMW: supplyMW - needMW };
}

/** Merit order: cheapest plants first. Returns MW produced by each plant (same order as input). */
export function dispatch(plants: PlantInfo[], available: number[], demandMW: number): number[] {
  const order = plants.map((_, i) => i).sort((a, b) => plants[a].costPerMWh - plants[b].costPerMWh);
  const out = plants.map(() => 0);
  let left = demandMW;
  for (const i of order) {
    const take = Math.max(0, Math.min(available[i], left));
    out[i] = take;
    left -= take;
  }
  return out;
}

/** Expected carbon intensity (kg/MWh) of the power the campus would use on average. */
export function expectedIntensity(state: GameState, content: Content, d: DerivedStats = derive(state, content)): number {
  const plants = plantInfos(state, content, d);
  const need = Math.min(state.demandMW, state.capacityMW) * mwPerLoad(d) + upgradeDrawMW(state, content);
  const prod = dispatch(plants, plants.map((p) => p.avgMW), need);
  const total = prod.reduce((a, b) => a + b, 0);
  return total > 0 ? prod.reduce((a, mw, i) => a + mw * plants[i].carbonPerMWh, 0) / total : 0;
}
