# Datacenter Tycoon

> Build a datacenter. Make money. Try not to wreck the planet. Notice how hard that is.

A browser game built in one day for **The SMIC Day** (Social Media Impact Challenge, CentraleSupélec). The goal: raise awareness about responsible digital practices through a fun, replayable, shareable tycoon game, backed by a dashboard that measures what players learned.

**Live demo:** _TBD (Vercel URL)_  |  **Dashboard:** _TBD (/dashboard)_

---

## 1. The idea in 30 seconds

You run a datacenter. You earn money by hosting workloads and reinvest it in upgrades. Every decision moves two scores:

| Score | What it measures |
|---|---|
| **Sustainability Score (0-100)** | Measured environmental performance: energy (PUE), carbon, water (WUE), hardware lifecycle, e-waste |
| **Responsibility Score (0-100)** | Quality of decisions: questioning the need for AI, honest communication, compliance, long-term thinking |

### The core tension (do not break this)

**Responsible and ecological choices are not free.** They raise your scores, but they usually *cost* you: money up front, slower growth, refused clients, capped capacity, longer payback. The greedy path is faster early but accumulates a hidden **environmental debt** that comes due as taxes, government caps, audits, water restrictions and scandals. Some green upgrades also pay for themselves (fewer failures, lower bills). Some never do within a run. The player decides where to stand on the **profit vs responsibility frontier**, and the end screen shows where they landed.

Design rules that every contributor and every agent must respect:

1. No free lunch: every upgrade has a cost and an opportunity cost.
2. No dominant strategy: pure greed and pure virtue must both be beatable by a balanced run (checked by `npm run sim`).
3. Context matters: the same upgrade can be smart in one location and a disaster in another.
4. Teach, don't lecture: one-line "why this matters" per event, never a wall of text.
5. The game itself must be frugal: static front-end, light bundle, no needless AI calls.

## 2. Educational backbone

Based on the AFNOR / Ecolab **General framework for frugal AI** (see `docs/sources/`). Mapped to mechanics:

- **Question the need** -> workload intake: accept, refuse, or propose a less energy-intensive alternative.
- **Whole life cycle** -> hardware age, e-waste, end-of-life decisions.
- **Indicators** -> energy, carbon, water, resource depletion shown in the HUD.
- **Rebound effect** -> after big efficiency gains, demand surges and total impact can rise.
- **Honest communication** -> unsupported green claims risk a greenwashing scandal.

Every number shown to players lives in `/content` with a `source` and a `confidence` (`high` | `approx` | `illustrative`). Never invent precise statistics.

## 3. Quick start

```bash
git clone <REPO_URL>
cd datacenter-tycoon
npm install
npm run dev            # local dev server
npm run build          # production build
npm run test           # engine unit tests
npm run validate:content   # validates every JSON in /content against its schema
npm run sim            # headless balance simulation (1000 runs, strategy report)
```

_If a command above does not exist yet, it is on the roadmap in `docs/TASKS.md`. Keep this section in sync with `package.json`._

## 4. Repository map

```
/engine      Pure game simulation (no UI, no DOM). Fully unit-tested.
/ui          React components, screens, HUD, share card.
/content     ALL game data as JSON/YAML: upgrades, events, clients, locations, quiz, copy.
/dashboard   Dashboard page (visitors, knowledge scores, ratings) + analytics client.
/api         Minimal serverless endpoint(s) for analytics events.
/assets      Art, icons, sounds (keep light).
/docs        Game design doc, architecture, tasks, handoff log, sources.
/scripts     Content validation, balance simulation, tooling.
```

**Contract-first:** shared TypeScript types live in `engine/types.ts` and the JSON schemas in `content/schema/`. Change a contract = update the docs and tell everyone in `docs/HANDOFF.md`.

## 5. Adding content (no code needed)

Game designers and researchers can contribute by editing `/content` only. Example upgrade:

```json
{
  "id": "closed-loop-water",
  "family": "good",
  "name": "Closed-loop water cooling",
  "cost": 120000,
  "effects": {
    "waterUse": -0.6,
    "cashPerTick": -2,
    "growthRate": -0.05
  },
  "scoreDelta": { "sustainability": 8, "responsibility": 3 },
  "delayed": [{ "afterTicks": 20, "effect": { "failureRate": -0.15 } }],
  "contextModifiers": { "location:arid-south": { "scoreDelta": { "sustainability": 4 } } },
  "whyItMatters": "Cooling can drink millions of litres. Recycling water cuts withdrawal but adds energy cost.",
  "source": "TBD",
  "confidence": "illustrative"
}
```

`family` is one of `good`, `trap`, `tradeoff`. Traps look profitable and hide a delayed consequence. Run `npm run validate:content` before committing.

## 6. Working here (humans AND AI agents)

Several people and several AI agents work on this repo in parallel. Read `AGENTS.md` first.

- **Branches:** `<role>/<short-topic>` (e.g. `dev/engine-scoring`, `design/hud`, `content/events`, `agent/dashboard-api`).
- **Small PRs**, rebase on `main` before opening, never force-push `main`.
- **Ownership:** see `CODEOWNERS`. Stay in your lane; if you need a change in someone else's area, open an issue or leave a note in `docs/HANDOFF.md`.
- **Tasks:** `docs/TASKS.md` is the board. Claim a task by putting your name/agent id next to it before starting.
- **Handoff log:** after finishing a chunk of work, append what you did, what is next and any gotcha to `docs/HANDOFF.md`.
- **Definition of done for a PR:** builds, typechecks, tests pass, content validates, README/docs updated if behavior or commands changed.

## 7. Status

- [ ] Game design doc (`docs/GAME_DESIGN.md`)
- [ ] Engine vertical slice
- [ ] UI vertical slice (mobile-first)
- [ ] Quiz + rating
- [ ] Dashboard + analytics
- [ ] Share card + seeded/daily runs
- [ ] Balance simulation passing
- [ ] Deployed

## 8. SMIC Day constraints

- Platform must be fun, interactive, viral, and teach responsible digital practices.
- Dashboard must evaluate visitor knowledge, collect a 1-10 rating, and count visitors.
- Prototype by 3:00 PM, cross-tests 4:30 PM, final pitches 5:15 PM.
- Winning = peer vote + visitor count + average rating.

## 9. Credits & sources

- AFNOR Spec: General framework for frugal AI (CGDD / SRI / Ecolab).
- Team: SMIC Day, CentraleSupélec. _Add contributors here._

## License

_TBD (default: MIT unless the team decides otherwise)._
