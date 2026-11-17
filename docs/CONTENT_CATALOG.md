# Content catalog

> **Generated** by `npm run docs:catalog` from `/content`. Do not edit by hand: edit the JSON, then regenerate.
> Units: money in k€, 1 tick = 1 quarter. S = sustainability, R = responsibility. Field meanings: `engine/types.ts`.

**4 locations · 29 upgrades · 17 events · 9 clients · 12 quiz questions**

## Locations

| id | name | PUE | WUE | water stress | wind | sun | river | fuel price | k€/MW/tick | growth | market MW | enabled |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `paris-basin` | Paris Basin | 1.6 | 1 | 0.5 | 1 | 0.9 | 1 | 1 | 1224 | 0.145 | 18 | yes |
| `nordic-fjord` | Nordic Fjord | 1.25 | 0.3 | 0.2 | 1.3 | 0.6 | 1.5 | 1.1 | 1054 | 0.124 | 14 | yes |
| `coal-valley` | Coal Valley | 1.55 | 1 | 0.6 | 0.9 | 0.9 | 0.8 | 0.75 | 1190 | 0.156 | 18 | yes |
| `sun-belt` | Sun Belt | 1.7 | 1.8 | 1.5 | 0.7 | 1.7 | 0.35 | 0.9 | 1428 | 0.166 | 22 | yes |

## Buildings

Built on map plots (8 land plots + 1 river spot). There is no grid: halls run only on power from your plants.

| id | kind | placement | cost | IT MW | nameplate MW | capacity factor | resource | €/MWh | gCO2e/kWh | water m³/MWh | effects | confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `datacenter-hall` | datacenter | land | 1500 | 2 | — | — | — | — | — | — | — | illustrative |
| `gas-plant` | plant (gas) | land | 1000 | — | 6 | 1 | — | 70 | 490 | 0.6 | — | approx |
| `coal-plant` | plant (coal) | land | 1400 | — | 10 | 1 | — | 40 | 820 | 1.9 | envDebtPerTick +0.6 | approx |
| `biomass-plant` | plant (biomass) | land | 1500 | — | 5 | 1 | — | 60 | 230 | 1.5 | envDebtPerTick +0.3 | approx |
| `wind-farm` | plant (wind) | land | 2520 | — | 9 | 0.33 | wind | 8 | 11 | 0 | — | approx |
| `solar-farm` | plant (solar) | land | 1680 | — | 12 | 0.16 | solar | 5 | 48 | 0 | — | approx |
| `dam` | plant (hydro) | river | 3500 | — | 14 | 0.45 | river | 5 | 24 | 0 | envDebt +6, envDebtPerTick +0.15 | approx |

## Upgrades

Family is **hidden from players** until the end screen. Slice = part of the first playable.

