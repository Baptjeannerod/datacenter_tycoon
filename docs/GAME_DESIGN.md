# Game design: Datacenter Tycoon

> Status: first draft (bootstrap, 17 Nov 2026). Numbers are tuned so `npm run sim` passes.
> Every formula below matches the code in `engine/` (file references given). If you change one, change both.
> The full list of upgrades, events, clients and quiz questions is generated in [CONTENT_CATALOG.md](CONTENT_CATALOG.md).

## 1. Pitch

**You run a datacenter for 10 years. Get rich. Stay responsible. You can't max both.**

A 3-6 minute, one-thumb, zero-signup browser game. You host workloads, earn money, buy upgrades and answer decision cards. Two scores, **Sustainability** and **Responsibility**, show the cost of your choices. At the end you land on a profit-vs-impact map with an archetype ("Frugal Tycoon", "Planet Burner", "Cloud Monk", "Lost in the Fog") and a single **Legacy score** to share and beat.

### Name

Shortlist: **Datacenter Tycoon**, Rack & Ruin, Cloud Burn, Heat Sink, Watt Now?
**Pick: Datacenter Tycoon** (tagline "Profit or planet?"). It is clear, searchable, matches the genre people already know and the repo name. Comms can override before the 13:30 sync (task COM-1).

## 2. Educational backbone (AFNOR / Ecolab frugal-AI framework)

The source is the AFNOR Spec "General framework for frugal AI" (CGDD / SRI / Ecolab), summary in [sources/SOURCES.md](sources/SOURCES.md). Each idea is a mechanic, not a text box.

| Framework idea | Mechanic in the game | Where |
|---|---|---|
| **Question the need** (step 1) | Client intake: accept, refuse, or propose a lighter alternative. `aiNeed` says if AI is needed, partly needed, not needed, or not AI at all. | `content/clients.json` |
| **Identify all solutions, incl. non-AI** (step 2) | "Propose an alternative" choice (FAQ instead of LLM, templates instead of generation, drift-triggered retraining). | clients |
| **Whole life cycle** | Hardware ages, gets refreshed (cost + e-waste + embodied carbon). Lifespan and recycling upgrades. | `engine/game.ts` step, upgrades `extend-hardware-life`, `refurb-circular`, `fast-refresh` |
| **Indicators: climate, resources, water** | PUE, WUE, gCO2e/kWh, e-waste feed the Sustainability score. | `engine/scoring.ts` |
| **Measure first** | `energy-monitoring` is cheap, unlocks the best answers to audits and reporting, and defuses greenwashing. | upgrades, events `permit-audit`, `eu-reporting` |
| **Rebound effect** | Efficiency upgrades arm the `rebound-surge` event: ride +40 % demand or cap growth. Absolute footprint is part of the score. | events, `footprint` component |
| **Planetary boundaries** | Absolute energy vs day one (`footprint`), market ceiling, `sufficiency-pledge`. | scoring, locations `marketMW` |
| **Honest communication** | "Carbon neutral" badge from offsets is a trap: scandal unless you measured first. | `carbon-offsets-greenwash`, `greenwash-scandal` |
| **Skills and awareness** (best gain/effort) | `staff-training`: cheapest responsibility gain. | upgrades |
| **Governance** | `frugal-ai-policy` checklist, sufficiency pledge, reporting duty. | upgrades, events |
| **Context matters** | Four locations change what each upgrade is worth (free cooling in the desert, PPA on a nuclear grid). | `contextModifiers` |

## 3. Core loop and session

**Build on the map (since 17 Nov, 13:00).** The campus has 8 land plots and 1 river spot. Tap an empty plot: a ring menu offers a **datacenter hall** (2 MW of servers) or a **power plant** (gas, coal, biomass, wind, solar; the dam only on the river spot). Tap a built plot: a ring of upgrades for *that* building, plus **Demolish**: the building, its upgrades and their persistent effects go; it costs `demolishCostPct` (10 %) of the building's price and nothing is refunded. Bills already scheduled (delayed effects) still arrive, and score deltas already earned stay: tearing down the coal plant does not erase its smoke. You cannot demolish your only hall. Campus-wide rules (training, frugal-AI checklist, metering, "carbon neutral" badge…) live behind the **Policies** button. You start with 1 hall and 1 gas plant.

**There is no grid.** Every MW your halls use comes from plants you built. A hall needs `2 MW × PUE` of spare power to be built; upgrades that draw power (GPUs, overclocking, pumps) need spare power too. If supply drops below need (a calm, cloudy quarter), the last halls go dark, lose their revenue and show a **red "!"** on the map.

