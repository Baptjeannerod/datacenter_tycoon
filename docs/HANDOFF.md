# Handoff log

> **Append-only.** Newest entry at the bottom. Never edit or delete someone else's entry.
> Template:
>
> ```
> ## YYYY-MM-DD HH:MM · <name or agent id> · <task ids>
> **Done:** what changed (files, PR link)
> **Next:** what should happen next, and who it unblocks
> **Gotchas:** anything surprising; start a line with CONTRACT CHANGE if you changed engine/types.ts, a schema, or an API shape
> ```

## 2026-11-17 11:50 · claude-opus (bootstrap agent) · bootstrap

**Done:**
- Repo scaffold: Vite + React 19 + TypeScript 6, ESLint, Vitest, tsx. Node ≥ 22.12.
- `engine/`: contracts (`types.ts`), pure game loop (`game.ts`), derived stats (`derive.ts`), scoring and end-of-run summary (`scoring.ts`), seeded RNG (`rng.ts`), scripted strategies (`strategies.ts`). 26 unit tests.
- `content/`: 4 locations, 22 upgrades (12 good / 7 trap / 3 tradeoff), 16 events, 9 clients, 12 quiz questions. JSON schemas in `content/schema/`, validator `npm run validate:content` (schemas + cross-references + design rules such as "a trap needs an upside and a hidden cost").
- `npm run sim`: headless balance simulation with 5 strategies × 4 locations; exits 1 if a design rule breaks. All rules pass (see `docs/GAME_DESIGN.md` §7).
- `ui/App.tsx`: a **dev harness**, not the final UI. Plays a full run on a 375 px viewport, checked in the browser with no console errors. Design tokens in `ui/tokens.css`.
- Docs: README, AGENTS.md, CONTRIBUTING, GAME_DESIGN, ARCHITECTURE, TASKS, generated CONTENT_CATALOG, sources. CI workflow, issue and PR templates, CODEOWNERS.

**Next:**
- P0 tasks in `docs/TASKS.md` need owners now (CO-2). The critical path to 15:00 is DEV-1 → DEV-2/3 → DEV-4, in parallel with DEV-5 → DEV-7 and DEV-10.
- Repo admin: enable branch protection on `main` (CO-1). Until then, please still use PRs.
- Researchers: RES-1 (verify `approx` facts) before the pitch.

**Gotchas:**
- Balance was tuned in three passes. The first pass had runaway greedy growth (45 MW by year 10) and scores pinned at 100. Fixed with a logistic market ceiling (`marketMW`), debt-driven churn, diminishing returns on Responsibility, and trust drift toward 50. Any content change can break the sim; run `npm run sim` before pushing balance changes.
- Never show upgrade `family` to players before purchase; that would make the game trivial.
- `docs/CONTENT_CATALOG.md` is generated. Edit JSON, then `npm run docs:catalog`. CI fails if it is stale.
- The `carbon-tax` flag and the `efficiency-gain` flag are conventions the content relies on (carbon pricing; arming the rebound event).
- In Coal Valley and Sun Belt the balanced player out-earns the greedy one over a full run (green pays once carbon/water are priced). Intended as an "it depends" lesson, but watch it in playtests.
- The SMIC brief PDF is not committed (it lists student names). The AFNOR summary is linked, not copied.

## 2026-11-17 12:25 · claude-opus (bootstrap agent) · DEV-1, DEV-2, DEV-3, DEV-4, ART-2

**Done:** Playable vertical slice in the team's campus-template style (branch `agent/DEV-1-vertical-slice-ui`):
- Start screen (pick one of 4 valleys, challenge banner for `?seed=&loc=` links), game screen, end screen, how-to-play dialog.
- `ui/map/`: isometric SVG campus that takes most of the screen. A river with a bridge and a waterfall crosses it (it shrinks to sandbanks when water is overused). 8 hall plots: built halls follow capacity, empty plots show room to grow, the next plot shows the MW at which it is built (the campus crosses the river at hall 5). Upgrades appear on the map: solar field, wind turbines, cooling towers / tanks / fans, water-loop tanks, gas turbines with smoke, heat pipe to the village, GPU sign. Haze and smoke grow with hidden debt; outages flash. Biome per location (green, snowy, dull coal country with a smoking plant, desert with cacti). Drag + zoom; phones crop the sides and let you drag.
- Auto-advance (2.6 s per quarter, 1×/2×/3×, pause), cards in the side panel (bottom sheet on phones), outcome feedback with deltas, quiz with seeded answer shuffle + explanation + source, shop with honest effect chips (hidden bill stays hidden), end screen with frontier and reference dots for scripted players, trap reveal, 1-10 rating (localStorage only), challenge link via Web Share or clipboard.
- Tested at 1440×900 and 375×812, full runs in Paris, Sun Belt and Coal Valley, no runtime errors.

