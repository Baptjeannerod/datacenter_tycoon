/**
 * POST /api/event: record one anonymous analytics event. Schema: api/README.md.
 * Accepts application/json or text/plain (navigator.sendBeacon). 204 on success.
 * The IP and headers are never read or stored.
 */
import { toOps } from './_lib/aggregate.js';
import { MAX_BODY_BYTES, parseEvent } from './_lib/events.js';
import { getStore } from './_lib/store.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function POST(request: Request): Promise<Response> {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return json(413, { error: 'body too large' });
  const raw = await request.text();
  const parsed = parseEvent(raw);
  if (!parsed.ok) return json(parsed.error === 'body too large' ? 413 : 400, { error: parsed.error });
  try {
    await getStore().apply(toOps(parsed.event));
  } catch (err) {
    console.error('event store failed', err);
    return json(503, { error: 'storage unavailable' });
  }
  return new Response(null, { status: 204 });
}

export function GET(): Response {
  return json(405, { error: 'use POST' });
}
