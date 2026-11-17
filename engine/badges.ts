/**
 * Badges (GD-5): pure evaluation of content/badges.json against a finished run.
 * No UI, no randomness: same state, same badges.
 */
import type { Badge, BadgeRule, GameState, RunSummary } from './types';

/** "client:*:alternative" → matches "client:astro-gpt:alternative". */
export function matchDecision(pattern: string, decision: string): boolean {
  if (!pattern.includes('*')) return pattern === decision;
  const re = new RegExp(`^${pattern.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  return re.test(decision);
}

const count = (state: GameState, pattern: string) => state.decisions.filter((d) => matchDecision(pattern, d)).length;

export function ruleHolds(rule: BadgeRule, state: GameState, summary: RunSummary): boolean {
  const has = (p: string) => count(state, p) > 0;
  if (rule.decisionsAny && !rule.decisionsAny.some(has)) return false;
  if (rule.decisionsAll && !rule.decisionsAll.every(has)) return false;
  if (rule.decisionsNone && rule.decisionsNone.some(has)) return false;
  for (const [p, n] of Object.entries(rule.countGte ?? {})) if (count(state, p) < n) return false;
  if (rule.eventsFired && !rule.eventsFired.every((id) => state.firedEvents.includes(id))) return false;
  for (const [k, v] of Object.entries(rule.summaryGte ?? {})) if ((summary[k as keyof RunSummary] as number) < (v as number)) return false;
  for (const [k, v] of Object.entries(rule.summaryLte ?? {})) if ((summary[k as keyof RunSummary] as number) > (v as number)) return false;
  for (const [k, v] of Object.entries(rule.totalsGte ?? {})) if (state.totals[k as keyof GameState['totals']] < (v as number)) return false;
  for (const [k, v] of Object.entries(rule.totalsLte ?? {})) if (state.totals[k as keyof GameState['totals']] > (v as number)) return false;
  if (rule.archetypes && !rule.archetypes.includes(summary.archetype)) return false;
  if (rule.statuses && !rule.statuses.includes(summary.status)) return false;
  if (rule.locations && !rule.locations.includes(state.locationId)) return false;
  return true;
}

/** Badges earned in this run, in content order. */
export function earnedBadges(state: GameState, summary: RunSummary, badges: Badge[]): Badge[] {
  return badges.filter((b) => ruleHolds(b.rule, state, summary));
}