**Next:**
- DEV-5/DEV-6: send `rating` and the other analytics events (see the TODO in `ui/screens/EndScreen.tsx`).
- GD-2: player copy currently lives in code (`ui/format.ts` ARCHETYPES and DEBT_LABEL, headlines in `GameScreen.tsx`, how-to-play in `App.tsx`). Move it to `content/copy.json`.
- ART-1/ART-2: restyle freely; palette is in `ui/tokens.css` (and mirrored as literals in `ui/map/CampusMap.tsx` for SVG fills).
- DEV-12: JS is 103 kB gzip, just over budget; Preact alias is the fix.

**Gotchas:**
- The pixel font (Silkscreen) is loaded from Google Fonts: one exception to "no web fonts", headlines only.
- The map is pure presentation: `campusView(state, location, wue)` in `ui/map/layout.ts` decides what to draw. Keep game rules in `/engine`.
- Upgrade cards never show `family` or `envDebtPerTick`/`delayed`; the end screen reveals the family.

## 2026-11-17 12:35 · claude-opus (bootstrap agent) · DEV-10

**Done:** Production deploy on Vercel: **https://datacenter-tycoon-plum.vercel.app** (project `datacenter-tycoon` in the Encore team, Vite preset, build `npm run build`, output `dist`). Public (no login wall); challenge links work (`?seed=42&loc=sun-belt`). Played a run on the live site: no runtime errors, pixel font loads. Quiz questions now use the normal bold font (the pixel font was hard to read for long sentences).

**Next:**
- Auto-deploy is **not** set up: today a new version goes live only with `vercel deploy --prod` from a linked checkout. Connecting the GitHub repo in Vercel (Project → Settings → Git) would deploy every push to `main` and give each PR a preview URL. Needs the Vercel GitHub app to have access to this repo.
- COM-2: the URL is ready for the QR code and posts.
- DEV-5/DEV-7: the analytics API will live in the same Vercel project.

**Gotchas:**
- `vercel link` writes `.vercel/` and `.env.local` (with a short-lived token). Both are git-ignored; never commit them.
- It is a static site: no serverless functions yet, so there are no runtime logs to scan.

## 2026-11-17 13:25 · claude-opus (bootstrap agent) · build-on-plots (requested by the team)

**Done (branch `agent/build-on-plots`):**
- **Build on the map.** 8 land plots + 1 river spot. Tap an empty plot: ring menu with a datacenter hall or a plant (gas, coal, biomass, wind, solar; dam on the river spot only). Tap a built plot: ring of upgrades for that building. Campus-wide policies behind a **Policies** button. The bottom shop is gone. Time pauses while a ring is open.
- **No grid.** `engine/power.ts`: plants deliver nameplate × capacity factor × location resource (wind / sun / river) on average, renewables swing each quarter, cheapest plants run first. Halls need `2 MW × PUE` of spare power to be built; power-hungry upgrades need spare power too. Short of power → the last halls go dark, lose revenue, and show a **red "!"** on the map.
- **Content:** new `content/buildings.json` (7 buildings, IPCC life-cycle emission medians); upgrades now have `scope` (9 hall, 11 plant, 9 policies) and optional `powerMW` / `plantEffects`; locations have `resources` and `fuelPrice` instead of grid carbon and energy price. Schemas, validator and catalog updated.
- **Engine:** hall upgrades are per hall (intensive effects like PUE averaged over halls); servers age per hall; start = 1 hall + 1 gas plant.
- **Balance:** demand grows faster so land is scarce (energy density matters). `npm run sim` passes all rules in all four valleys (table in GAME_DESIGN §7). One rule relaxed: greedy must out-earn *virtuous* in the first half (in the Sun Belt solar beats coal even early).
- 33 engine tests; checked in the browser at 1440×900 and 375×812 (ring, build flow, power gating, red "!").

**Next:**
- Playtest the new loop (GD-1): is the first minute clear? Is building a plant before a hall obvious enough? Maybe an onboarding hint: "Tap a plot".
- Balanced now out-earns greedy everywhere over a full run (see GAME_DESIGN §11).
- No demolish / replace action yet: a coal plant stays forever. A "Demolish" option in the plant ring would be a good next step.