| Plant | Avg MW (Paris) | Build | €/MWh | gCO2e/kWh | Catch |
|---|---|---|---|---|---|
| Gas | 6 | €1.0M | 70 | 490 | steady, compact, emits |
| Coal | 10 | €1.4M | 40 | 820 | cheapest MWh, densest, dirtiest, air pollution |
| Biomass | 5 | €1.5M | 60 | 230 | "green" depends on the wood |
| Wind | ~3 (×1.3 Nordic) | €1.8M | 8 | 11 | land-hungry, varies ±35 % |
| Solar | ~1.7 (×1.7 Sun Belt) | €1.2M | 5 | 48 | land-hungry, varies ±20 % |
| Dam (river spot) | ~6 (×1.5 Nordic) | €3.5M | 5 | 24 | floods the valley (debt), only one |

The core tension is now **energy density vs. impact**: fossil plants pack lots of MW onto one plot and cost little upfront, so you can fit more halls and serve more clients early; renewables are cheap to run but need several plots and capital. Emission factors are IPCC AR5 life-cycle medians; costs and outputs are game values.


- **1 tick = 1 quarter. A run = 40 ticks = 10 years.** Target 3-6 minutes, so roughly 4-6 s per tick with auto-advance (UI decision, task DEV-1), pausing whenever a card is open.
- Each tick: demand grows → capacity follows (capex) → hardware ages → outage roll → money, energy, carbon, water → environmental debt → delayed effects fire → scores → new card maybe.
- **Cards** (one at a time, time stops):
  - **Client** every 5 ticks (`clientEvery`), drawn by weight among unseen clients.
  - **Consequence / milestone events** the moment their condition holds (debt thresholds, flags, ticks).
  - **Random events** with 25 % chance per tick otherwise (`randomEventChance`).
  - **Quiz** right after an event/client that has a `quizId`, max 5 per run, never repeated. Correct answer: +2 Responsibility.
- **Shop** is always open between cards. One-time purchases. `exclusiveGroup` allows one per group (one cooling system, one power contract).
- **End**: after tick 40, or bankruptcy (cash below −€1M).

**Never reveal an upgrade's family (good / trap / tradeoff) before purchase.** Spotting the trap is the game. The end screen reveals it.

## 4. Scores (`engine/scoring.ts`)

### Sustainability (0-100), measured + decisions

```
pue        = clamp((2.0 − PUE) / 0.9)                       × 100   PUE 2.0 → 0, 1.1 → 100
carbon     = clamp(1 − effectiveCarbon / 700)              × 100   effectiveCarbon = (grid + Σ carbonIntensity) × (1 − renewableShare)
water      = clamp(1 − WUE × waterStress / 2)              × 100   water only hurts where it is scarce
lifecycle  = clamp((lifespan − 8) / 24) × 60 + clamp((1 − eWasteMultiplier) / 0.7) × 40
footprint  = clamp(1 − (energyThisTick / energyDay1 − 1) / 3) × 100   4× the energy of day one → 0 (planetary boundaries, rebound)

measured       = 0.25·pue + 0.25·carbon + 0.15·water + 0.15·lifecycle + 0.20·footprint
Sustainability = clamp(measured + sustainabilityBonus, 0, 100)    bonus = Σ scoreDelta.sustainability, clamped ±15
```

### Responsibility (0-100), from decisions only

- Starts at 50. Every `scoreDelta.responsibility` is applied with **diminishing returns**: `R += Δ × min(1, (100 − R)/50)` for gains, `× min(1, R/50)` for losses. At R=50 a +8 is +8; at 80 it is +3.2.
- **Trust fades**: each tick R moves 2 % of the way back to 50 (`responsibilityDrift`). You have to keep behaving.

### Run result

```
netWorth   = cash at the end (k€)
profitNorm = clamp(netWorth / 55 000, 0, 1.5)                     (profitReference)
impact     = average over all ticks of (Sustainability + Responsibility) / 2     time-averaged: no last-minute greenwashing
legacy     = round(1000 × √(profitNorm × impact/100)), halved if bankrupt         geometric mean: balance beats extremes
archetype  = profitNorm ≥ 0.6 ? (impact ≥ 60 ? frugal-tycoon : planet-burner) : (impact ≥ 60 ? cloud-monk : lost-in-the-fog)
```

The end screen plots (profitNorm, impact) on the frontier and lists "what you gained / what you gave up" (`summarize()`).

## 5. Economy (`engine/game.ts` → `step`, knobs in `content/balance.json`)

Per tick, in this order:

