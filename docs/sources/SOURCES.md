# Sources

> Every player-facing number lives in `/content` with `source` and `confidence`:
> - **high**: checked against the primary source (add the URL when you check it).
> - **approx**: order of magnitude from a named source; **needs a URL check** (task RES-1).
> - **illustrative**: a game number, plausible in direction but not a fact. Never present it as one.

## Primary framework

- **AFNOR Spec 2314, General framework for frugal AI** (CGDD / SRI / Ecolab, Ministère de la Transition écologique). Summary used: 4-page English version "Anglais-Referentiel-general-pour-lIA-frugale". Key ideas used in the game: question the need, identify all solutions incl. non-AI, life cycle, indicators (climate, resources, water), 7 themes of best practices ranked by gain/effort (skills and awareness first), rebound effect, how to communicate (scope, methods, second-order effects). More: https://greentechinnovation.fr/
- Brief: "The SMIC Day, Social Media Impact Challenge" (CentraleSupélec). Not committed (it contains students' names).

## Facts used in content (to verify in RES-1)

| Topic | Claim in game | Source to check | Confidence |
|---|---|---|---|
| Datacenter electricity | ~415 TWh, ~1.5 % of world electricity in 2024; roughly doubling by 2030 | IEA, *Energy and AI* (2025) | approx |
| PUE definition | total facility energy / IT energy | The Green Grid; ISO/IEC 30134-2 | high |
| WUE definition | litres per kWh of IT energy | The Green Grid; ISO/IEC 30134-9 | high |
| Inlet temperature | recommended up to 27 °C | ASHRAE TC 9.9 thermal guidelines | high |
| EU reporting | datacenters ≥ 500 kW IT must report KPIs yearly | Directive (EU) 2023/1791 Art. 12; Delegated Reg. (EU) 2024/1364 | approx |
| Waste heat | datacenters > 1 MW must reuse waste heat unless not feasible | Directive (EU) 2023/1791 | approx |
| Green claims | ban on product neutrality claims based on offsetting | Directive (EU) 2024/825 | approx |
| E-waste | 62 Mt in 2022, 22.3 % documented as formally collected and recycled | Global E-waste Monitor 2024 (UNITAR/ITU) | approx |
| Device footprint | manufacturing dominates the footprint of devices | ADEME-Arcep 2022 study | approx |
| Grid intensity | France ~20-60 g, Nordic hydro < 50 g, coal grids 600-800 g CO2e/kWh | RTE Bilan électrique; Ember country data | approx |
| Carbon price | EU ETS around €60-100/t in recent years | EU ETS market data | approx |
| Rebound effect | efficiency gains can raise total consumption | AFNOR Spec; Jevons paradox literature | high |

## Game numbers (illustrative by design)

Revenue per MW, capex, opex, debt thresholds, client demand changes, event costs and all of `content/balance.json` are tuned for play, not measured. They are labelled `illustrative` or documented as game design in `docs/GAME_DESIGN.md`.
