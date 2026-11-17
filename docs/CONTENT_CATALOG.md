# Content catalog

> **Generated** by `npm run docs:catalog` from `/content`. Do not edit by hand: edit the JSON, then regenerate.
> Units: money in k€, 1 tick = 1 quarter. S = sustainability, R = responsibility. Field meanings: `engine/types.ts`.

**4 locations · 29 upgrades · 20 events · 10 clients · 18 quiz questions**

## Locations

| id | name | PUE | WUE | water stress | wind | sun | river | fuel price | k€/MW/tick | growth | market MW | enabled |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `paris-basin` | Paris Basin | 1.6 | 1 | 0.5 | 1 | 0.9 | 1 | 1 | 720 | 0.07 | 18 | yes |
| `nordic-fjord` | Nordic Fjord | 1.25 | 0.3 | 0.2 | 1.3 | 0.6 | 1.5 | 1.1 | 620 | 0.06 | 14 | yes |
| `coal-valley` | Coal Valley | 1.55 | 1 | 0.6 | 0.9 | 0.9 | 0.8 | 0.75 | 700 | 0.075 | 18 | yes |
| `sun-belt` | Sun Belt | 1.7 | 1.8 | 1.5 | 0.7 | 1.7 | 0.35 | 0.9 | 700 | 0.08 | 22 | yes |

## Buildings

Built on map plots (8 land plots + 1 river spot). There is no grid: halls run only on power from your plants.

| id | kind | placement | cost | IT MW | nameplate MW | capacity factor | resource | €/MWh | gCO2e/kWh | water m³/MWh | effects | confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `datacenter-hall` | datacenter | land | 1500 | 2 | — | — | — | — | — | — | — | illustrative |
| `gas-plant` | plant (gas) | land | 1000 | — | 6 | 1 | — | 70 | 490 | 0.6 | — | high |
| `coal-plant` | plant (coal) | land | 1400 | — | 10 | 1 | — | 40 | 820 | 1.9 | envDebtPerTick +0.6 | high |
| `biomass-plant` | plant (biomass) | land | 1500 | — | 5 | 1 | — | 60 | 230 | 1.5 | envDebtPerTick +0.3 | high |
| `wind-farm` | plant (wind) | land | 2600 | — | 9 | 0.33 | wind | 8 | 11 | 0 | — | high |
| `solar-farm` | plant (solar) | land | 1800 | — | 12 | 0.16 | solar | 5 | 48 | 0 | — | high |
| `dam` | plant (hydro) | river | 4500 | — | 14 | 0.45 | river | 5 | 24 | 0 | envDebt +6, envDebtPerTick +0.15 | high |

## Upgrades

Family is **hidden from players** until the end screen. Slice = part of the first playable.

