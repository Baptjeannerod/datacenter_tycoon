# Task board

> **How to claim:** put your name (or agent id, e.g. `claude-agent-2`) in **Owner** and set **Status** to `doing`, in the same PR as your first commit, or comment "taking this" on the matching GitHub issue. One owner per task. Finished = `done` + a line in `docs/HANDOFF.md`.
>
> **Priorities:** P0 = needed for the 15:00 prototype · P1 = before cross-tests 16:30 · P2 = nice to have before pitches 17:15.
> **Status values:** `todo` · `doing` · `review` · `done` · `cut`.
> Each task is also a GitHub issue with the same id in its title. The issue is the place for discussion; this file is the summary.

## Already done (bootstrap, 17 Nov 11:00-12:00)

- [x] Game design, scoring formulas, economy: `docs/GAME_DESIGN.md`
- [x] Content: 4 locations, 22 upgrades, 16 events, 9 clients, 12 quiz questions, with schemas and validator
- [x] Pure engine with 26 unit tests; seeded runs; balance sim with design-rule gates (all passing)
- [x] Dev harness UI (plays a full run on mobile), design tokens, CI, docs

---

## dev

### DEV-1 · P0 · Game screen: HUD and auto-advancing quarters
- **Role:** dev · **Owner:** claude-opus (bootstrap agent) · **Status:** done (PR 38) · **Depends on:** UX-1 (can start before)
- **Goal:** Replace the harness `Game` view with the real mobile screen: top HUD (cash, last quarter, Sustainability, Responsibility, year/quarter), datacenter area, a timer that calls `step()` every ~4 s and pauses while a card is open, a speed-up button.
- **Done when:** a full run plays on a 375 px screen with no scrolling needed for the HUD; time stops on every card; no console errors.
- **Files:** `ui/` (new components), keep `engine/` untouched.

### DEV-2 · P0 · Decision cards (client, event, quiz)
- **Role:** dev · **Owner:** claude-opus (bootstrap agent) · **Status:** done · **Depends on:** DEV-1
- **Goal:** Bottom-sheet card for `currentDecision()`. Clients and events show title, body, choices with `hint`; after choosing, show `outcome` for ~1.5 s with floating score/money deltas. Quiz shows answers (shuffle order with the run seed), then the `explanation` and right/wrong.
- **Done when:** every card type in the slice can be answered with one thumb; the outcome text is visible before the next tick.

### DEV-3 · P0 · Upgrade shop
- **Role:** dev · **Owner:** claude-opus (bootstrap agent) · **Status:** done · **Depends on:** DEV-1
- **Goal:** Shop drawer listing `shopUpgrades()` with name, pitch, cost, location note (`resolveUpgrade().note`), disabled when `!canBuy()`. After buying, show `whyItMatters` once.
- **Done when:** buying works mid-run; **family (good/trap/tradeoff) is never shown before purchase**.

### DEV-4 · P0 · End screen: frontier, archetype, gained / gave up
- **Role:** dev · **Owner:** claude-opus (bootstrap agent) · **Status:** done · **Depends on:** DEV-1
- **Goal:** From `summarize()`: archetype title + one-liner (copy from GD-2), legacy score, an SVG plot with profit (x) vs impact (y) and the player's dot (plus faint dots for the 4 sim strategies as reference), "what you gained / what you gave up", and the reveal of each owned upgrade's family.
- **Done when:** the screen fits a phone, explains the trade-off in under 10 seconds of reading, and has Replay + Share + Rate buttons.

### DEV-5 · P0 · Analytics endpoint and client
- **Role:** dev · **Owner:** claude-agent (DEV-5/6/7) · **Status:** review
- **Goal:** `api/` serverless function on Vercel: `POST /api/event` and `GET /api/stats`. Anonymous `sessionId` in localStorage. Events: `visit`, `run_start`, `decision`, `quiz_answer`, `run_end`, `rating`. Choose storage through the Vercel Marketplace (Redis or Postgres); document the choice in `api/README.md` and `docs/ARCHITECTURE.md`.
- **Done when:** events from a deployed preview land in storage; the client never blocks or crashes the game if the API is down.

### DEV-6 · P0 · 1-10 rating after a run
- **Role:** dev · **Owner:** claude-agent (DEV-5/6/7) · **Status:** review · **Depends on:** DEV-4, DEV-5
- **Goal:** One-tap 1-10 rating on the end screen, sent as a `rating` event. Never more than once per run.
- **Done when:** ratings appear in `/api/stats`.

### DEV-7 · P0 · `/dashboard` page
- **Role:** dev · **Owner:** claude-agent (DEV-5/6/7) · **Status:** review · **Depends on:** DEV-5
- **Goal:** Second Vite entry `dashboard/index.html`. Shows unique visitors, sessions, runs, average knowledge score (quiz % correct), rating distribution and mean, most-failed questions, average Sustainability / Responsibility / legacy, most-chosen upgrades split by family (good vs trap), most-chosen client answers. Auto-refresh every 30 s.
- **Done when:** it reads live data from `/api/stats` on the deployed site and works on a projector and a phone.