```
growth      = growthRate × max(0, 1 − demand / marketMW)          logistic: the local market fills up
demand     ×= 1 + growth
churn       = clamp((envDebt − 80) × 0.0004, 0, 0.03)             clients leave dirty providers
demand     ×= 1 − churn
capex       = max(0, demand − capacity) × 1 200 k€/MW              capacity follows demand up, never down (stranded assets)
refresh     = when hardwareAge ≥ lifespan: capacity × 500 k€, e-waste = capacity × 8 t × eWasteMultiplier, embodied CO2 = capacity × 300 t
outage      = rng < failureRate  → revenue −30 % this tick, demand −3 %
load        = min(demand, capacity)
revenue     = load × pricePerMW × (1 + Σ pricePct)
IT energy   = load × 2 190 h × (1 − itEfficiency)                 MWh
energy      = IT energy × PUE
energyCost  = energy × €/MWh × (1 + Σ energyPricePct) / 1000
CO2         = energy × effectiveCarbon / 1000 + embodied           t
water       = IT energy × WUE                                       m³
opex        = 150 + capacity × 60
carbonTax   = CO2 × €100/t / 1000   (only once the 'carbon-tax' flag is set)
net         = revenue − energyCost − opex − carbonTax + Σ cashPerTick − capex − refresh
```

- Base `growthRate` comes from the location; upgrades and choices add to it; `growthCap` effects clamp it (min of active caps).
- `failureRate = 0.03 + Σ failureRate + 0.01 × ticks of age beyond 75 % of lifespan`.
- Starting point (all locations): 2 MW, €1.5M cash, 4-year hardware lifespan.

### Effects vocabulary (for content authors)

One-off keys apply once: `cash`, `demandPct`, `envDebt`. Persistent keys stack as modifiers while their source is active (forever for upgrades and choices, `durationTicks` for `temporary`): `pue`, `wue`, `renewableShare`, `growthRate`, `growthCap`, `failureRate`, `cashPerTick`, `envDebtPerTick`, `pricePct`, `energyPricePct`, `itEfficiency`, `hardwareLifespan`, `eWasteFactor`, `carbonIntensity`. Full doc comments: `engine/types.ts` → `Effects`.

## 6. Environmental debt: the hidden bill

`envDebt` is never shown as a number (the UI may show vague warnings: "the town is grumbling"). It grows every tick:

```
envDebt += CO2/2000 + water × waterStress / 20000 + e-waste × 0.05 + Σ envDebtPerTick − 0.5   (floor 0)
```

Greedy choices add `envDebtPerTick` directly (crypto client +1.2, gas turbines +1.2, GPU hype +0.8, …). When debt crosses a threshold, the bill arrives as a card (once each):

| envDebt | Event | What it costs the greedy player |
|---|---|---|
| ≥ 30 | `carbon-tax` | €100/t on every tonne from now on (lobbying buys 8 ticks) |
| ≥ 45 | `permit-audit` | €600k fine, or a scandal later if you hide (free if you measured) |
| ≥ 65 | `power-cap` | growth frozen 2 years, or gas turbines (more debt) |
| ≥ 85 | `local-opposition` | permit blocked, clients leave, or pay the community |
| ≥ 110 | `public-scandal` | −8 % to −20 % clients |
| > 80 | continuous churn | up to 3 % of clients leave every tick |

Plus trap-specific bills fired by `delayed` effects: `greenwash-scandal` (offsets without measurement, +8 ticks), `ai-bubble` (70 % chance, +14 ticks after the GPU cluster), `permit-audit` (gas turbines, +10 ticks), `water-restriction` (Sun Belt with WUE ≥ 1.5).

## 7. Balance targets and current results

The design rules are enforced by `npm run sim` (exit code 1 if broken, also run in CI with 200 runs):

1. **Balance wins**: `balanced` has the highest mean legacy in every location.
2. **Greed hits a wall**: `greedy` gets ≥ 2 bills in ≥ 80 % of runs, and its second half grows less (relative to its first half) than `balanced`'s.
3. **Virtue is viable**: `virtuous` never goes bankrupt and earns ≥ 20 % of the profit reference.
4. **The tension is real**: `greedy` out-earns `virtuous` in the first half and overall.

Results below are from the plot-and-power model (1 000 runs per strategy). In this model the balanced player (dam or best renewable + gas backup) out-earns greedy (coal) over a full run everywhere; greedy still out-earns pure virtue, and in Paris, Nordic and Coal Valley greedy leads the first half against balanced too.

Results of `npm run sim` (1 000 runs per strategy = 250 per location, seeds 1000-1249), 17 Nov 2026 (k€; 1st/2nd half = net-worth gain in each half):