| id | scope | family | cost | power MW | effects | S / R | delayed | location overrides | confidence |
|---|---|---|---|---|---|---|---|---|---|
| `hot-aisle-containment` | hall | good | 120 | — | pue -0.08 | 1 / 0 | — | — | high |
| `raise-temp-setpoint` | policy | tradeoff | 0 | — | pue -0.06, failureRate +0.01 | 1 / 0 | — | — | high |
| `free-cooling` | hall | good | 700 | — | pue -0.25, wue -0.1 | 3 / 0 | — | nordic-fjord, sun-belt | high |
| `evaporative-cooling` | hall | trap | 250 | — | pue -0.22, wue +1 | 0 / 0 | — | sun-belt, nordic-fjord | high |
| `liquid-cooling` | hall | good | 1600 | 0.1 | pue -0.3, wue -0.5, failureRate +0.01, cashPerTick -10 | 4 / 1 | — | — | illustrative |
| `heat-reuse` | hall | good | 900 | 0.1 | cashPerTick +15 | 6 / 2 | — | nordic-fjord | high |
| `energy-monitoring` | policy | good | 150 | — | pue -0.04, failureRate -0.01, cashPerTick -5 | 0 / 5 | — | — | high |
| `extend-hardware-life` | hall | tradeoff | 200 | — | hardwareLifespan +8, failureRate +0.01, pue +0.02 | 3 / 2 | — | — | high |
| `refurb-circular` | policy | good | 250 | — | eWasteFactor -0.6, cashPerTick -12 | 4 / 3 | — | — | high |
| `fast-refresh` | policy | trap | 800 | — | hardwareLifespan -8, itEfficiency +0.12, growthRate +0.01, pricePct +0.05 | -3 / 0 | — | — | illustrative |
| `overclock-and-cram` | hall | trap | 0 | 0.3 | pricePct +0.12, failureRate +0.05, pue +0.05, hardwareLifespan -4 | -3 / -2 | — | — | illustrative |
| `gpu-hype-cluster` | hall | trap | 1500 | 0.5 | growthRate +0.03, pricePct +0.1, pue +0.06, envDebtPerTick +0.8 | 0 / -6 | 70% +14t → ai-bubble | — | high |
| `carbon-offsets-greenwash` | policy | trap | 60 | — | cashPerTick +25, growthRate +0.005 | 0 / 3 | +8t → greenwash-scandal | — | high |
| `frugal-ai-policy` | policy | good | 100 | — | growthRate -0.004 | 0 / 8 | — | — | high |
| `model-right-sizing` | policy | good | 450 | — | itEfficiency +0.15, cashPerTick -15 | 1 / 3 | — | — | high |
| `staff-training` | policy | good | 80 | — | failureRate -0.005 | 0 / 5 | — | — | high |
| `sufficiency-pledge` | policy | tradeoff | 0 | — | growthCap +0.015 | 4 / 10 | — | — | high |
| `water-closed-loop` | hall | good | 500 | 0.1 | wue -0.8, pue +0.04 | 2 / 0 | — | sun-belt | high |
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
| `carbon-tax` | consequence | {"statGte":{"envDebt":30}} | `pay` (neutral): no effect<br>`lobby` (greedy): cash -250 · S 0 / R -10 · later: +8t —<br>`phase-out` (responsible): S 1 / R 4 | q-carbon-grid | ✓ |
| `permit-audit` | consequence | {"statGte":{"envDebt":45}} | `show-data` (responsible): S 0 / R 4<br>`fine` (neutral): cash -600 · S 0 / R -2<br>`hide` (greedy): cash -100 · S 0 / R -12 · later: 50% +6t public-scandal | q-frugal-first | ✓ |
| `power-cap` | consequence | {"statGte":{"envDebt":65}} | `accept` (neutral): for 8 ticks: growthCap 0 · S 0 / R 2<br>`lobby` (greedy): cash -300, envDebt +6 · S 0 / R -8<br>`demand-response` (responsible): for 8 ticks: growthCap 0, cashPerTick +30 · S 0 / R 5 | — |  |
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
| `investor-pressure` | random | {"minTick":5} | `hypergrowth` (greedy): cash +500 · for 8 ticks: growthRate +0.03 · S 0 / R -4<br>`green-terms` (neutral): cash +300 · for 8 ticks: growthRate +0.01 · S 0 / R 1<br>`steady` (responsible): S 0 / R 4 | q-governance-rebound |  |
| `chip-shortage` | random | {"minTick":6} | `pay-up` (greedy): cash -400<br>`extend` (responsible): for 6 ticks: failureRate +0.02 · S 1 / R 2<br>`grey-market` (greedy): cash -150, envDebt +4 · S 0 / R -5 | q-lifecycle |  |
| `fuel-price-spike` | random | {"minTick":8} | `pay` (neutral): for 8 ticks: energyPricePct +0.4<br>`dirtier` (greedy): envDebt +8 · for 8 ticks: energyPricePct +0.1 · S 0 / R -5<br>`hedge` (responsible): cash -400 | q-carbon-grid |  |
| `drought-cooling` | random | {"flagsSet":["built-thermal"],"minTick":6} | `cut-back` (responsible): for 1 ticks: pricePct -0.12 · S 1 / R 4<br>`buy-water` (neutral): cash -350, envDebt +2<br>`keep-pumping` (greedy): envDebt +8 · S 0 / R -6 · later: 60% +4t cash -500 | q-thermal-water |  |
| `coal-protest` | consequence | {"flagsSet":["built-coal"],"minTick":6} | `filters` (responsible): cash -600, envDebt -4 · S 1 / R 5<br>`pr` (neutral): cash -150 · S 0 / R -2<br>`wait` (greedy): envDebt +5 · S 0 / R -6 · later: 50% +6t demandPct -0.06 | q-land-use |  |
| `pellet-scandal` | consequence | {"flagsSet":["built-biomass"],"minTick":8} | `certify` (responsible): cashPerTick -20 · S 2 / R 4<br>`audit` (neutral): cash -200 · S 0 / R 1<br>`spin` (greedy): envDebt +4 · S 0 / R -6 · later: 50% +6t greenwash-scandal | q-lifecycle-emissions |  |
| `wind-coop` | random | {"minTick":6} | `co-own` (responsible): cash -500, cashPerTick +15 · S 1 / R 6<br>`lease` (neutral): cashPerTick +8 · S 0 / R 1<br>`sell-hill` (greedy): cash +400, envDebtPerTick +0.2 · S 0 / R -5 | q-capacity-factor |  |

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
| `streamleaf` | not-ai | `accept` (greedy): demandPct +0.15, cashPerTick +20 · S 0 / R -4 · later: 60% +8t greenwash-scandal<br>`honest` (neutral): demandPct +0.08 · S 0 / R 2<br>`alternative` (responsible): demandPct +0.04 · S 1 / R 6 | q-devices-footprint |  |

