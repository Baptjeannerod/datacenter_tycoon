# Datacenter Tycoon

> Build a datacenter. Make money. Try not to wreck the planet. Notice how hard that is.

A mobile-first browser game built in one day for **The SMIC Day** (Social Media Impact Challenge, CentraleSupélec, 17 Nov 2026). It raises awareness about responsible digital practices through a fun, replayable, shareable tycoon game, backed by a dashboard that measures what players learned.

**Live demo:** _not deployed yet (task DEV-10)_ · **Dashboard:** _not built yet (task DEV-7)_ · **New here? Read [AGENTS.md](AGENTS.md).**

---

## 1. SMIC Day context and constraints

- The platform must be **fun, interactive, viral**, and teach **responsible digital practices**.
- It must connect to a **dashboard** that evaluates visitors' knowledge, lets them **rate the experience 1-10**, and **counts visitors**.
- Schedule: work from 10:00 · sync 13:30 · **prototype 15:00** · **cross-tests 16:30** · **pitches 17:15**.
- Winning = peer vote + visitor count + average rating.
- Team of ~20: researchers, UX/UI, devs, game designers, art directors, comms, coordinators, plus AI agents.

## 2. The game in 30 seconds

You run a datacenter for 10 years (40 quarters, about 4 minutes). You earn money by hosting workloads and reinvest it in upgrades. Clients knock with requests ("an LLM to write 10 million horoscopes a day?"): **accept, refuse, or propose a lighter alternative**. Events hit you: heatwaves, carbon taxes, audits, scandals. Every decision moves two scores:

| Score | What it measures |
|---|---|
| **Sustainability (0-100)** | Measured performance: energy efficiency (PUE), carbon, water (WUE), hardware lifecycle and e-waste, absolute footprint |
| **Responsibility (0-100)** | Quality of decisions: questioning the need for AI, honest communication, compliance, long-term thinking |

At the end you land on a **profit vs impact map** with an archetype (Frugal Tycoon, Planet Burner, Cloud Monk, Lost in the Fog) and a **Legacy score** to share: "beat my score" links replay the same seeded run.

## 3. The core tension (do not break this)

**Responsible and ecological choices are not free.** They raise your scores but usually cost money up front, slow growth, refuse clients, or cap capacity. The greedy path is faster early but accumulates a hidden **environmental debt** that comes due as carbon taxes, power caps, audits, water restrictions, protests and scandals. Some green upgrades pay for themselves (lower bills, fewer failures); some never do within a run.

Design rules every contributor and agent must respect:

1. **No free lunch:** every upgrade has a cost and an opportunity cost.
2. **No dominant strategy:** pure greed and pure virtue must both lose to a balanced run, checked by `npm run sim`.
3. **Context matters:** the same upgrade can be smart in one location and useless in another.
4. **Teach, don't lecture:** one sentence per card, never a wall of text.
5. **Hide the answer:** never show whether an upgrade is "good" or a "trap" before purchase.
6. **The game itself is frugal:** static front-end, light bundle, no runtime AI calls.

