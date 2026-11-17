# /api: anonymous analytics (DEV-5)

Two Vercel Node functions. Logic lives in pure, tested modules under `_lib/`.

| Route | File | Does |
|---|---|---|
| `POST /api/event` | `event.ts` | Validate one event, turn it into counter writes, store. `204` on success, `400` invalid, `413` too large, `503` storage down. |
| `GET /api/stats` | `stats.ts` | Read the counters, return the `Stats` JSON used by `/dashboard/`. |

| Module | Role |
|---|---|
| `_lib/events.ts` | Event schema + `parseEvent` / `validateEvent` (pure) |
| `_lib/aggregate.ts` | `toOps(event)` → counter writes, `buildStats(snapshot)` → `Stats` (pure, tested in `aggregate.test.ts`) |
| `_lib/store.ts` | Upstash Redis store, or in-memory store when the env vars are missing |

## Privacy

- The only identifier is `sessionId`: a random UUID the browser keeps in `localStorage` (`dt-session`). No cookies, no IP, no user agent, no names.
- The API never reads request headers except `content-length`, and stores **counters only**, not raw events. Unknown fields are dropped; unknown types are rejected.

## Event schema

Every event is a JSON object, at most **2048 bytes**, sent as `text/plain` or `application/json`:

```ts
{ type, sessionId, ...fields }
```

- `sessionId`: `[A-Za-z0-9-]{8,64}`.
- Ids (`id`, `locationId`, `choiceId`): `[A-Za-z0-9][A-Za-z0-9_-]{0,63}`, the content ids from `/content`.

| `type` | Fields | Sent from |
|---|---|---|
| `visit` | none | `ui/App.tsx`, once per page load |
| `run_start` | `seed` (int ≥ 0), `locationId` | `useGame.start` |
| `decision` | `action: 'choose'`, `kind: 'event' \| 'client'`, `id`, `choiceId` | `useGame.choose` |
| | `action: 'answer'`, `id` (quiz question id) | `useGame.answer` |
| | `action: 'build'`, `id` (building id) | `useGame.act` |
| | `action: 'buy'`, `id` (upgrade id), `family: 'good' \| 'trap' \| 'tradeoff'` | `useGame.act` |
| `quiz_answer` | `id` (question id), `correct` (boolean) | `useGame.answer` |
| `run_end` | `seed`, `locationId`, `status: 'ended' \| 'bankrupt'`, `legacy` (0-5000), `sustainability`, `responsibility`, `impact` (0-100, final / time-averaged), `profitNorm` (0-1.5), `archetype`, `quizCorrect`, `quizAnswered` | `useGame`, once when a run stops (from `summarize()`) |
| `rating` | `seed`, `value` (int 1-10) | `EndScreen.rate`; re-rating the same run overwrites (one rating per session + seed) |

The family is sent by the client only for analytics; it is never shown to the player before purchase.

Example:

```bash
curl -X POST localhost:5173/api/event -d '{"type":"quiz_answer","sessionId":"test-0001","id":"q-pue","correct":false}'
curl localhost:5173/api/stats
```

## Storage

[Upstash Redis](https://vercel.com/marketplace/upstash) via `@upstash/redis`. Keys are prefixed `dt:`: hashes `counts`, `locations`, `choices`, `buildings`, `upgrades`, `quiz`, `runs`, `archetypes`, `statuses`, `ratings`, and the set `sessions` (unique visitors). Each event is one pipelined request; `/api/stats` is one pipelined read.

Env vars (added by Vercel when you connect Upstash from the Marketplace), first pair wins:

- `KV_REST_API_URL` + `KV_REST_API_TOKEN`, or
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.

Without them, an **in-memory store** is used: fine for `npm run dev` (the Vite dev server serves `/api` through a dev-only plugin in `vite.config.ts`), but on Vercel it would be per-instance and reset, and `/api/stats` reports `"storage": "memory"` (the dashboard shows a note).

To reset the numbers (e.g. after testing, before the event): delete the `dt:*` keys in the Upstash console (Data Browser).

## Stats shape

See `Stats` in `_lib/aggregate.ts`: `visitors` (unique session ids), `sessions` (visits), `runsStarted`, `runsEnded`, `quiz` (% right overall and per question, `mostFailed`), `ratings` (`count`, `mean`, `distribution[10]`), `scores` (average Sustainability / Responsibility / legacy / impact / profitNorm at run end), `archetypes`, `statuses`, `locations`, `buildings`, `upgrades.{good,trap,tradeoff}`, `choices` (top client / event answers).
