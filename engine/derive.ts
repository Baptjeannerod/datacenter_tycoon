import type {
  Content,
  DerivedStats,
  Effects,
  GameState,
  Location,
  Modifier,
  Upgrade,
  ContextOverride,
} from './types';

export const PERSISTENT_KEYS = [
  'pue',
  'wue',
  'renewableShare',
  'growthRate',
  'growthCap',
  'failureRate',
  'cashPerTick',
  'envDebtPerTick',
  'pricePct',
  'energyPricePct',
  'itEfficiency',
  'hardwareLifespan',
  'eWasteFactor',
  'carbonIntensity',
] as const satisfies readonly (keyof Effects)[];

export const ONE_OFF_KEYS = ['cash', 'demandPct', 'envDebt'] as const satisfies readonly (keyof Effects)[];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getLocation(content: Content, id: string): Location {
  const loc = content.locations.find((l) => l.id === id);
  if (!loc) throw new Error(`Unknown location "${id}"`);
  return loc;
}

export function getUpgrade(content: Content, id: string): Upgrade {
  const up = content.upgrades.find((u) => u.id === id);
  if (!up) throw new Error(`Unknown upgrade "${id}"`);
  return up;
}

/** Location overrides REPLACE base values for the keys they give. */
export function resolveUpgrade(
  upgrade: Upgrade,
  locationId: string,
): { effects: Effects; scoreDelta: Upgrade['scoreDelta']; note?: string } {
  const override: ContextOverride | undefined = upgrade.contextModifiers?.[locationId];
  return {
    effects: { ...upgrade.effects, ...(override?.effects ?? {}) },
    scoreDelta: { ...upgrade.scoreDelta, ...(override?.scoreDelta ?? {}) },
    note: override?.note,
  };
}

/** Only the persistent keys of an effect bundle (what becomes a modifier). */
export function persistentPart(effects: Effects): Effects {
  const out: Effects = {};
  for (const key of PERSISTENT_KEYS) {
    if (effects[key] !== undefined) out[key] = effects[key];
  }
  return out;
}

export function isActive(mod: Modifier, tick: number): boolean {
  return mod.expiresAt === undefined || tick < mod.expiresAt;
}

/** Sum of every active modifier, plus the tightest growth cap. */
export function sumModifiers(modifiers: Modifier[], tick: number): Required<Omit<Effects, 'growthCap' | 'cash' | 'demandPct' | 'envDebt'>> & { growthCap: number } {
  const total = {
    pue: 0,
    wue: 0,
    renewableShare: 0,
    growthRate: 0,
    growthCap: Infinity,
    failureRate: 0,
    cashPerTick: 0,
    envDebtPerTick: 0,
    pricePct: 0,
    energyPricePct: 0,
    itEfficiency: 0,
    hardwareLifespan: 0,
    eWasteFactor: 0,
    carbonIntensity: 0,
  };
  for (const mod of modifiers) {
    if (!isActive(mod, tick)) continue;
    const e = mod.effects;
    total.pue += e.pue ?? 0;
    total.wue += e.wue ?? 0;
    total.renewableShare += e.renewableShare ?? 0;
    total.growthRate += e.growthRate ?? 0;
    if (e.growthCap !== undefined) total.growthCap = Math.min(total.growthCap, e.growthCap);
    total.failureRate += e.failureRate ?? 0;
    total.cashPerTick += e.cashPerTick ?? 0;
    total.envDebtPerTick += e.envDebtPerTick ?? 0;
    total.pricePct += e.pricePct ?? 0;
    total.energyPricePct += e.energyPricePct ?? 0;
    total.itEfficiency += e.itEfficiency ?? 0;
    total.hardwareLifespan += e.hardwareLifespan ?? 0;
    total.eWasteFactor += e.eWasteFactor ?? 0;
    total.carbonIntensity += e.carbonIntensity ?? 0;
  }
  return total;
}

/** Everything the simulation needs this tick, from location + balance + active modifiers. */
export function derive(state: GameState, content: Content): DerivedStats {
  const b = content.balance;
  const loc = getLocation(content, state.locationId);
  const m = sumModifiers(state.modifiers, state.tick);

  const hardwareLifespan = Math.max(4, b.baseHardwareLifespan + m.hardwareLifespan);
  const agingTicks = Math.max(0, state.hardwareAge - 0.75 * hardwareLifespan);
  const renewableShare = clamp(m.renewableShare, 0, 1);
  const gridCarbon = Math.max(0, loc.gridCarbon + m.carbonIntensity);

  return {
    pue: Math.max(b.minPue, loc.basePue + m.pue),
    wue: Math.max(0, loc.baseWue + m.wue),
    renewableShare,
    growthRate: Math.max(-0.15, Math.min(loc.baseGrowth + m.growthRate, m.growthCap)),
    failureRate: clamp(b.baseFailureRate + m.failureRate + agingTicks * b.agingFailurePerTick, 0, 0.6),
    cashPerTick: m.cashPerTick,
    envDebtPerTick: m.envDebtPerTick,
    priceMultiplier: Math.max(0.2, 1 + m.pricePct),
    energyPriceMultiplier: Math.max(0.2, 1 + m.energyPricePct),
    itEfficiency: clamp(m.itEfficiency, 0, 0.6),
    hardwareLifespan,
    eWasteMultiplier: Math.max(0.1, 1 + m.eWasteFactor),
    effectiveCarbon: gridCarbon * (1 - renewableShare),
    carbonPrice: state.flags.includes('carbon-tax') ? b.carbonPriceWhenTaxed : 0,
  };
}