### DEV-8 · P1 · Share card and challenge link
- **Role:** dev · **Owner:** claude-agent (onboarding-demolish-share) · **Status:** review (branch `agent/onboarding-demolish-share`) · **Depends on:** DEV-4, ART-3
- **Goal:** Draw the result card on a `<canvas>` (archetype, legacy, profit, impact, location), share with the Web Share API (files) or download; challenge link `?seed=<seed>&loc=<location>` that starts the same run; static OG image for link previews.
- **Done when:** sharing from a phone opens the native share sheet with image + link, and the link replays the same seed.

### DEV-9 · P1 · Daily challenge
- **Role:** dev · **Owner:** claude-agent (onboarding-demolish-share) · **Status:** review (branch `agent/onboarding-demolish-share`)
- **Goal:** "Daily run" button: seed = `seedFromString(YYYY-MM-DD)`, location rotates by day. Show your best daily legacy (localStorage).
- **Done when:** two phones get the same run on the same day.

### DEV-10 · P0 · Deploy to Vercel
- **Role:** dev · **Owner:** claude-opus (bootstrap agent) · **Status:** done: https://datacenter-tycoon-plum.vercel.app (Vercel project `datacenter-tycoon`, team Encore). Follow-up: connect the GitHub repo so pushes to `main` deploy automatically and PRs get previews.
- **Goal:** Vercel project linked to this repo; production = `main`; preview per PR. Put the URL in the README.
- **Done when:** the README "Live demo" link works on a phone over mobile data.

### DEV-11 · P2 · Save and resume a run
- **Role:** dev · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** Persist `GameState` in localStorage after each action; resume on reload; clear on new run.
- **Done when:** reloading mid-run continues where you were.

### DEV-12 · P2 · Bundle diet and "this game's footprint" badge
- **Role:** dev · **Owner:** _unclaimed_ · **Status:** todo · **Depends on:** RES-4
- **Goal:** Measure; try `preact/compat` alias (target < 40 kB gzip JS); add a small footer badge with page weight and RES-4's per-visit estimate.
- **Done when:** the badge shows real numbers from the build.

## game-design

### GD-1 · P0 · Playtest the harness and report
- **Role:** game-design · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** `npm run dev`, play 3 runs per location on a phone. Note: is it fun in 30 s? any obvious right answer? does the profit tension feel real? any confusing card? Write findings in `docs/HANDOFF.md`, open issues for fixes.
- **Done when:** at least 8 runs logged with archetype and legacy.

### GD-2 · P0 · Player-facing copy file
- **Role:** game-design · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** Create `content/copy.json` (+ schema): 3-step onboarding, archetype titles and one-liners, score tooltips ("Sustainability = what your datacenter does to the planet, measured"), vague debt warnings ("The town is grumbling…").
- **Done when:** DEV-1/DEV-4 read all player text from it; validated by `npm run validate:content`.

### GD-3 · P1 · Balance pass after playtests
- **Role:** game-design · **Owner:** _unclaimed_ · **Status:** todo · **Depends on:** GD-1
- **Goal:** Adjust numbers in `/content` based on GD-1 and cross-tests; keep `npm run sim` green; update the results table in `docs/GAME_DESIGN.md` §7.
- **Done when:** sim passes and the weaknesses in GAME_DESIGN §11 are addressed or explicitly accepted.

### GD-4 · P1 · Location picker and "it depends" card
- **Role:** game-design · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** Difficulty label per location, a one-line teaching card on start ("Here, renewables barely matter. Why?"), and which locations ship enabled.
- **Done when:** copy is in `content/` and reviewed by UX.

### GD-5 · P2 · Badges and achievements
- **Role:** game-design · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** 6-10 shareable badges based on `state.decisions` (e.g. "Refused the crypto farm", "Measured before claiming"). Spec as data in `content/`.
- **Done when:** spec merged; DEV can implement from data alone.

## research

### RES-1 · P0 · Verify every `approx` number
- **Role:** research · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** For each item with `"confidence": "approx"` in `/content` (see `docs/CONTENT_CATALOG.md`), find the primary source, put the URL in `source`, and set `high` if confirmed or `illustrative` if not. Also list sources in `docs/sources/SOURCES.md`.
- **Done when:** no `approx` item without a URL; `npm run validate:content` passes.

### RES-2 · P0 · Five more quiz questions
- **Role:** research · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** Add 5 questions to `content/quiz.json` on under-covered topics (end-user devices, networks, data storage rules, governance, skills), each with source + confidence, and attach them to events/clients via `quizId`.
- **Done when:** validator passes; each new question is reachable in a run.

### RES-3 · P1 · "Learn more" page content
- **Role:** research · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** 6 key facts with sources and the AFNOR 6 steps, short enough to read on a phone in 1 minute. As data in `content/`.
- **Done when:** reviewed by comms; linked from the end screen.

