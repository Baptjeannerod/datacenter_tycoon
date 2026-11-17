# Game design: Datacenter Tycoon

> Status: first draft (bootstrap, 17 Nov 2026). Numbers are tuned so `npm run sim` passes.
> Every formula below matches the code in `engine/` (file references given). If you change one, change both.
> The full list of upgrades, events, clients and quiz questions is generated in [CONTENT_CATALOG.md](CONTENT_CATALOG.md).

## 1. Pitch

**You run a datacenter for 5 years. Get rich. Stay responsible. You can't max both.**

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

**Build on the map (since 17 Nov, 13:00).** The campus has 16 land plots and 1 river spot (`balance.landPlots`). Tap an empty plot: a ring menu offers a **datacenter hall** (2 MW of servers) or a **power plant** (gas, coal, biomass, wind, solar; the dam only on the river spot). Tap a built plot: a ring of upgrades for *that* building, plus **Demolish**: the building, its upgrades and their persistent effects go; it costs `demolishCostPct` (10 %) of the building's price and nothing is refunded. Bills already scheduled (delayed effects) still arrive, and score deltas already earned stay: tearing down the coal plant does not erase its smoke. You cannot demolish your only hall. Campus-wide rules (training, frugal-AI checklist, metering, "carbon neutral" badge…) live behind the **Policies** button. You start with 1 hall and 1 gas plant.

**There is no grid.** Every MW your halls use comes from plants you built. A hall needs `2 MW × PUE` of spare power to be built; upgrades that draw power (GPUs, overclocking, pumps) need spare power too. If supply drops below need (a calm, cloudy quarter), the last halls go dark, lose their revenue and show a **red "!"** on the map.

| Plant | Avg MW (Paris) | Build | €/MWh | gCO2e/kWh | Catch |
|---|---|---|---|---|---|
| Gas | 6 | €1.0M | 70 | 490 | steady, compact, emits |
| Coal | 10 | €1.4M | 40 | 820 | cheapest MWh, densest, dirtiest, air pollution |
| Biomass | 5 | €1.5M | 60 | 230 | "green" depends on the wood |
| Wind | ~3 (×1.3 Nordic) | €2.6M | 8 | 11 | land-hungry, varies ±35 % |
| Solar | ~1.7 (×1.7 Sun Belt) | €1.8M | 5 | 48 | land-hungry, varies ±20 % |
| Dam (river spot) | ~6 (×1.5 Nordic) | €4.5M | 5 | 24 | floods the valley (debt), only one |

The core tension is now **energy density vs. impact**: fossil plants pack lots of MW onto one plot and cost little upfront, so you can fit more halls and serve more clients early; renewables are cheap to run but need several plots and capital. Emission factors are IPCC AR5 life-cycle medians and capacity factors match IRENA 2023 (checked in RES-1, see [sources/SOURCES.md](sources/SOURCES.md)); build and running costs are game values. Renewables cost more to build here than their real-world LCOE suggests (IRENA: new wind and solar are now usually cheaper per MWh than new fossil): with no grid, the premium stands for the storage and backup an off-grid campus needs, and it keeps fossil tempting (GD-3).


- **1 tick = 1 quarter. A run = 20 ticks = 5 years.** Target 3-6 minutes, so roughly 4-6 s per tick with auto-advance (UI decision, task DEV-1), pausing whenever a card is open.
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
lifecycle  = clamp((lifespan / baseLifespan − 0.5) / 1.5) × 60 + clamp((1 − eWasteMultiplier) / 0.7) × 40   half the default lifespan → 0, twice it → 60
footprint  = clamp(1 − (energyThisTick / energyDay1 − 1) / 3) × 100   4× the energy of day one → 0 (planetary boundaries, rebound)

