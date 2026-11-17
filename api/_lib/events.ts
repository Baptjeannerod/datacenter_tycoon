/**
 * Analytics event schema and validation. Pure: no I/O.
 * Anything that does not match the schema exactly is rejected, so the store
 * only ever holds short ids, booleans and bounded numbers. No personal data.
 * See api/README.md for the schema in prose.
 */

export const EVENT_TYPES = ['visit', 'run_start', 'decision', 'quiz_answer', 'run_end', 'rating'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const FAMILIES = ['good', 'trap', 'tradeoff'] as const;
export type Family = (typeof FAMILIES)[number];

export const ARCHETYPE_IDS = ['frugal-tycoon', 'planet-burner', 'cloud-monk', 'lost-in-the-fog'] as const;

/** Max raw body size accepted by POST /api/event, in bytes. */
export const MAX_BODY_BYTES = 2048;

export type AnalyticsEvent =
  | { type: 'visit'; sessionId: string }
  | { type: 'run_start'; sessionId: string; seed: number; locationId: string }
  | { type: 'decision'; sessionId: string; action: 'choose'; kind: 'event' | 'client'; id: string; choiceId: string }
  | { type: 'decision'; sessionId: string; action: 'answer'; id: string }
  | { type: 'decision'; sessionId: string; action: 'build'; id: string }
  | { type: 'decision'; sessionId: string; action: 'buy'; id: string; family: Family }
  | { type: 'quiz_answer'; sessionId: string; id: string; correct: boolean }
  | {
      type: 'run_end';
      sessionId: string;
      seed: number;
      locationId: string;
      status: 'ended' | 'bankrupt';
      legacy: number;
      sustainability: number;
      responsibility: number;
      impact: number;
      profitNorm: number;
      archetype: (typeof ARCHETYPE_IDS)[number];
      quizCorrect: number;
      quizAnswered: number;
    }
  | { type: 'rating'; sessionId: string; seed: number; value: number };

const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const SESSION = /^[a-z0-9-]{8,64}$/i;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const id = (v: unknown): string | null => (typeof v === 'string' && ID.test(v) ? v : null);
const num = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
const int = (v: unknown, min: number, max: number): number | null => {
  const n = num(v, min, max);
  return n !== null && Number.isInteger(n) ? n : null;
};
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | null => (list.includes(v as T) ? (v as T) : null);

export type ParseResult = { ok: true; event: AnalyticsEvent } | { ok: false; error: string };

/** Parse a raw request body (JSON text). Never throws. */
export function parseEvent(raw: string): ParseResult {
  if (raw.length > MAX_BODY_BYTES) return { ok: false, error: 'body too large' };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid JSON' };
  }
  return validateEvent(data);
}

export function validateEvent(data: unknown): ParseResult {
  if (!isObj(data)) return { ok: false, error: 'expected an object' };
  const type = oneOf(data.type, EVENT_TYPES);
  if (!type) return { ok: false, error: 'unknown type' };
  const sessionId = typeof data.sessionId === 'string' && SESSION.test(data.sessionId) ? data.sessionId : null;
  if (!sessionId) return { ok: false, error: 'invalid sessionId' };
  const fail = (field: string): ParseResult => ({ ok: false, error: `invalid ${field}` });

  switch (type) {
    case 'visit':
      return { ok: true, event: { type, sessionId } };
    case 'run_start': {
      const seed = int(data.seed, 0, 2 ** 32);
      const locationId = id(data.locationId);
      if (seed === null) return fail('seed');
      if (!locationId) return fail('locationId');
      return { ok: true, event: { type, sessionId, seed, locationId } };
    }
    case 'decision': {
      const action = oneOf(data.action, ['choose', 'answer', 'build', 'buy'] as const);
      const did = id(data.id);
      if (!action) return fail('action');
      if (!did) return fail('id');
      if (action === 'choose') {
        const kind = oneOf(data.kind, ['event', 'client'] as const);
        const choiceId = id(data.choiceId);
        if (!kind) return fail('kind');
        if (!choiceId) return fail('choiceId');
        return { ok: true, event: { type, sessionId, action, kind, id: did, choiceId } };
      }
      if (action === 'buy') {
        const family = oneOf(data.family, FAMILIES);
        if (!family) return fail('family');
        return { ok: true, event: { type, sessionId, action, id: did, family } };
      }
      return { ok: true, event: { type, sessionId, action, id: did } };
    }
    case 'quiz_answer': {
      const qid = id(data.id);
      if (!qid) return fail('id');
      if (typeof data.correct !== 'boolean') return fail('correct');
      return { ok: true, event: { type, sessionId, id: qid, correct: data.correct } };
    }
    case 'run_end': {
      const seed = int(data.seed, 0, 2 ** 32);
      const locationId = id(data.locationId);
      const status = oneOf(data.status, ['ended', 'bankrupt'] as const);
      const legacy = num(data.legacy, 0, 5000);
      const sustainability = num(data.sustainability, 0, 100);
      const responsibility = num(data.responsibility, 0, 100);
      const impact = num(data.impact, 0, 100);
      const profitNorm = num(data.profitNorm, 0, 1.5);
      const archetype = oneOf(data.archetype, ARCHETYPE_IDS);
      const quizCorrect = int(data.quizCorrect, 0, 1000);
      const quizAnswered = int(data.quizAnswered, 0, 1000);
      const fields = { seed, locationId, status, legacy, sustainability, responsibility, impact, profitNorm, archetype, quizCorrect, quizAnswered };
      for (const [k, v] of Object.entries(fields)) if (v === null) return fail(k);
      return {
        ok: true,
        event: {
          type,
          sessionId,
          seed: seed!,
          locationId: locationId!,
          status: status!,
          legacy: legacy!,
          sustainability: sustainability!,
          responsibility: responsibility!,
          impact: impact!,
          profitNorm: profitNorm!,
          archetype: archetype!,
          quizCorrect: quizCorrect!,
          quizAnswered: quizAnswered!,
        },
      };
    }
    case 'rating': {
      const seed = int(data.seed, 0, 2 ** 32);
      const value = int(data.value, 1, 10);
      if (seed === null) return fail('seed');
      if (value === null) return fail('value');
      return { ok: true, event: { type, sessionId, seed, value } };
    }
  }
}
