# AGENTS.md: start here (humans welcome too)

You are joining a one-day build (SMIC Day, CentraleSupélec, 17 Nov 2026) of **Datacenter Tycoon**, a mobile-first browser game about responsible digital practices. About 20 students and several AI agents work on this repo in parallel. Deadlines: **prototype 15:00 · cross-tests 16:30 · pitch 17:15**.

## 2-minute onboarding

1. Read this file, then skim `docs/GAME_DESIGN.md` §1-§4 and `docs/TASKS.md`.
2. Install and check everything works:
   ```bash
   npm install
   npm run check      # lint, typecheck, tests, content validation, catalog, balance sim
   npm run dev        # http://localhost:5173 (dev harness)
   ```
3. Pick an **unclaimed** task in `docs/TASKS.md` (or a GitHub issue with the same id). Claim it (see below). Branch, build, PR.
4. Before you stop: append to `docs/HANDOFF.md`.

## The one rule of the game design

**Responsible choices raise the scores but cost profit or growth. Greedy choices pay now and send the bill later.** No dominant strategy. `npm run sim` enforces this; if it fails after your change, fix your numbers, don't loosen the check (unless the team agrees and you write why in HANDOFF).

## Commands (all real, all in `package.json`)

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (the dev harness UI) |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (`engine/*.test.ts`) |
| `npm run validate:content` | JSON schema + cross-reference + design-rule checks on `/content` |
| `npm run docs:catalog` | Regenerate `docs/CONTENT_CATALOG.md` from `/content` |
| `npm run sim` | Balance simulation, 1000 runs per strategy; exit 1 if a design rule breaks (`-- --runs 200` for speed) |
| `npm run check` | Everything CI runs, except the build |

## Where things live

```
engine/        Pure TypeScript game logic. No DOM, no Math.random, no Date. Unit-tested.
  types.ts     THE contract. Content shapes, state, actions.
  game.ts      createGame, step, applyAction, currentDecision, shopUpgrades
  scoring.ts   Sustainability, Responsibility, legacy, archetype, summary
content/       All game data as JSON (+ schema/). Non-coders edit here.
ui/            React app. App.tsx is a DEV HARNESS to be replaced. tokens.css = design tokens.
scripts/       validate-content.ts, sim.ts, catalog.ts
dashboard/     /dashboard page (to build: DEV-7)
api/           Analytics endpoint (to build: DEV-5)
assets/        Light art (SVG preferred)
docs/          GAME_DESIGN, ARCHITECTURE, TASKS, HANDOFF, CONTENT_CATALOG (generated), sources/
```

## Claiming a task

- Edit `docs/TASKS.md`: set **Owner** to your name or agent id (e.g. `claude-agent-3`) and **Status** to `doing`. Commit that with your first change, or comment "taking this" on the GitHub issue first if you want to reserve it before coding.
- One owner per task. If a task is `doing` with an owner, do not take it; pick another or ask in the issue.
- Too big? Split it into `DEV-3a`, `DEV-3b` in TASKS.md and say so in the issue.

## Branches, commits, PRs

- Branch from up-to-date `main`: `<role>/<task-id>-<short-topic>`, e.g. `dev/DEV-2-cards`, `content/RES-2-quiz`, `agent/DEV-5-analytics`.
- Small commits, imperative messages: `feat(ui): decision card bottom sheet (DEV-2)`.
- PR title starts with the task id. Fill the template. CI must be green.
- **Never force-push `main`. Never rewrite shared history.** Rebase your own branch only if nobody else uses it; otherwise merge `main` into it.
- Agents: do not merge your own PR unless a human told you to.

## File ownership (stay in your lane)

| Area | Primary role | Notes |
|---|---|---|
| `engine/` | dev (engine) | Contract changes need a HANDOFF entry starting with **CONTRACT CHANGE** |
| `content/*.json` | game-design, research | Validate + sim before PR |
| `content/schema/`, `engine/types.ts` | dev (engine) | Change both together |
| `ui/` | dev (front), ux-ui | Tokens in `ui/tokens.css` belong to art + ux |
| `dashboard/`, `api/` | dev (data) | |
| `assets/` | art | SVG, small files |
| `docs/` | everyone | `CONTENT_CATALOG.md` is generated: never hand-edit |

Need a change outside your lane? Open an issue or leave a note in HANDOFF; don't silently edit.

## Do

- Keep the engine pure and deterministic. Add a test for every engine change.
- Put every player-facing number in `/content` with `source` and `confidence` (`high` = checked against a primary source; `approx` = order of magnitude from a named source; `illustrative` = game number).
- Keep the game frugal: no heavy libraries, no web fonts, SVG over PNG, no AI calls at runtime.
- Run `npm run check` before every PR.
- Update README/docs when you change commands or behaviour.

## Don't

- Don't show upgrade `family` (good/trap/tradeoff) to players before purchase.
- Don't invent precise statistics. If you can't source it, mark it `illustrative`.
- Don't collect personal data. Analytics use a random anonymous id only.
- Don't commit secrets, `.env` files, or the SMIC brief PDF (it lists students' names).
- Don't add dependencies without saying why in the PR.

## Definition of done

- [ ] `npm run check` passes and `npm run build` succeeds
- [ ] Works on a 375 px wide phone screen (if UI)
- [ ] Tests added or updated (if engine)
- [ ] `docs/TASKS.md` status updated; `docs/HANDOFF.md` entry appended
- [ ] README/docs updated if commands, contracts or behaviour changed

## Handing off

Append to `docs/HANDOFF.md` (template at the top): what you did, what's next, gotchas. If you stop mid-task, set the task back to `todo` with a note, or leave it `doing` with "paused, see HANDOFF".