### RES-4 · P1 · This game's own footprint
- **Role:** research · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** Estimate CO2e per visit of this game (page weight, method and assumptions stated, confidence honest). Feeds DEV-12.
- **Done when:** method and number documented in `docs/sources/SOURCES.md`.

## ux-ui

### UX-1 · P0 · Mobile wireframes
- **Role:** ux-ui · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** 375 px flows: start → location → play (HUD, datacenter, shop) → card → end (frontier) → rate → share. Share the Figma link in the issue.
- **Done when:** DEV-1..DEV-4 owners have agreed on it.

### UX-2 · P0 · Onboarding in 3 taps
- **Role:** ux-ui · **Owner:** claude-agent (onboarding-demolish-share) · **Status:** review (branch `agent/onboarding-demolish-share`)
- **Goal:** First decision within 30 s of landing. Max 3 overlay hints, skippable.
- **Done when:** a first-time tester reaches the first client card without help.

### UX-3 · P1 · Feedback and juice spec
- **Role:** ux-ui · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** Number tick-ups, floating deltas, card transitions, outage shake, `navigator.vibrate` on bills, sound off by default. Respect reduced motion.
- **Done when:** spec handed to DEV with timings using the tokens in `ui/tokens.css`.

### UX-4 · P1 · Accessibility pass
- **Role:** ux-ui · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** Contrast AA, 44 px tap targets, focus states, labels for screen readers, no colour-only meaning.
- **Done when:** issues filed and fixed for the slice screens.

## art

### ART-1 · P0 · Visual identity into tokens
- **Role:** art · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** Wordmark, palette, type scale. Put values in `ui/tokens.css` (single source).
- **Done when:** the harness picks up the new look without component changes.

### ART-2 · P1 · Living datacenter illustration
- **Role:** art · **Owner:** claude-opus (bootstrap agent) · **Status:** review (first version in `ui/map/`; artists welcome to restyle colours and shapes)
- **Goal:** Layered SVG: rack rows scale with MW, smoke/heat haze when debt is high, solar roof / heat pipe / water loop when owned, outage flicker. Under 50 kB total.
- **Done when:** DEV can toggle layers from state.

### ART-3 · P1 · Share card template
- **Role:** art · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** 1200×630 and 1080×1920 layouts with slots: archetype, legacy, profit, impact, location, challenge text.
- **Done when:** handed to DEV-8 as SVG or exact specs.

### ART-4 · P2 · Category icons
- **Role:** art · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** 7 inline SVG icons (cooling, energy, hardware, ai, governance, communication, water), < 1 kB each.
- **Done when:** in `assets/icons/`.

## comms

### COM-1 · P0 · Name, tagline, share copy
- **Role:** comms · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** Confirm or change the name (shortlist in GAME_DESIGN §1), tagline, 4 share-text templates (one per archetype) with the challenge link.
- **Done when:** decided at the 13:30 sync and written to `content/copy.json` (with GD-2).

### COM-2 · P0 · Launch plan 15:00-17:15
- **Role:** comms · **Owner:** _unclaimed_ · **Status:** todo · **Depends on:** DEV-10
- **Goal:** QR-code poster, posts for class group chats and Instagram, "beat my score" challenge chain, timing.
- **Done when:** assets ready at 15:00; visitor count visible on `/dashboard`.

### COM-3 · P1 · Pitch (5 slides)
- **Role:** comms · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** Problem, the game in 30 s (live demo), what players learn (AFNOR mapping), live dashboard numbers, what's next.
- **Done when:** rehearsed once before 17:15.

## coordination

### CO-1 · P0 · Protect `main`
- **Role:** coordination · **Owner:** repo admin · **Status:** todo
- **Goal:** GitHub → Settings → Branches → rule for `main`: require a pull request (1 approval), require the `CI` status check, block force pushes and deletions.
- **Done when:** a direct push to `main` is rejected.

### CO-2 · P0 · Assign owners and run the 13:30 sync
- **Role:** coordination · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** Every P0 task has an owner by 12:30. At 13:30, go through `docs/HANDOFF.md` and this board; decide cuts.
- **Done when:** no P0 is unowned; cut decisions recorded in HANDOFF.

### CO-3 · P1 · Cross-test protocol (16:30)
- **Role:** coordination · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** A 5-minute test script for other teams, a feedback form, and a way to turn feedback into issues fast.
- **Done when:** script printed or shared; feedback lands as issues.

### CO-4 · P1 · Cut list at 14:00
- **Role:** coordination · **Owner:** _unclaimed_ · **Status:** todo
- **Goal:** If P0s are late at 14:00, cut in this order: DEV-11, GD-5, ART-4, DEV-9, DEV-12, extra locations (set `enabled: false`), ART-2 (use a static image), DEV-8 (share text only, no image).
- **Done when:** decision recorded in HANDOFF.