**Gotchas:**
- CONTRACT CHANGE: `Location` lost `gridCarbon` / `energyPrice` (now `resources`, `fuelPrice`); `Balance` lost `capexPerMW` (now `landPlots`, `startBuildings`); `Upgrade` gained `scope`; `GameState` gained `plots` and `policies`; `Action` gained `build` and `buy.plot`; `TickReport` gained `supplyMW`, `needMW`, `unpoweredPlots`, `carbonIntensity`.
- `shopUpgrades()` is gone: use `buildOptions`, `upgradeOptions`, `policyOptions` (each returns ok + reason).

## 2026-11-17 14:40 · claude-agent (DEV-5/6/7) · DEV-5, DEV-6, DEV-7

**Done:**
- `api/`: `POST /api/event` and `GET /api/stats` (Vercel Node functions, Web `Request`/`Response`). Strict validation in `api/_lib/events.ts` (6 whitelisted types, 2 KB max, unknown fields dropped). Events become counters (`toOps`) and counters become stats (`buildStats`) in the pure `api/_lib/aggregate.ts`, 10 tests (`api/**` added to `vitest.config.ts`). Storage: Upstash Redis (`@upstash/redis`, new dependency) when `KV_REST_API_*` or `UPSTASH_REDIS_REST_*` are set, in-memory otherwise. Schema in `api/README.md`.
- `ui/analytics.ts`: `track()` fire-and-forget (sendBeacon, else fetch keepalive), random id in localStorage. Hooked in `App.tsx` (visit), `useGame.ts` (run_start, decision, quiz_answer, run_end) and `EndScreen.tsx` (`rate` only + a "Live dashboard" link at the bottom).
- `/dashboard/`: second Vite entry, refresh every 30 s, demo data with a loud banner if the API is down. Checked at 375 px (no horizontal scroll) and desktop.
- `vite.config.ts`: dashboard build input + a dev-only plugin serving `/api` from `npm run dev`.

**Next:**
- **Project owner (Vercel):** connect Upstash Redis (Storage / Marketplace → Upstash Redis → Connect to datacenter-tycoon), then redeploy. Until then `/api/stats` reports `"storage": "memory"` and numbers do not persist. Steps in the PR description.
- After testing, before the public session: wipe `dt:*` keys in the Upstash Data Browser so test runs don't count.
- Nice to have: per-IP-free rate limiting (e.g. Upstash Ratelimit keyed by sessionId) if someone spams the endpoint.

**Gotchas:**
- CONTRACT CHANGE (new API shape): analytics events (`api/_lib/events.ts`) and the `Stats` JSON (`api/_lib/aggregate.ts`). Content ids must stay `[a-z0-9_-]` (all current ids do) or their events are rejected.
- API files import siblings with `.js` extensions (`./_lib/store.js`): required by Node ESM on Vercel, resolved to `.ts` by TypeScript/Vite. Keep it that way.
- Ratings: one per (session, seed); re-rating overwrites. A challenge link with a non-integer seed sends events that get rejected (harmless).

## 2026-11-17 14:20 · claude-agent (onboarding-demolish-share) · UX-2, DEV-8, DEV-9 + demolish

