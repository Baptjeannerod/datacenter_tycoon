/**
 * Player-facing copy (GD-2). All text lives in content/copy.json so game
 * designers and comms can edit it without touching components. Shape checked by
 * content/schema/copy.schema.json (`npm run validate:content`).
 */
import balance from '../content/balance.json';
import raw from '../content/copy.json';
import type { Archetype } from '../engine';

interface Score {
  label: string;
  tooltip: string;
}

export interface Copy {
  brand: { name: string; tagline: string; footer: string; footerNote: string };
  start: {
    headline: string;
    lead: string;
    points: string[];
    pickTitle: string;
    go: string;
    dailyTitle: string;
    dailyBody: string;
    dailyBest: string;
    dailyNone: string;
    challengeTitle: string;
    challengeBody: string;
    challengeButton: string;
  };
  /** GD-4: per location id. */
  locations: Record<string, { difficulty: string; level: 1 | 2 | 3; question: string; answer: string }>;
  intro: { eyebrow: string; reveal: string; start: string };
  onboarding: { text: string; icon: 'plus' | 'plant' | 'alert' | 'tax' | 'demolish' }[];
  howToPlay: { title: string; steps: { lead: string; text: string }[]; close: string };
  game: { subtitle: string; headlines: { maxHalls: number; text: string }[]; emptyReport: string; tapForInfo: string };
  scores: Record<'cash' | 'power' | 'sustainability' | 'responsibility' | 'envDebt' | 'legacy', Score>;
  debt: { min: number; label: string; hint: string; warnings: string[] }[];
  archetypes: Record<Archetype, { title: string; line: string; share: string }>;
  end: {
    tenYears: string;
    bankrupt: string;
    legacyFormula: string;
    gained: string;
    gaveUp: string;
    revealed: string;
    nothingBought: string;
    families: { good: string; trap: string; tradeoff: string };
    badges: string;
    noBadges: string;
    rateTitle: string;
    rateBody: string;
    share: string;
    shared: string;
    replay: string;
    otherValley: string;
  };
}

export const copy = raw as Copy;

/** Fill {placeholders}: fill('Best: {best}', { best: 12 }) → 'Best: 12'. */
export const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));

/** Vague debt level for a hidden envDebt value (never show the number). */
export const debtLevel = (envDebt: number) => [...copy.debt].reverse().find((d) => envDebt >= d.min) ?? copy.debt[0];

/** One of the level's vague warnings, changing every few quarters. */
export const debtWarning = (envDebt: number, tick: number) => {
  const w = debtLevel(envDebt).warnings;
  return w[Math.floor(tick / 3) % w.length];
};

export const headlineFor = (halls: number) => (copy.game.headlines.find((h) => halls <= h.maxHalls) ?? copy.game.headlines.at(-1)!).text;

/** Fill rule-driven placeholders in copy texts: {maxTicks}, {years}, {taxThreshold}. */
export function fillCopy(text: string): string {
  return text
    .replaceAll('{maxTicks}', String(balance.maxTicks))
    .replaceAll('{years}', String(balance.maxTicks / 4))
    .replaceAll('{taxThreshold}', String(balance.sustainabilityTaxThreshold));
}
