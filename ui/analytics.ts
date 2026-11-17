/**
 * Fire-and-forget analytics (DEV-5). Sends anonymous events to POST /api/event.
 * Never throws, never awaits, never blocks the game: if the API is down, events are lost.
 * The only identifier is a random id kept in localStorage. Schema: api/README.md.
 */

const ENDPOINT = '/api/event';
const KEY = 'dt-session';

let memoryId: string | null = null;

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function sessionId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id || !/^[a-z0-9-]{8,64}$/i.test(id)) {
      id = randomId();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private mode or storage blocked: keep one id for this page load.
    return (memoryId ??= randomId());
  }
}

export type TrackType = 'visit' | 'run_start' | 'decision' | 'quiz_answer' | 'run_end' | 'rating';

export function track(type: TrackType, payload: Record<string, unknown> = {}): void {
  try {
    const body = JSON.stringify({ ...payload, type, sessionId: sessionId() });
    // sendBeacon survives page unloads; text/plain avoids a CORS preflight.
    if (typeof navigator !== 'undefined' && navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain' }))) return;
    void fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
  } catch {
    /* analytics must never break the game */
  }
}

let visited = false;
/** One `visit` per page load, even under React StrictMode's double effects. */
export function trackVisit(): void {
  if (visited) return;
  visited = true;
  track('visit');
}
