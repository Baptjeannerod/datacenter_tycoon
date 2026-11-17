/** GET /api/stats: aggregates for /dashboard. Shape: `Stats` in api/_lib/aggregate.ts. */
import { buildStats } from './_lib/aggregate.js';
import { getStore } from './_lib/store.js';

export async function GET(): Promise<Response> {
  try {
    const store = getStore();
    const stats = buildStats(await store.snapshot(), store.kind);
    return new Response(JSON.stringify(stats), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  } catch (err) {
    console.error('stats failed', err);
    return new Response(JSON.stringify({ error: 'storage unavailable' }), { status: 503, headers: { 'content-type': 'application/json' } });
  }
}