measured       = 0.25·pue + 0.25·carbon + 0.15·water + 0.15·lifecycle + 0.20·footprint
Sustainability = clamp(measured + sustainabilityBonus, 0, 100)    bonus = Σ scoreDelta.sustainability, clamped ±10
```

### Responsibility (0-100), from decisions only

- Starts at 50. Every `scoreDelta.responsibility` is applied with **diminishing returns**: `R += Δ × min(1, (100 − R)/50)` for gains, `× min(1, R/50)` for losses. At R=50 a +8 is +8; at 80 it is +3.2.
- **Trust fades**: each tick R moves 4 % of the way back to 50 (`responsibilityDrift`). You have to keep behaving.

### Run result

```
netWorth   = cash at the end (k€)
profitNorm = clamp(netWorth / 120 000, 0, 1.5)                    (profitReference)
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
S₋₁         = Sustainability recorded at the end of last quarter (no circular dependency)
susTax      = S₋₁ < 50 ? revenue × 0.42 × (50 − S₋₁) / 50 : 0      sustainabilityTaxThreshold, sustainabilityTaxMaxPct
net         = revenue − energyCost − opex − carbonTax − susTax + Σ cashPerTick − capex − refresh
```

- Base `growthRate` comes from the location; upgrades and choices add to it; `growthCap` effects clamp it (min of active caps).
- `failureRate = 0.03 + Σ failureRate + 0.01 × ticks of age beyond 75 % of lifespan`.
- A run is **20 quarters** (5 years, `maxTicks`). Starting point (all locations): 2 MW, €1.5M cash, hardware lifespan 8 quarters (`baseHardwareLifespan`), 16 land plots + 1 river spot (`landPlots`; the river spot is index `landPlots`).
- **Sustainability tax**: every quarter that starts with Sustainability below 50, a share of revenue goes to the state: 0 % at 50, ≈ 25 % at 20, 42 % at 0. Each quarter it applies is logged; the first time, the **Eco-tax law** milestone card explains the rule. Totals in `totals.sustainabilityTax`, and "€X paid in sustainability tax" in the end summary. It is what makes greed hit a wall within 5 years: the greedy player (Sustainability 5-25) gives up 20-40 % of revenue.
- **20-quarter retiming** (from the 40-quarter version): per-tick growth rates doubled (location `baseGrowth`, `growthRate`/`growthCap` effects), every `minTick`, `afterTicks`, `durationTicks` halved, hardware lifespan and lifespan effects halved, a client every 3 quarters (`clientEvery`), up to 4 quiz questions (`maxQuizPerRun`), aging failures +0.02/quarter. Prices per MW ×1.7 (Sun Belt ×2.04, "tax breaks"), wind and solar build costs ×1.4, `marketMW` ×1.6 for the 16-plot campus. Environmental debt keeps its per-quarter rates, so the bill thresholds below are unchanged.

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
| ≥ 30 | `carbon-tax` | €100/t on every tonne from now on (lobbying buys 4 ticks) |
| ≥ 45 | `permit-audit` | €600k fine, or a scandal later if you hide (free if you measured) |
| ≥ 65 | `power-cap` | growth frozen 1 year, or gas turbines (more debt) |
| ≥ 85 | `local-opposition` | permit blocked, clients leave, or pay the community |
| ≥ 110 | `public-scandal` | −8 % to −20 % clients |
| > 80 | continuous churn | up to 3 % of clients leave every tick |

Plus trap-specific bills fired by `delayed` effects: `greenwash-scandal` (offsets without measurement, +4 ticks), `ai-bubble` (70 % chance, +7 ticks after the GPU cluster), `permit-audit` (gas turbines), `water-restriction` (Sun Belt with WUE ≥ 1.5). On top of that, the **sustainability tax** (§5) bites every quarter Sustainability stays below 50.

## 7. Balance targets and current results

The design rules are enforced by `npm run sim` (exit code 1 if broken, also run in CI with 200 runs):

1. **Balance wins**: `balanced` has the highest mean legacy in every location.
2. **Greed hits a wall**: `greedy` gets ≥ 2 bills in ≥ 80 % of runs, and its second half grows less (relative to its first half) than `balanced`'s.
3. **Virtue is viable**: `virtuous` never goes bankrupt and earns ≥ 20 % of the profit reference.
4. **The tension is real**: `greedy` out-earns `virtuous` in the first half and overall.

Results below are from the 20-quarter model with the sustainability tax and 16 land plots. The balanced player (dam or best renewable + gas backup) out-earns greedy (coal) over a full run everywhere; greedy still out-earns pure virtue, and leads balanced in the first half in Paris, Nordic and Coal Valley.

Results of `npm run sim` (1 000 runs per strategy = 250 per location, seeds 1000-1249), 17 Nov 2026, 20 quarters, 16 plots (k€; 1st/2nd half = net-worth gain in each half):

| Location | Strategy | Net worth | Impact | Legacy | Bills | 1st half | 2nd half |
|---|---|---|---|---|---|---|---|
| Paris Basin | greedy | 79 068 | 27 | 421 | 6.9 | 39 394 | 38 175 |
|  | virtuous | 51 754 | 86 | 608 | 0.0 | 19 030 | 31 224 |
|  | **balanced** | 136 152 | 70 | **889** | 3.5 | 36 862 | 97 790 |
| Nordic Fjord | greedy | 52 412 | 27 | 341 | 7.0 | 27 466 | 23 445 |
|  | virtuous | 37 482 | 82 | 506 | 0.0 | 13 886 | 22 096 |
|  | **balanced** | 106 054 | 76 | **820** | 0.2 | 26 137 | 78 417 |
| Coal Valley | greedy | 84 250 | 28 | 444 | 7.0 | 41 229 | 41 521 |
|  | virtuous | 45 110 | 87 | 570 | 0.0 | 15 968 | 27 643 |
|  | **balanced** | 142 716 | 70 | **913** | 3.7 | 39 920 | 101 295 |
| Sun Belt | greedy | 73 073 | 18 | 326 | 8.0 | 27 951 | 43 621 |
|  | virtuous | 64 733 | 77 | 646 | 0.0 | 26 258 | 36 974 |
|  | **balanced** | 144 433 | 61 | **858** | 6.0 | 41 025 | 101 907 |

Reading it:
- Greed earns more than virtue everywhere and leads the first half in Paris, Nordic and Coal Valley; then the sustainability tax and the bills flatten it (its second half grows no more than its first) while balanced grows 2.5-3× in the second half.
- **Sun Belt** is the harshest: water stress drags the greedy Sustainability to ~18, so the tax takes ~35 % of its revenue and balanced leads even in the first half. That is the "it depends" lesson: in a dry place the bill comes faster.
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
- **Balanced still out-earns greedy over a full run in Paris, Nordic and Coal Valley** (GD-3 addressed it partly): renewables now cost more to build, so greed leads the first half everywhere and wins on money in the Sun Belt. In the other three the dam is the reason; raising its cost (tried up to €7M) barely moves the result. Next lever if playtesters still find "green always pays": a lower carbon price or a slower debt build-up for coal.
- **Sun Belt fixed (GD-3)**: greed now leads the first half and the full run on money there.
- **No effect key changes a plant's output** (drought, wind lull): events can only hit money, demand and scores. A `plantOutputPct` effect by plant type would make droughts and protests bite physically (engine change, to open as an issue).
- **Some green upgrades are no-brainers** (hot-aisle containment, free cooling in Paris) because energy is about half of revenue. Realistic, but they reduce choice. The rebound event is the counterweight.
- **The idle strategy (buy nothing, accept everything) out-earns greedy in the Nordics**, because traps cost money. Fine ("shortcuts aren't even profitable there") but worth a playtest.
- Debt thresholds are absolute; a much longer or shorter run needs retuning.
- Quiz answers are fixed order; the UI should shuffle answers (seeded) to avoid "always A".