## Quiz

| id | question | answer | confidence | source |
|---|---|---|---|---|
| `q-pue` | Your datacenter has a PUE of 1.5. What does that mean? | For every 1 kWh used by servers, 0.5 kWh more goes to cooling and power losses | high | The Green Grid PUE definition; ISO/IEC 30134-2 |
| `q-dc-electricity` | Roughly what share of the world's electricity did datacenters use in 2024? | About 1.5 % | high | IEA, Energy and AI (2025), executive summary: ~415 TWh, ~1.5 % of world electricity in 2024; ~945 TWh by 2030. https://www.iea.org/reports/energy-and-ai/executive-summary |
| `q-rebound` | Your servers become 2x more efficient, prices drop, and demand triples. What happens to total energy use? | It rises by 50 % | high | Rebound effect / Jevons paradox (arithmetic example); cited in AFNOR Spec 2314 |
| `q-frugal-first` | According to the AFNOR frugal-AI framework, what is the first step of a frugal AI project? | Question the need: is AI really required? | high | AFNOR Spec 2314, General framework for frugal AI (CGDD/SRI/Ecolab), 'How to reduce the impact?' |
| `q-greenwashing` | Which claim is most likely to be greenwashing? | "Carbon neutral thanks to offsets" | high | Directive (EU) 2024/825, Annex I point 4c (offset-based neutrality claims banned); AFNOR Spec 2314 (how to communicate). https://eur-lex.europa.eu/eli/dir/2024/825/oj |
| `q-wue` | What does WUE measure in a datacenter? | Litres of water used per kWh of IT energy | high | The Green Grid WUE definition; ISO/IEC 30134-9 |
| `q-ewaste` | Globally, what share of e-waste was documented as properly collected and recycled in 2022? | About 22 % | high | Global E-waste Monitor 2024 (UNITAR/ITU): 62 Mt in 2022, 22.3 % documented as formally collected and recycled. https://ewastemonitor.info/the-global-e-waste-monitor-2024/ |
| `q-lifecycle` | For a typical smartphone or laptop, which phase causes most of its carbon footprint? | Manufacturing | high | ADEME-Arcep (Jan 2022): devices are 65-90 % of the digital footprint depending on the indicator; manufacturing is 78 % of the carbon footprint. https://www.arcep.fr/uploads/tx_gspublication/etude-numerique-environnement-ademe-arcep-note-synthese_janv2022.pdf |
| `q-carbon-grid` | Same server, same workload. Where does it emit the least CO2? | On a hydro or nuclear-heavy grid | high | Ember / IEA country grid intensity data (order of magnitude) |
| `q-eed` | In the EU, which datacenters must report their energy and water figures? | Those with at least 500 kW of IT power | high | Energy Efficiency Directive (EU) 2023/1791, Art. 12(1) (≥ 500 kW installed IT power, yearly); Delegated Regulation (EU) 2024/1364. https://eur-lex.europa.eu/eli/dir/2023/1791/oj ; https://eur-lex.europa.eu/eli/reg_del/2024/1364/oj |
| `q-ai-alternative` | A bank wants an AI chatbot to answer its 20 most common questions. What's the most frugal option? | A searchable FAQ or decision tree | high | AFNOR Spec 2314: consider alternatives to AI |
| `q-retrain` | When should a model be retrained, according to frugal-AI best practice? | When defined criteria, like data drift, justify it | high | AFNOR Spec 2314: 'Defining criteria justifying retraining model' |
| `q-land-use` | A wind farm and a coal plant make the same electricity. Which needs more land? | The wind farm: about 12× the area, but fields between turbines stay farmed | high | Lovering et al. (2022), Land-use intensity of electricity production, PLOS ONE 17(7): e0270155, medians in ha per TWh/yr: onshore wind 12 000 with spacing, 130 footprint only; coal 1 000 incl. mining; ground PV 2 000; dedicated biomass 58 000. https://doi.org/10.1371/journal.pone.0270155 |
| `q-capacity-factor` | A solar farm is rated 10 MW. How much does it deliver on average over a year? | About 1.6 MW | high | IRENA, Renewable Power Generation Costs in 2023, Table S1: global weighted-average capacity factor of new utility PV 16 %, onshore wind 36 %. https://www.irena.org/-/media/Files/IRENA/Agency/Publication/2024/Sep/IRENA_Renewable_power_generation_costs_in_2023.pdf |
| `q-lifecycle-emissions` | Counting construction, fuel and dismantling, how much CO2 does onshore wind emit per kWh? Coal emits about 820 g. | About 11 g | high | IPCC AR5 WGIII (2014) Annex III, Table A.III.2, life-cycle medians (gCO2e/kWh): wind onshore 11, utility PV 48, biomass dedicated 230, gas CC 490, coal 820. https://www.ipcc.ch/site/assets/uploads/2018/02/ipcc_wg3_ar5_annex-iii.pdf |
| `q-devices-footprint` | In France, which part of digital tech had the biggest carbon footprint in the 2022 ADEME-Arcep study? | User devices (phones, TVs, laptops) | high | ADEME-Arcep (Jan 2022), environmental footprint of digital in France (2020 data): devices 79 %, datacenters 16 %, networks 5 % of the carbon footprint; manufacturing 78 %. https://www.arcep.fr/uploads/tx_gspublication/etude-numerique-environnement-ademe-arcep-note-synthese_janv2022.pdf |
| `q-thermal-water` | Which power plants consume the most cooling water per MWh? | Coal and other steam plants | high | Macknick et al. (2012), Operational water consumption factors for electricity generating technologies, Environ. Res. Lett. 7 045802, medians with cooling towers: coal 687, biopower 553, gas CC 205, PV 1, wind 0 gal/MWh (coal ~2.6 m3/MWh, gas ~0.8). https://doi.org/10.1088/1748-9326/7/4/045802 |
| `q-governance-rebound` | Your AI service got twice as efficient per request, and usage tripled. What should your governance track? | Total energy and emissions, not just efficiency per request | high | AFNOR Spec 2314, General framework for frugal AI (CGDD/Ecolab, June 2024): rebound effect, absolute indicators. https://www.ecologie.gouv.fr/presse/publication-du-referentiel-general-lia-frugale-sattaquer-limpact-environnemental-lia |
