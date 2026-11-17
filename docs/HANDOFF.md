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
