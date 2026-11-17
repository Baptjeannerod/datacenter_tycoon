# Content catalog

> **Generated** by `npm run docs:catalog` from `/content`. Do not edit by hand: edit the JSON, then regenerate.
> Units: money in k€, 1 tick = 1 quarter. S = sustainability, R = responsibility. Field meanings: `engine/types.ts`.

**4 locations · 22 upgrades · 16 events · 9 clients · 12 quiz questions**

## Locations

| id | name | PUE | WUE | gCO2e/kWh | water stress | €/MWh | k€/MW/tick | growth | market MW | enabled |
|---|---|---|---|---|---|---|---|---|---|---|
| `paris-basin` | Paris Basin | 1.6 | 1 | 40 | 0.5 | 110 | 720 | 0.04 | 16 | yes |
| `nordic-fjord` | Nordic Fjord | 1.25 | 0.3 | 30 | 0.2 | 60 | 560 | 0.035 | 12 | yes |
| `coal-valley` | Coal Valley | 1.55 | 1 | 650 | 0.6 | 90 | 700 | 0.045 | 16 | yes |
| `sun-belt` | Sun Belt | 1.7 | 1.8 | 380 | 1.5 | 80 | 700 | 0.05 | 20 | yes |

## Upgrades

Family is **hidden from players** until the end screen. Slice = part of the first playable.

| id | family | cost | effects | S / R | delayed | location overrides | slice | confidence |
|---|---|---|---|---|---|---|---|---|
| `hot-aisle-containment` | good | 120 | pue -0.08 | 1 / 0 | — | — | ✓ | approx |
| `raise-temp-setpoint` | tradeoff | 0 | pue -0.06, failureRate +0.01 | 1 / 0 | — | — |  | high |
| `free-cooling` | good | 700 | pue -0.25, wue -0.1 | 3 / 0 | — | nordic-fjord, sun-belt | ✓ | approx |
| `evaporative-cooling` | trap | 250 | pue -0.22, wue +1 | 0 / 0 | — | sun-belt, nordic-fjord |  | approx |
| `liquid-cooling` | good | 1600 | pue -0.3, wue -0.5, failureRate +0.01, cashPerTick -10 | 4 / 1 | — | — |  | illustrative |
| `renewable-ppa` | good | 300 | renewableShare +0.6, cashPerTick -35 | 2 / 3 | — | coal-valley, sun-belt, paris-basin | ✓ | approx |
| `cheap-fossil-contract` | trap | 0 | energyPricePct -0.15, carbonIntensity +300, envDebtPerTick +0.3 | -3 / 0 | — | — |  | illustrative |
| `onsite-solar` | good | 900 | renewableShare +0.12, cashPerTick +12 | 2 / 0 | — | sun-belt, nordic-fjord |  | illustrative |
| `heat-reuse` | good | 900 | cashPerTick +15 | 6 / 2 | — | nordic-fjord |  | approx |
| `energy-monitoring` | good | 150 | pue -0.04, failureRate -0.01, cashPerTick -5 | 0 / 5 | — | — | ✓ | high |
| `extend-hardware-life` | tradeoff | 200 | hardwareLifespan +8, failureRate +0.01, pue +0.02 | 3 / 2 | — | — | ✓ | approx |
| `refurb-circular` | good | 250 | eWasteFactor -0.6, cashPerTick -12 | 4 / 3 | — | — |  | approx |
| `fast-refresh` | trap | 800 | hardwareLifespan -8, itEfficiency +0.12, growthRate +0.01, pricePct +0.05 | -3 / 0 | — | — |  | illustrative |
| `overclock-and-cram` | trap | 0 | pricePct +0.12, failureRate +0.05, pue +0.05, hardwareLifespan -4 | -3 / -2 | — | — | ✓ | illustrative |
| `gpu-hype-cluster` | trap | 1500 | growthRate +0.03, pricePct +0.1, pue +0.06, envDebtPerTick +0.8 | 0 / -6 | 70% +14t → ai-bubble | — | ✓ | approx |
| `gas-turbines` | trap | 400 | growthRate +0.02, energyPricePct +0.1, envDebtPerTick +1.2 | -6 / -3 | +10t → permit-audit | — |  | illustrative |
| `carbon-offsets-greenwash` | trap | 60 | cashPerTick +25, growthRate +0.005 | 0 / 3 | +8t → greenwash-scandal | — | ✓ | approx |
| `frugal-ai-policy` | good | 100 | growthRate -0.004 | 0 / 8 | — | — | ✓ | high |
| `model-right-sizing` | good | 450 | itEfficiency +0.15, cashPerTick -15 | 1 / 3 | — | — |  | high |
| `staff-training` | good | 80 | failureRate -0.005 | 0 / 5 | — | — |  | high |
| `sufficiency-pledge` | tradeoff | 0 | growthCap +0.015 | 4 / 10 | — | — |  | high |
| `water-closed-loop` | good | 500 | wue -0.8, pue +0.04 | 2 / 0 | — | sun-belt |  | approx |

## Events