Current balance (from `npm run sim`, details in [GAME_DESIGN §7](docs/GAME_DESIGN.md#7-balance-targets-and-current-results)): greed earns the most in the first half then stalls and scores ~20-35 impact; virtue scores ~80-90 impact with half the money; the balanced player wins on legacy in all four locations.

## 4. Educational backbone

Based on the AFNOR / Ecolab **General framework for frugal AI** ([sources](docs/sources/SOURCES.md)). Each idea is a mechanic:

| Framework idea | In the game |
|---|---|
| Question the need; consider non-AI solutions | Client intake: accept / refuse / propose a lighter alternative |
| Whole life cycle | Hardware ageing, refresh cycles, e-waste, embodied carbon, lifespan upgrades |
| Indicators: climate, resources, water | PUE, carbon intensity, WUE, e-waste feed the Sustainability score |
| Measure first | Cheap metering upgrade that wins audits and defuses greenwashing |
| Rebound effect | Efficiency gains trigger a demand surge: ride it or cap growth |
| Planetary boundaries | Absolute footprint in the score, local market ceiling, sufficiency pledge |
| Honest communication | "Carbon neutral" offsets badge is a trap that turns into a scandal |
| Skills, governance | Training and a frugal-AI checklist: cheap, high responsibility |

Every number shown to players lives in `/content` with a `source` and a `confidence` (`high` | `approx` | `illustrative`). Never invent precise statistics.

## 5. Quick start

Requires **Node.js ≥ 22.12** and npm.

```bash
git clone https://github.com/Baptjeannerod/datacenter_tycoon.git
cd datacenter_tycoon
npm install
npm run dev                  # http://localhost:5173 (dev harness, plays a full run)
```

Other commands (all exist in `package.json`):

```bash
npm run build                # typecheck + production build to dist/
npm run preview              # serve the production build
npm test                     # engine unit tests (Vitest)
npm run lint                 # ESLint
npm run typecheck            # tsc --noEmit
npm run validate:content     # validate every JSON in /content (schemas + cross-refs + design rules)
npm run docs:catalog         # regenerate docs/CONTENT_CATALOG.md from /content
npm run sim                  # headless balance simulation (1000 runs per strategy, exit 1 if a rule breaks)
npm run sim -- --runs 200    # faster
npm run check                # everything CI runs except the build
```

Add `?seed=123` to the URL to replay a specific run.

## 6. Repository map

```
engine/      Pure game simulation (no DOM, no Math.random, no clock). Unit-tested.
  types.ts   Shared contracts: content shapes, game state, actions.
content/     ALL game data as JSON: balance, locations, upgrades, events, clients, quiz.
  schema/    JSON Schemas mirroring engine/types.ts.
ui/          React app. App.tsx is a dev harness (to be replaced); tokens.css = design tokens.
scripts/     validate-content.ts, sim.ts (balance), catalog.ts (docs generator).
dashboard/   /dashboard page (planned, DEV-7).
api/         Analytics endpoint (planned, DEV-5).
assets/      Art, icons (keep light, SVG first).
docs/        GAME_DESIGN, ARCHITECTURE, TASKS, HANDOFF, CONTENT_CATALOG (generated), sources/.
.github/     CI, issue and PR templates, CODEOWNERS.
```

## 7. Adding content (no code needed)

Game designers and researchers contribute by editing `/content` only. Example upgrade (`content/upgrades.json`):

```json
{
  "id": "water-closed-loop",
  "name": "Closed-loop water",
  "pitch": "Recycle cooling water instead of drawing fresh water.",
  "family": "good",
  "category": "water",
  "themes": ["water"],
  "cost": 500,
  "effects": { "wue": -0.8, "pue": 0.04 },
  "scoreDelta": { "sustainability": 2 },
  "contextModifiers": {
    "sun-belt": { "scoreDelta": { "sustainability": 5, "responsibility": 2 }, "note": "Here every litre counts." }
  },
  "whyItMatters": "Recycling water cuts withdrawals, but pumps and chillers use more energy: a real trade-off between water and carbon.",
  "source": "Water-energy trade-off in cooling design (WUE vs. PUE, The Green Grid)",
  "confidence": "approx"
}
```

- `family`: `good`, `trap` (looks profitable, hides a delayed bill) or `tradeoff`. Never shown to players before purchase.
- `cost` is in k€ (500 = €500k). 1 tick = 1 quarter.
- `effects`: one-off keys (`cash`, `demandPct`, `envDebt`) apply once; all others (`pue`, `wue`, `renewableShare`, `growthRate`, `growthCap`, `failureRate`, `cashPerTick`, `envDebtPerTick`, `pricePct`, `energyPricePct`, `itEfficiency`, `hardwareLifespan`, `eWasteFactor`, `carbonIntensity`) persist while owned.
- `contextModifiers` are keyed by location id; their values **replace** the base values for that location.
- Optional: `delayed` (effects or events that fire N ticks later), `requires`, `exclusiveGroup`, `setFlags`, `slice`.

Events and clients use `choices` with a `stance` (`responsible` / `neutral` / `greedy`) and an `outcome` sentence. Field reference: `engine/types.ts`; full list of current content: [docs/CONTENT_CATALOG.md](docs/CONTENT_CATALOG.md).

Then:

```bash
npm run validate:content && npm run sim -- --runs 200 && npm run docs:catalog
```

## 8. Scoring and economy (overview)

- **Sustainability** = 25 % PUE + 25 % carbon intensity + 15 % water (weighted by local stress) + 15 % lifecycle + 20 % absolute footprint, plus a small bonus from decisions.
- **Responsibility** starts at 50, moves with decisions (diminishing returns near 0 and 100) and slowly drifts back to 50: trust must be maintained.
- **Economy per quarter:** revenue from IT load minus energy, opex, carbon tax (once introduced), capex for growth and hardware refreshes. Demand grows toward a local market ceiling.
- **Environmental debt** (hidden) grows with carbon, water, e-waste and greedy choices; thresholds trigger bills (carbon tax, audit, power cap, protests, scandal) and client churn.
- **Legacy score** = 1000 × √(profit × impact): balance beats extremes.

Exact formulas: [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) §4-§6.

## 9. Architecture and contracts

Pure engine (`step`, `applyAction`, `currentDecision`) driven by the UI and by the sim; content as validated JSON; static Vite build; a tiny serverless analytics endpoint planned. Contracts live in `engine/types.ts` and `content/schema/`. Details and usage example: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 10. Working here (humans AND AI agents)

Several people and several AI agents work in parallel. **Read [AGENTS.md](AGENTS.md) first** (commands, conventions, ownership, definition of done), then [CONTRIBUTING.md](CONTRIBUTING.md).

- **Tasks:** [docs/TASKS.md](docs/TASKS.md) is the board (each task is also a GitHub issue). Claim by setting yourself as Owner.
- **Branches:** `<role>/<task-id>-<topic>` (e.g. `dev/DEV-2-cards`, `agent/DEV-5-analytics`). Small PRs into `main`. Never force-push `main`.
- **Handoff log:** append what you did, what's next and gotchas to [docs/HANDOFF.md](docs/HANDOFF.md).
- **CI:** lint, typecheck, tests, content validation, catalog freshness, balance sim, build. Must be green to merge.
- **Branch protection (recommended, admin only):** require a PR with 1 approval and the `CI` check on `main`; block force-pushes (task CO-1).

## 11. Status

- [x] Game design doc and scoring formulas (`docs/GAME_DESIGN.md`)
- [x] Content: 4 locations, 22 upgrades, 16 events, 9 clients, 12 quiz questions, validated
- [x] Engine (pure, seeded, 26 tests)
- [x] Balance simulation passing (`npm run sim`)
- [x] Dev harness: full run playable on mobile (not the final UI)
- [x] CI, templates, agent docs
- [ ] Real mobile UI: HUD, cards, shop, end screen (DEV-1..4)
- [ ] Quiz UI + rating (DEV-2, DEV-6)
- [ ] Analytics + dashboard (DEV-5, DEV-7)
- [ ] Share card + seeded/daily runs (DEV-8, DEV-9)
- [ ] Deployed (DEV-10)

## 12. Sources

- AFNOR Spec, *General framework for frugal AI* (CGDD / SRI / Ecolab), summary.
- IEA, *Energy and AI* (2025); Uptime Institute surveys; The Green Grid (PUE, WUE); EU Energy Efficiency Directive (EU) 2023/1791; Directive (EU) 2024/825; Global E-waste Monitor 2024; ADEME-Arcep 2022.
- Full list with confidence levels and what still needs checking: [docs/sources/SOURCES.md](docs/sources/SOURCES.md).

## 13. License

[MIT](LICENSE). Team: SMIC Day, CentraleSupélec. _Add contributors here._