**Done (branch `agent/onboarding-demolish-share`):**
- **UX-2 first-run hints** (`ui/components/Onboarding.tsx`): three bubbles at the bottom of the map: "Tap a plot to build" (empty plots blink), "Halls need power: build a plant first", "A red ! means a hall has no power". Next / Skip, shown once (`localStorage['dt-onboarded']`). Time is held while a hint is up through a new `hold` flag in `useGame` (the pause button is not touched). Tapping a plot during hint 1 counts as doing it; hint 2 shows when the ring closes. Hints hide while a ring or a card is open.
- **Demolish**: engine action `{ type: 'demolish', plot }` and `demolishOption(state, content, plot)` (ok, cost, reason). Removes the building, its upgrades and their persistent modifiers (`plot:<n>:building`, `plot:<n>:<upgradeId>`), recomputes capacity, refreshes `owned`. Fee = `balance.demolishCostPct` (0.1) × building price, no refund. Already scheduled delayed effects and earned score deltas stay (you can't demolish your way out of a bill). The only hall can't be demolished. "Demolish" is the last item of a built plot's ring (red), confirmed in the ring centre like other options. 8 new tests in `engine/game.test.ts`; the brownout test now uses a real demolish.
- **DEV-8 share card** (`ui/share/`): 1080×1350 canvas card (paper + dot grid, ink borders, Silkscreen, amber legacy panel, mini frontier with YOU dot, profit and impact tiles, challenge link band). `shareResultCard()` uses `navigator.share({ files })` when `canShare` allows it, else downloads the PNG and copies text + link. In `EndScreen.tsx` only `share` and its button changed (label "Share my result" → "Image saved · link copied!").
- **DEV-9 daily run** (`ui/daily.ts`, StartScreen, App): seed = `seedFromString("YYYY-MM-DD")` (local date), valley = enabled locations rotated by day number, best legacy per day in `localStorage['dt-daily-best-<date>']`, shown on the start screen. 3 tests in `ui/daily.test.ts`.
- Docs: README, ARCHITECTURE, GAME_DESIGN §3, TASKS (UX-2, DEV-8, DEV-9 → review).
- Tested in the browser at 375×812 and 1440×900: hints (next, skip, tap-to-advance, time held), demolish on a plant (power drops, feedback) and blocked on the only hall, full daily run to the end screen, best saved and shown, share fallback (download + copy). No console errors after a clean reload.

**Next:**
- Test the native share sheet on a real iPhone and Android (the in-app browser has no Web Share). If iOS refuses because the gesture expired while the card was drawn, pre-render the card when the end screen mounts.
- ART-3: the card layout is code in `ui/share/card.ts` (one function, colours mirrored from `tokens.css`); restyle freely.
- Link previews: static `public/og.png` (1200×630) + `og:image` / `twitter:image` tags in `index.html` (absolute URL on the Vercel domain). It is drawn by `ui/share/og.ts` (not imported by the app); to regenerate, run `npm run dev` and paste `(await import('/ui/share/og.ts')).downloadOgImage()` in the browser console. If the domain changes, update the URLs in `index.html`.
- The strategies in `engine/strategies.ts` never demolish, so the sim is unchanged (no balance change). A "replace coal by wind at year 5" strategy would be a nice sim tripwire for GD-3.
- Daily run: the best score is local only. A `daily` flag on `run_end` would allow a daily leaderboard on `/dashboard`.
- Analytics (owner of DEV-5): demolitions are **not tracked**. `api/_lib/events.ts` rejects unknown `decision` actions, so `useGame.act()` skips them. To track them, add `'demolish'` to the accepted actions and send `{ action: 'demolish', id: buildingId }` from `act()`.

**Gotchas:**
- CONTRACT CHANGE: `Action` gained `{ type: 'demolish'; plot: number }`; `Balance` gained `demolishCostPct` (required in `content/schema/balance.schema.json`, set to 0.1 in `content/balance.json`); `engine/index.ts` exports `demolishOption` and `DemolishOption`. `useGame` returns `hold` / `setHold`, and `act()` accepts the demolish action.
- `CampusMap` gained an `overlay` prop (anything floating over the map); the "Drag to explore" hint hides while an overlay is shown.
- Dev only: editing `App.tsx` while a run is open makes React log a hooks-order error from hot reload. Reload the page; it is not a bug in the build.

## 2026-11-17 14:58 · claude-agent (DEV-5/6/7) · DEV-5, DEV-6, DEV-7 done

**Done:**
- PR 42 merged. Upstash Redis (region us-east-1, same as Vercel's default function region `iad1`) connected to the `datacenter-tycoon` project for Production + Preview (`KV_REST_API_URL` / `KV_REST_API_TOKEN` set).
- Deployed `main` (dd91e83, includes PR 41) to production at 14:52 with `vercel deploy --prod` (scope `encore23`), after a preview deploy. Live: `/api/stats` reports `"storage":"redis"`, `/dashboard/` shows "Live", `visit` and `run_start` events from the live game land in Redis, an invalid event gets 400.
- `docs/TASKS.md`: DEV-5/6/7 → done. README status updated.

**Next:**
- Before the 16:30 cross-tests: delete the `dt:*` keys in Upstash → Data Browser so test traffic does not count.
- Still deploy manually after each merge (`vercel deploy --prod --scope encore23` from up-to-date `main`); Vercel is not connected to GitHub.

**Gotchas:**
- Phones that had the game open before a deploy keep the old bundle until reloaded: their events are not sent. Reload before testing.
- Preview deployments are behind Vercel Authentication; use `vercel curl <url>/api/stats` to read them. Preview and Production share the same Redis database.