| id | scope | family | cost | power MW | effects | S / R | delayed | location overrides | confidence |
|---|---|---|---|---|---|---|---|---|---|
| `hot-aisle-containment` | hall | good | 120 | — | pue -0.08 | 1 / 0 | — | — | approx |
| `raise-temp-setpoint` | policy | tradeoff | 0 | — | pue -0.06, failureRate +0.01 | 1 / 0 | — | — | high |
| `free-cooling` | hall | good | 700 | — | pue -0.25, wue -0.1 | 3 / 0 | — | nordic-fjord, sun-belt | approx |
| `evaporative-cooling` | hall | trap | 250 | — | pue -0.22, wue +1 | 0 / 0 | — | sun-belt, nordic-fjord | approx |
| `liquid-cooling` | hall | good | 1600 | 0.1 | pue -0.3, wue -0.5, failureRate +0.01, cashPerTick -10 | 4 / 1 | — | — | illustrative |
| `heat-reuse` | hall | good | 900 | 0.1 | cashPerTick +15 | 6 / 2 | — | nordic-fjord | approx |
| `energy-monitoring` | policy | good | 150 | — | pue -0.04, failureRate -0.01, cashPerTick -5 | 0 / 5 | — | — | high |
| `extend-hardware-life` | hall | tradeoff | 200 | — | hardwareLifespan +4, failureRate +0.01, pue +0.02 | 3 / 2 | — | — | approx |
| `refurb-circular` | policy | good | 250 | — | eWasteFactor -0.6, cashPerTick -12 | 4 / 3 | — | — | approx |
| `fast-refresh` | policy | trap | 800 | — | hardwareLifespan -4, itEfficiency +0.12, growthRate +0.02, pricePct +0.05 | -3 / 0 | — | — | illustrative |
| `overclock-and-cram` | hall | trap | 0 | 0.3 | pricePct +0.12, failureRate +0.05, pue +0.05, hardwareLifespan -2 | -3 / -2 | — | — | illustrative |
| `gpu-hype-cluster` | hall | trap | 1500 | 0.5 | growthRate +0.06, pricePct +0.1, pue +0.06, envDebtPerTick +0.8 | 0 / -6 | 70% +7t → ai-bubble | — | approx |
| `carbon-offsets-greenwash` | policy | trap | 60 | — | cashPerTick +25, growthRate +0.01 | 0 / 3 | +4t → greenwash-scandal | — | approx |
| `frugal-ai-policy` | policy | good | 100 | — | growthRate -0.008 | 0 / 8 | — | — | high |
| `model-right-sizing` | policy | good | 450 | — | itEfficiency +0.15, cashPerTick -15 | 1 / 3 | — | — | high |
| `staff-training` | policy | good | 80 | — | failureRate -0.005 | 0 / 5 | — | — | high |
| `sufficiency-pledge` | policy | tradeoff | 0 | — | growthCap +0.03 | 4 / 10 | — | — | high |
| `water-closed-loop` | hall | good | 500 | 0.1 | wue -0.8, pue +0.04 | 2 / 0 | — | sun-belt | approx |
| `coal-scrubbers` | plant (coal) | good | 600 | — | envDebtPerTick -0.4, costPct +0.1 | 2 / 2 | — | — | illustrative |
| `cheap-lignite` | plant (coal) | trap | 0 | — | envDebtPerTick +0.5, costPct -0.3, carbonPct +0.15 | -3 / 0 | — | — | illustrative |
| `carbon-capture` | plant (coal, gas) | tradeoff | 2500 | — | carbonPct -0.7, costPct +0.35, outputPct -0.2 | 4 / 0 | — | — | illustrative |
| `gas-heat-recovery` | plant (gas) | good | 500 | — | outputPct +0.15 | 2 / 0 | — | — | illustrative |
| `methane-leak-checks` | plant (gas) | good | 200 | — | carbonPct -0.12 | 0 / 2 | — | — | illustrative |
| `certified-wood` | plant (biomass) | good | 300 | — | envDebtPerTick -0.25, costPct +0.25 | 0 / 3 | — | — | illustrative |
| `imported-pellets` | plant (biomass) | trap | 0 | — | envDebtPerTick +0.5, costPct -0.3, carbonPct +0.4 | -2 / 0 | — | — | illustrative |
| `bigger-rotors` | plant (wind) | good | 900 | — | outputPct +0.3 | 1 / 0 | — | — | illustrative |
| `battery-storage` | plant (wind, solar) | good | 800 | — | variabilityPct -0.6, outputPct +0.05 | 1 / 0 | — | — | illustrative |
| `solar-trackers` | plant (solar) | good | 600 | — | outputPct +0.25 | 1 / 0 | — | — | illustrative |
| `fish-ladders` | plant (hydro) | good | 400 | — | envDebtPerTick -0.2, outputPct -0.05 | 0 / 4 | — | — | illustrative |

## Events