| id | kind | when | choices | quiz | slice |
|---|---|---|---|---|---|
| `carbon-tax` | consequence | {"statGte":{"envDebt":30}} | `pay` (neutral): no effect<br>`lobby` (greedy): cash -250 · S 0 / R -10 · later: +8t —<br>`clean-contract` (responsible): renewableShare +0.3, cashPerTick -25 · S 2 / R 3 | q-carbon-grid | ✓ |
| `permit-audit` | consequence | {"statGte":{"envDebt":45}} | `show-data` (responsible): S 0 / R 4<br>`fine` (neutral): cash -600 · S 0 / R -2<br>`hide` (greedy): cash -100 · S 0 / R -12 · later: 50% +6t public-scandal | q-frugal-first | ✓ |
| `power-cap` | consequence | {"statGte":{"envDebt":65}} | `accept` (neutral): for 8 ticks: growthCap 0 · S 0 / R 2<br>`turbines` (greedy): cash -400, envDebt +10, envDebtPerTick +1.5 · S -4 / R -8<br>`demand-response` (responsible): for 8 ticks: growthCap 0, cashPerTick +30 · S 0 / R 5 | — |  |
| `local-opposition` | consequence | {"statGte":{"envDebt":85}} | `community` (responsible): cash -500, envDebt -10 · S 0 / R 6<br>`free-heat` (responsible): envDebt -15 · S 0 / R 8<br>`ignore` (greedy): demandPct -0.05 · for 6 ticks: growthCap 0 · S 0 / R -10 | — |  |
| `public-scandal` | consequence | {"statGte":{"envDebt":110}} | `own-it` (responsible): demandPct -0.08, cash -400 · S 0 / R 4<br>`deny` (greedy): demandPct -0.08 · S 0 / R -15 · later: 50% +4t demandPct -0.12 | — |  |
| `water-restriction` | consequence | {"locations":["sun-belt"],"statGte":{"wue":1.5},"minTick":6} | `throttle` (neutral): demandPct -0.15 · for 6 ticks: pue +0.1<br>`truck` (greedy): cash -300, envDebt +12 · S 0 / R -6<br>`closed-loop` (responsible): cash -700, wue -0.8, pue +0.04 · S 3 / R 4 | q-wue |  |
| `greenwash-scandal` | consequence | triggered by a delayed effect | `withdraw` (responsible): demandPct -0.08 · S 0 / R -5<br>`double-down` (greedy): demandPct -0.12 · S 0 / R -15 | q-greenwashing | ✓ |
| `ai-bubble` | consequence | triggered by a delayed effect | `absorb` (neutral): demandPct -0.2<br>`science` (responsible): demandPct -0.12, pricePct -0.05 · S 0 / R 5 | — |  |
| `rebound-surge` | milestone | {"flagsSet":["efficiency-gain"],"minTick":4} | `ride` (greedy): demandPct +0.4 · for 8 ticks: growthRate +0.01 · S 0 / R -2<br>`price-up` (neutral): demandPct +0.15, pricePct +0.03<br>`cap` (responsible): for 8 ticks: growthCap +0.01 · S 5 / R 8 | q-rebound | ✓ |
| `eu-reporting` | milestone | {"minTick":10} | `send-data` (responsible): S 0 / R 5<br>`consultants` (neutral): cash -200 · S 0 / R 1<br>`fudge` (greedy): envDebt +5 · S 0 / R -8 · later: 50% +8t permit-audit | q-eed | ✓ |
| `heatwave` | random | {"minTick":3} | `throttle` (responsible): cash -150 · S 0 / R 2<br>`max-chillers` (neutral): for 2 ticks: pue +0.15<br>`spray` (greedy): envDebt +4 · for 2 ticks: wue +1 | q-pue | ✓ |
| `cascade-failure` | random | {"statGte":{"failureRate":0.07}} | `repair` (neutral): cash -400<br>`degrade` (greedy): demandPct -0.1 · S 0 / R -3 | — |  |
| `ewaste-broker` | random | {"minTick":8} | `take-deal` (greedy): cash +150, envDebt +10 · S 0 / R -8 · later: 40% +6t demandPct -0.05<br>`certified` (responsible): cash -120 · S 2 / R 3 | q-ewaste |  |
| `investor-pressure` | random | {"minTick":5} | `hypergrowth` (greedy): cash +500 · for 8 ticks: growthRate +0.03 · S 0 / R -4<br>`green-terms` (neutral): cash +300 · for 8 ticks: growthRate +0.01 · S 0 / R 1<br>`steady` (responsible): S 0 / R 4 | — |  |
| `chip-shortage` | random | {"minTick":6} | `pay-up` (greedy): cash -400<br>`extend` (responsible): for 6 ticks: failureRate +0.02 · S 1 / R 2<br>`grey-market` (greedy): cash -150, envDebt +4 · S 0 / R -5 | q-lifecycle |  |
| `coal-plant-closure` | random | {"locations":["coal-valley"],"minTick":12} | `welcome` (responsible): carbonIntensity -200, energyPricePct +0.05 · S 0 / R 2<br>`lobby` (greedy): energyPricePct -0.05, envDebt +8 · S 0 / R -10 | q-carbon-grid |  |

