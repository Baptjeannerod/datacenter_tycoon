import type { Condition, GameState, StatKey } from './types';

/** Values readable by conditions. Kept in sync with StatKey in types.ts. */
export type StatReader = (key: StatKey) => number;

/** True when every field present in `cond` holds. Missing condition = always true. */
export function checkCondition(
  cond: Condition | undefined,
  state: GameState,
  readStat: StatReader,
): boolean {
  if (!cond) return true;
  if (cond.locations && !cond.locations.includes(state.locationId)) return false;
  if (cond.hasUpgrades && !cond.hasUpgrades.every((id) => state.owned.includes(id))) return false;
  if (cond.lacksUpgrades && cond.lacksUpgrades.some((id) => state.owned.includes(id))) return false;
  if (cond.flagsSet && !cond.flagsSet.every((f) => state.flags.includes(f))) return false;
  if (cond.flagsUnset && cond.flagsUnset.some((f) => state.flags.includes(f))) return false;
  if (cond.minTick !== undefined && state.tick < cond.minTick) return false;
  if (cond.maxTick !== undefined && state.tick > cond.maxTick) return false;
  if (cond.statGte) {
    for (const [key, value] of Object.entries(cond.statGte)) {
      if (readStat(key as StatKey) < (value as number)) return false;
    }
  }
  if (cond.statLte) {
    for (const [key, value] of Object.entries(cond.statLte)) {
      if (readStat(key as StatKey) > (value as number)) return false;
    }
  }
  return true;
}
