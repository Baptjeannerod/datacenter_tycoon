/**
 * Storage: Upstash Redis when Vercel's Marketplace integration set the env vars,
 * otherwise an in-memory store (local dev, tests; lost on restart and not shared
 * between serverless instances, so production needs Redis).
 */
import { Redis } from '@upstash/redis';
import { applyOps, HASH_KEYS, KEYS, type Op, type Snapshot } from './aggregate.js';

export interface Store {
  kind: 'redis' | 'memory';
  apply(ops: Op[]): Promise<void>;
  snapshot(): Promise<Snapshot>;
}

const PREFIX = 'dt:';

function redisStore(redis: Redis): Store {
  return {
    kind: 'redis',
    async apply(ops) {
      const p = redis.pipeline();
      for (const o of ops) {
        if (o.op === 'sadd') p.sadd(PREFIX + o.key, o.member);
        else if (o.op === 'set') p.hset(PREFIX + o.key, { [o.field]: o.value });
        else if (Number.isInteger(o.by)) p.hincrby(PREFIX + o.key, o.field, o.by);
        else p.hincrbyfloat(PREFIX + o.key, o.field, o.by);
      }
      await p.exec();
    },
    async snapshot() {
      const p = redis.pipeline();
      for (const k of HASH_KEYS) p.hgetall(PREFIX + k);
      p.scard(PREFIX + KEYS.sessions);
      const res = (await p.exec()) as unknown[];
      const hashes: Snapshot['hashes'] = {};
      HASH_KEYS.forEach((k, i) => {
        const raw = (res[i] ?? {}) as Record<string, unknown>;
        hashes[k] = Object.fromEntries(Object.entries(raw).map(([f, v]) => [f, Number(v) || 0]));
      });
      return { hashes, sessions: Number(res[HASH_KEYS.length]) || 0 };
    },
  };
}

export function memoryStore(): Store {
  const state = { hashes: {} as Snapshot['hashes'], sessions: new Set<string>() };
  return {
    kind: 'memory',
    async apply(ops) {
      applyOps(state, ops);
    },
    async snapshot() {
      return { hashes: structuredClone(state.hashes), sessions: state.sessions.size };
    },
  };
}

let cached: Store | null = null;

export function getStore(env: Record<string, string | undefined> = process.env): Store {
  if (cached) return cached;
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  cached = url && token ? redisStore(new Redis({ url, token })) : memoryStore();
  return cached;
}
