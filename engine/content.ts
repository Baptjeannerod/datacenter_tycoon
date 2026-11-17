/**
 * Loads every content file into one typed object. The JSON is validated
 * against /content/schema by `npm run validate:content` (and in CI), so at
 * runtime we trust it.
 */
import badges from '../content/badges.json';
import balance from '../content/balance.json';
import buildings from '../content/buildings.json';
import clients from '../content/clients.json';
import events from '../content/events.json';
import locations from '../content/locations.json';
import quiz from '../content/quiz.json';
import upgrades from '../content/upgrades.json';
import type { Badge, Balance, Building, Client, Content, GameEvent, Location, QuizQuestion, Upgrade } from './types';

export function loadContent(): Content {
  return {
    balance: balance as unknown as Balance,
    locations: locations as unknown as Location[],
    buildings: buildings as unknown as Building[],
    upgrades: upgrades as unknown as Upgrade[],
    events: events as unknown as GameEvent[],
    clients: clients as unknown as Client[],
    quiz: quiz as QuizQuestion[],
  };
}

/** Badges (GD-5) live outside Content: the game loop never reads them, only the end of a run. */
export function loadBadges(): Badge[] {
  return badges as unknown as Badge[];
}