| id | kind | when | choices | quiz | slice |
|---|---|---|---|---|---|
| `carbon-tax` | consequence | {"statGte":{"envDebt":30}} | `pay` (neutral): no effect<br>`lobby` (greedy): cash -250 · S 0 / R -10 · later: +4t —<br>`phase-out` (responsible): S 1 / R 4 | q-carbon-grid | ✓ |
| `permit-audit` | consequence | {"statGte":{"envDebt":45}} | `show-data` (responsible): S 0 / R 4<br>`fine` (neutral): cash -600 · S 0 / R -2<br>`hide` (greedy): cash -100 · S 0 / R -12 · later: 50% +3t public-scandal | q-frugal-first | ✓ |
| `power-cap` | consequence | {"statGte":{"envDebt":65}} | `accept` (neutral): for 4 ticks: growthCap 0 · S 0 / R 2<br>`lobby` (greedy): cash -300, envDebt +6 · S 0 / R -8<br>`demand-response` (responsible): for 4 ticks: growthCap 0, cashPerTick +30 · S 0 / R 5 | — |  |
| `local-opposition` | consequence | {"statGte":{"envDebt":85}} | `community` (responsible): cash -500, envDebt -10 · S 0 / R 6<br>`free-heat` (responsible): envDebt -15 · S 0 / R 8<br>`ignore` (greedy): demandPct -0.05 · for 3 ticks: growthCap 0 · S 0 / R -10 | — |  |
| `public-scandal` | consequence | {"statGte":{"envDebt":110}} | `own-it` (responsible): demandPct -0.08, cash -400 · S 0 / R 4<br>`deny` (greedy): demandPct -0.08 · S 0 / R -15 · later: 50% +2t demandPct -0.12 | — |  |
| `water-restriction` | consequence | {"locations":["sun-belt"],"statGte":{"wue":1.5},"minTick":3} | `throttle` (neutral): demandPct -0.15 · for 3 ticks: pue +0.1<br>`truck` (greedy): cash -300, envDebt +12 · S 0 / R -6<br>`closed-loop` (responsible): cash -700, wue -0.8, pue +0.04 · S 3 / R 4 | q-wue |  |
| `greenwash-scandal` | consequence | triggered by a delayed effect | `withdraw` (responsible): demandPct -0.08 · S 0 / R -5<br>`double-down` (greedy): demandPct -0.12 · S 0 / R -15 | q-greenwashing | ✓ |
| `ai-bubble` | consequence | triggered by a delayed effect | `absorb` (neutral): demandPct -0.2<br>`science` (responsible): demandPct -0.12, pricePct -0.05 · S 0 / R 5 | — |  |
| `rebound-surge` | milestone | {"flagsSet":["efficiency-gain"],"minTick":2} | `ride` (greedy): demandPct +0.4 · for 4 ticks: growthRate +0.02 · S 0 / R -2<br>`price-up` (neutral): demandPct +0.15, pricePct +0.03<br>`cap` (responsible): for 4 ticks: growthCap +0.02 · S 5 / R 8 | q-rebound | ✓ |
| `eu-reporting` | milestone | {"minTick":5} | `send-data` (responsible): S 0 / R 5<br>`consultants` (neutral): cash -200 · S 0 / R 1<br>`fudge` (greedy): envDebt +5 · S 0 / R -8 · later: 50% +4t permit-audit | q-eed | ✓ |
| `heatwave` | random | {"minTick":2} | `throttle` (responsible): cash -150 · S 0 / R 2<br>`max-chillers` (neutral): for 1 ticks: pue +0.15<br>`spray` (greedy): envDebt +4 · for 1 ticks: wue +1 | q-pue | ✓ |
| `cascade-failure` | random | {"statGte":{"failureRate":0.07}} | `repair` (neutral): cash -400<br>`degrade` (greedy): demandPct -0.1 · S 0 / R -3 | — |  |
| `ewaste-broker` | random | {"minTick":4} | `take-deal` (greedy): cash +150, envDebt +10 · S 0 / R -8 · later: 40% +3t demandPct -0.05<br>`certified` (responsible): cash -120 · S 2 / R 3 | q-ewaste |  |
| `investor-pressure` | random | {"minTick":3} | `hypergrowth` (greedy): cash +500 · for 4 ticks: growthRate +0.06 · S 0 / R -4<br>`green-terms` (neutral): cash +300 · for 4 ticks: growthRate +0.02 · S 0 / R 1<br>`steady` (responsible): S 0 / R 4 | — |  |
| `chip-shortage` | random | {"minTick":3} | `pay-up` (greedy): cash -400<br>`extend` (responsible): for 3 ticks: failureRate +0.02 · S 1 / R 2<br>`grey-market` (greedy): cash -150, envDebt +4 · S 0 / R -5 | q-lifecycle |  |
| `fuel-price-spike` | random | {"minTick":4} | `pay` (neutral): for 4 ticks: energyPricePct +0.4<br>`dirtier` (greedy): envDebt +8 · for 4 ticks: energyPricePct +0.1 · S 0 / R -5<br>`hedge` (responsible): cash -400 | q-carbon-grid |  |
| `eco-tax-law` | milestone | {"minTick":1,"statLte":{"sustainability":49.9}} | `clean-up` (responsible): S 0 / R 2<br>`pay` (greedy): no effect | — |  |

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
