/**
 * Daily run (DEV-9): everyone gets the same campus and the same luck on a given day.
 * seed = seedFromString("YYYY-MM-DD") (the player's local date), the valley rotates
 * with the day, and the best legacy of the day is kept in localStorage.
 * Dates live in the UI on purpose: the engine never reads the clock.
 */
import { seedFromString, type Content } from '../engine';

export interface DailyRun {
  /** YYYY-MM-DD, local date. */
  date: string;
  seed: number;
  locationId: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function dailyRun(content: Content, now = new Date()): DailyRun {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const locations = content.locations.filter((l) => l.enabled);
  // Day number since 1970 (UTC midnight of the local date), so the rotation is the same for everyone that day.
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
  return { date, seed: seedFromString(date), locationId: locations[day % locations.length].id };
}

export const isDailyRun = (d: DailyRun, seed: number, locationId: string) => d.seed === seed && d.locationId === locationId;

const key = (date: string) => `dt-daily-best-${date}`;

export function dailyBest(date: string): number | null {
  try {
    const v = localStorage.getItem(key(date));
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

/** Keep the best legacy of the day. Returns true if it is a new best. */
export function saveDailyBest(date: string, legacy: number): boolean {
  const best = dailyBest(date);
  if (best !== null && best >= legacy) return false;
  try {
    localStorage.setItem(key(date), String(legacy));
  } catch {
    /* private mode */
  }
  return true;
}