| Location | Strategy | Net worth | Impact | Legacy | Bills | 1st half | 2nd half |
|---|---|---|---|---|---|---|---|
| Paris Basin | greedy | 57 056 | 29 | 544 | 7.0 | 24 404 | 31 152 |
|  | virtuous | 38 551 | 89 | 788 | 0 | 12 177 | 24 873 |
|  | **balanced** | 79 369 | 75 | **1 018** | 5 | 19 292 | 58 578 |
| Nordic Fjord | greedy | 30 258 | 25 | 368 | 7.0 | 16 722 | 12 037 |
|  | virtuous | 19 113 | 87 | 549 | 1.3 | 5 325 | 12 288 |
|  | **balanced** | 88 201 | 80 | **1 092** | 1.3 | 14 992 | 71 709 |
| Coal Valley | greedy | 70 817 | 28 | 593 | 7.0 | 30 683 | 38 634 |
|  | virtuous | 38 999 | 89 | 795 | 0 | 12 176 | 25 323 |
|  | **balanced** | 92 001 | 75 | **1 056** | 5 | 23 834 | 66 666 |
| Sun Belt | greedy | 51 350 | 20 | 430 | 8.0 | 16 823 | 33 027 |
|  | virtuous | 43 860 | 82 | 810 | 0 | 15 212 | 27 148 |
|  | **balanced** | 103 427 | 68 | **1 009** | 5.8 | 28 963 | 72 964 |

Reading it:
- **Paris and Nordic** show the cleanest tension: greed earns the most money (and the most early), but its impact collapses and its growth flattens.
- **Coal Valley and Sun Belt** invert the long-run money: once carbon is priced and water is capped, the balanced player out-earns the greedy one. Greed still earns the most in the first half. That is the "it depends" lesson: on a dirty grid or in a dry place, the bill comes faster.
- `virtuous` (buys every green upgrade, refuses everything doubtful) is a Cloud Monk: best impact, half the money.

Strategies are caricatures in `engine/strategies.ts`. They are not the only way to play; they are tripwires.

## 8. Locations ("it depends")

| Location | What it teaches |
|---|---|
| **Paris Basin** (nuclear-heavy grid) | Clean power already: PPAs add little. Levers are efficiency, lifespan, and how much you grow. |
| **Nordic Fjord** (cold, hydro) | Easy to be green, but far from users: lower prices, slower growth, smaller market. |
| **Coal Valley** (coal-heavy grid) | Every kWh emits more than 10× a nuclear or hydro grid. The PPA is the big lever; carbon tax hurts most. |
| **Sun Belt** (hot, water-stressed) | Fast growth, cheap solar, but evaporative cooling drinks scarce water. Free cooling barely works. |

All four are enabled and pass the sim. The vertical slice can ship with Paris only (`enabled: false` hides others).

## 9. Vertical slice (first playable, target 15:00)

Marked `"slice": true` in content. 1 location (Paris), 9 upgrades (hot-aisle, free cooling, PPA, measure everything, keep servers 6 years, overclock and cram, GPU cluster, carbon-neutral badge, frugal AI checklist), 6 events (carbon tax, permit audit, greenwash scandal, rebound, EU reporting, heatwave), 3 clients (AstroGPT, hospital, bank FAQ bot), end screen. The engine runs all content regardless; the slice flag is a UI and QA priority list.

## 10. Feel and UX rules

- Fun in 30 seconds: first card (a client) within 3 ticks of starting. One tap to start, no tutorial wall: a 3-step overlay max.
- Teach, don't lecture: one sentence (`whyItMatters`, `outcome`, quiz `explanation`). Never more than ~25 words on a card.
- Show consequences: floating +/− on money and scores after every choice; the datacenter illustration changes (more racks, smoke when debt is high, solar roof when owned).
- Every number shown to players comes from `/content` with `source` and `confidence`. Illustrative numbers must never be presented as facts.

## 11. Known weaknesses and open questions

- **The impact axis saturates around 85-90** for any sensible play; the gap between "balanced" and "virtuous" impact is small (≈5 points). A stronger reward for sufficiency (cap growth) could widen it.
- **Balanced out-earns greedy over a full run in every valley** in the plot-and-power model (cheap-to-run renewables and the dam beat coal once carbon is priced). Greedy still beats pure virtue. If playtesters find "green always pays" too obvious, raise renewable build costs or slow demand growth.
- **The Sun Belt is the easy green valley**: solar is so strong that greed does not even lead the first half there.
- **Some green upgrades are no-brainers** (hot-aisle containment, free cooling in Paris) because energy is about half of revenue. Realistic, but they reduce choice. The rebound event is the counterweight.
- **The idle strategy (buy nothing, accept everything) out-earns greedy in the Nordics**, because traps cost money. Fine ("shortcuts aren't even profitable there") but worth a playtest.
- Debt thresholds are absolute; a much longer or shorter run needs retuning.
- Quiz answers are fixed order; the UI should shuffle answers (seeded) to avoid "always A".