## Clients (workload intake)

| id | AI needed? | choices | quiz | slice |
|---|---|---|---|---|
| `astro-gpt` | not-needed | `accept` (greedy): demandPct +0.25, envDebtPerTick +0.3 · S 0 / R -5<br>`refuse` (responsible): S 0 / R 4<br>`alternative` (responsible): demandPct +0.05 · S 0 / R 7 | q-frugal-first | ✓ |
| `hospital-imaging` | needed | `accept` (responsible): demandPct +0.1, pricePct -0.02 · S 0 / R 5<br>`refuse` (neutral): S 0 / R -3<br>`alternative` (responsible): demandPct +0.06 · S 0 / R 6 | — | ✓ |
| `crypto-farm` | not-ai | `accept` (greedy): demandPct +0.5, pricePct +0.03, envDebtPerTick +1.2 · S 0 / R -10<br>`refuse` (responsible): S 0 / R 5 | — |  |
| `bank-faq-bot` | partly | `accept` (greedy): demandPct +0.12 · S 0 / R -2<br>`refuse` (neutral): S 0 / R 1<br>`alternative` (responsible): demandPct +0.04 · S 0 / R 6 | q-ai-alternative | ✓ |
| `autoplay-8k` | not-ai | `accept` (greedy): demandPct +0.3, envDebtPerTick +0.6 · S 0 / R -6<br>`refuse` (responsible): S 0 / R 3<br>`alternative` (responsible): demandPct +0.1 · S 0 / R 6 | — |  |
| `climate-research` | not-ai | `accept` (responsible): demandPct +0.12, pricePct -0.04 · S 0 / R 6<br>`refuse` (greedy): S 0 / R -2 | — |  |
| `deepfake-ads` | not-needed | `accept` (greedy): demandPct +0.3, pricePct +0.04, envDebtPerTick +0.8 · S 0 / R -8<br>`refuse` (responsible): S 0 / R 4<br>`alternative` (responsible): demandPct +0.06 · S 0 / R 5 | q-dc-electricity |  |
| `daily-retrain` | partly | `accept` (greedy): demandPct +0.2, envDebtPerTick +0.4 · S 0 / R -4<br>`refuse` (neutral): S 0 / R 2<br>`alternative` (responsible): demandPct +0.05 · S 0 / R 6 | q-retrain |  |
| `smart-grid` | needed | `accept` (responsible): demandPct +0.06, envDebt -3 · S 0 / R 5<br>`refuse` (neutral): S 0 / R -3 | — |  |

## Quiz

| id | question | answer | confidence | source |
|---|---|---|---|---|
| `q-pue` | Your datacenter has a PUE of 1.5. What does that mean? | For every 1 kWh used by servers, 0.5 kWh more goes to cooling and power losses | high | The Green Grid PUE definition; ISO/IEC 30134-2 |
| `q-dc-electricity` | Roughly what share of the world's electricity did datacenters use in 2024? | About 1.5 % | approx | IEA, Energy and AI (2025) |
| `q-rebound` | Your servers become 2x more efficient, prices drop, and demand triples. What happens to total energy use? | It rises by 50 % | high | Rebound effect / Jevons paradox (arithmetic example); cited in AFNOR Spec 2314 |
| `q-frugal-first` | According to the AFNOR frugal-AI framework, what is the first step of a frugal AI project? | Question the need: is AI really required? | high | AFNOR Spec 2314, General framework for frugal AI (CGDD/SRI/Ecolab), 'How to reduce the impact?' |
| `q-greenwashing` | Which claim is most likely to be greenwashing? | "Carbon neutral thanks to offsets" | approx | Directive (EU) 2024/825; AFNOR Spec 2314 (how to communicate) |
| `q-wue` | What does WUE measure in a datacenter? | Litres of water used per kWh of IT energy | high | The Green Grid WUE definition; ISO/IEC 30134-9 |
| `q-ewaste` | Globally, what share of e-waste was documented as properly collected and recycled in 2022? | About 22 % | approx | Global E-waste Monitor 2024 (UNITAR/ITU) |
| `q-lifecycle` | For a typical smartphone or laptop, which phase causes most of its carbon footprint? | Manufacturing | approx | ADEME-Arcep 2022, environmental footprint of digital in France |
| `q-carbon-grid` | Same server, same workload. Where does it emit the least CO2? | On a hydro or nuclear-heavy grid | high | Ember / IEA country grid intensity data (order of magnitude) |
| `q-eed` | In the EU, which datacenters must report their energy and water figures? | Those with at least 500 kW of IT power | approx | Energy Efficiency Directive (EU) 2023/1791, Art. 12; Delegated Regulation (EU) 2024/1364 |
| `q-ai-alternative` | A bank wants an AI chatbot to answer its 20 most common questions. What's the most frugal option? | A searchable FAQ or decision tree | high | AFNOR Spec 2314: consider alternatives to AI |
| `q-retrain` | When should a model be retrained, according to frugal-AI best practice? | When defined criteria, like data drift, justify it | high | AFNOR Spec 2314: 'Defining criteria justifying retraining model' |
