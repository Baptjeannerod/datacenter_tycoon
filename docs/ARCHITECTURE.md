# Architecture

> Static, frugal, content-driven. A pure TypeScript engine, a thin React UI, JSON content, and (to be built) one tiny analytics endpoint.

## Overview

```
                ┌────────────── /content (JSON, edited by non-coders) ──────────────┐
                │ balance · locations · upgrades · events · clients · quiz          │
                └──────────────┬───────────────────────────────┬────────────────────┘
                 validated by  │ scripts/validate-content.ts   │ imported by engine/content.ts
                 (schemas in content/schema)                    ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ /engine (pure TS, no DOM, no Math.random, no clock)                              │
│   types.ts       contracts shared by everyone                                    │
│   game.ts        createGame · step · applyAction · build/upgrade/policy options │
│   power.ts       plant output, merit-order dispatch, power budget (no grid)       │
│   derive.ts      stats from location + modifiers                                 │
│   scoring.ts     scores, legacy, archetype, end-of-run summary                   │
│   rng.ts         seeded PRNG (mulberry32), seedFromString for daily runs         │
│   strategies.ts  scripted players for the sim                                    │
└───────────────┬───────────────────────────────────┬──────────────────────────────┘
                │                                   │
        ┌───────▼────────┐                 ┌────────▼─────────┐
        │ /ui (React)    │                 │ scripts/sim.ts   │  npm run sim (CI gate)
        │ screens, map,  │                 │ scripts/catalog  │  npm run docs:catalog
        │ useGame hook   │                 └──────────────────┘
        └───────┬────────┘
                │ analytics events (TODO: DEV-5)
        ┌───────▼────────┐        ┌──────────────────┐
        │ /api (Vercel   │──────► │ storage (TBD,    │ ◄──── /dashboard page (TODO: DEV-7)
        │ function, TODO)│        │ DEV-5 decides)   │
        └────────────────┘        └──────────────────┘
```

## Contracts (change with care)

| Contract | File | Who depends on it |
|---|---|---|
| Content shapes | `engine/types.ts` + `content/schema/*.schema.json` | content authors, engine, validator, UI |
| Engine API | `engine/index.ts` exports | UI, sim, tests |
| Game state | `GameState` in `engine/types.ts` | UI (rendering, save/resume), analytics |
| Decision ids | `"upgrade:<id>"`, `"event:<id>:<choice>"`, `"client:<id>:<choice>"` in `state.decisions` | analytics, dashboard ("most chosen") |
| Analytics events | to be defined in DEV-5 (`api/README.md`) | UI, API, dashboard |

Changing a contract: update the type, the schema, the validator if needed, run `npm run check`, and add a line to `docs/HANDOFF.md` starting with **CONTRACT CHANGE**.

## Engine rules

1. **Pure functions.** `step(state, content)` and `applyAction(state, action, content)` return a new state (`structuredClone` inside) and never mutate their input. A test enforces this.
2. **Deterministic.** All randomness goes through `state.rng` (seeded). Same seed + same actions = same run. This powers "beat my score" links (`?seed=`), daily challenges (`seedFromString('2026-11-17')`), and the sim. ESLint forbids `Math.random` and `Date.now` in `engine/`.
3. **Time only moves in `step`.** A pending card (`state.queue[0]`) blocks `step`; the UI must resolve it with `applyAction`.
4. **Content is data.** The engine has no ids hard-coded except the `carbon-tax` flag and the `efficiency-gain` flag convention. New upgrades/events need no code.

### Using the engine from the UI

```ts
import { loadContent, createGame, step, applyAction, currentDecision, shopUpgrades, computeScores, summarize } from '../engine';

const content = loadContent();
let s = createGame({ seed: 42, locationId: 'paris-basin' }, content);
s = step(s, content);                                   // one quarter
const card = currentDecision(s, content);               // { kind: 'event' | 'client' | 'quiz', ... } or null
if (card?.kind === 'client') s = applyAction(s, { type: 'choose', choiceId: card.choices[0].id }, content);
if (card?.kind === 'quiz') s = applyAction(s, { type: 'answer', answerIndex: 1 }, content);
s = applyAction(s, { type: 'buy', upgradeId: 'free-cooling' }, content);   // no-op if not allowed
const { sustainability, responsibility } = computeScores(s, content);
if (s.status !== 'playing') console.log(summarize(s, content));            // legacy, archetype, gained/gaveUp
```

## Front-end

- Vite + React 19 + TypeScript, static build to `dist/`. No router yet: the dashboard is planned as a second Vite entry (`dashboard/index.html` → `/dashboard/`) so it stays static.
- Styling: plain CSS with **design tokens** in `ui/tokens.css` (palette from the team's campus template). No UI framework (frugal). One web font: Silkscreen (pixel display, headlines only) from Google Fonts; everything else uses system fonts.
- **Performance budget**: initial JS ≤ 100 kB gzip, total page ≤ 300 kB, images as inline SVG. Today: 103 kB gzip JS (React ≈ 60 kB, engine + content the rest), 5 kB CSS. Swapping to Preact (`preact/compat` alias) would cut ~50 kB (task DEV-12).

### UI structure

| File | Role |
|---|---|
| `ui/App.tsx` | Screen switch (start → game → end), how-to-play dialog, reads `?seed=&loc=` challenge links |
| `ui/useGame.ts` | Holds `GameState`, auto-advances one quarter every 2.6 s / speed, pauses on cards, keeps outcome and quiz feedback |
| `ui/screens/GameScreen.tsx` | Top bar, title + controls, KPI cards, map card, side panel (decision or quarter report), shop |
| `ui/screens/StartScreen.tsx`, `EndScreen.tsx` | Location picker; archetype, legacy, profit-vs-impact frontier (with scripted players as reference dots), gained/gave up, trap reveal, 1-10 rating, challenge link |
| `ui/components/DecisionPanel.tsx` | Cards (bottom sheet on phones) |
| `ui/components/RingMenu.tsx` | Radial build / upgrade / policy menu around the tapped plot (effect chips; never the family or the hidden bill) |
| `ui/map/layout.ts` | Isometric grid, river path, road, 8 land plots + the river spot, `campusView(state)` = what each plot shows |
| `ui/map/CampusMap.tsx` | The SVG campus: clickable plots, halls and plants drawn per plot, dam + reservoir, red "!" on halls without power, haze/smoke with debt, drag + zoom, positions the ring menu |

The map only reads state; it never changes the game. Adding a visual for a new upgrade = a flag in `campusView()` + a drawing in `CampusMap.tsx`.

## Backend (to build: DEV-5, DEV-7)

- One serverless function on Vercel: `POST /api/event` (append an anonymous event) and `GET /api/stats` (aggregates for the dashboard).
- Anonymous ids only: a random `sessionId` in `localStorage`, no cookies, no IP storage, no personal data.
- Storage: pick one in DEV-5 via the Vercel Marketplace (a Redis or Postgres integration). Until it exists, the client should no-op gracefully and the dashboard can read a local mock.
- Proposed events: `visit`, `run_start {seed, locationId}`, `decision {id}`, `quiz_answer {id, correct}`, `run_end {summary}`, `rating {value 1-10}`.

## CI (`.github/workflows/ci.yml`)

On every PR and push to `main`: install → lint → typecheck → unit tests → content validation → catalog freshness → balance sim (200 runs) → build. All must pass to merge.

## Deployment (to do: DEV-10)

Vercel, framework preset Vite, build `npm run build`, output `dist`. Preview deployment per PR.
