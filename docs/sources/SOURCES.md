# Sources

> Every player-facing number lives in `/content` with `source` and `confidence`:
> - **high**: checked against the primary source (add the URL when you check it).
> - **approx**: order of magnitude from a named source; **needs a URL check** (task RES-1).
> - **illustrative**: a game number, plausible in direction but not a fact. Never present it as one.

## Primary framework

- **AFNOR Spec 2314, General framework for frugal AI** (CGDD / SRI / Ecolab, Ministère de la Transition écologique). Summary used: 4-page English version "Anglais-Referentiel-general-pour-lIA-frugale". Key ideas used in the game: question the need, identify all solutions incl. non-AI, life cycle, indicators (climate, resources, water), 7 themes of best practices ranked by gain/effort (skills and awareness first), rebound effect, how to communicate (scope, methods, second-order effects). More: https://greentechinnovation.fr/
- Brief: "The SMIC Day, Social Media Impact Challenge" (CentraleSupélec). Not committed (it contains students' names).

## Facts used in content (checked in RES-1, 17 Nov 2026)

Rule used for `confidence`: **high** means every factual claim in the player-facing text (and the number named in `source`) was checked against the URL. Effect magnitudes on upgrades and events (PUE deltas, cash, debt) are always game numbers, documented in `docs/GAME_DESIGN.md`; the `source` says so when it matters.

| Topic | Claim in game | Primary source (checked) | Confidence |
|---|---|---|---|
| Life-cycle emissions | coal 820, gas CC 490, dedicated biomass 230 (range 130-420), utility PV 48, hydro 24 (range 1-2200), onshore wind 11, nuclear 12 gCO2e/kWh (medians) | IPCC AR5 WGIII (2014) Annex III, Table A.III.2: https://www.ipcc.ch/site/assets/uploads/2018/02/ipcc_wg3_ar5_annex-iii.pdf | high |
| Capacity factors | new onshore wind 36 %, utility PV 16 %, hydro 53 %, bioenergy 72 % (global weighted averages, 2023). IPCC full-load hours: wind 1800-3500 h/yr, utility PV 1200-2400 h/yr (2x between poor and good sites) | IRENA, *Renewable Power Generation Costs in 2023*, Table S1: https://www.irena.org/-/media/Files/IRENA/Agency/Publication/2024/Sep/IRENA_Renewable_power_generation_costs_in_2023.pdf ; IPCC Annex III Table A.III.1 | high |
| Datacenter electricity | ~415 TWh, ~1.5 % of world electricity in 2024; more than double to ~945 TWh by 2030 | IEA, *Energy and AI* (2025), executive summary: https://www.iea.org/reports/energy-and-ai/executive-summary | high |
| PUE stagnation | global average PUE ~1.56 in 2024, flat for about five years | Uptime Institute Global Data Center Survey 2024: https://intelligence.uptimeinstitute.com/resource/uptime-institute-global-data-center-survey-2024 | high |
| PUE definition | total facility energy / IT energy | The Green Grid; ISO/IEC 30134-2 | high |
| WUE definition | litres per kWh of IT energy; energy-water trade-off | The Green Grid WP#35: https://www.thegreengrid.org/en/resources/library-and-tools/238-WP ; ISO/IEC 30134-9 | high |
| Inlet temperature | recommended up to 27 °C | ASHRAE TC 9.9 thermal guidelines | high |
| Cooling best practice | containment, free cooling (climate-dependent) | EU Code of Conduct on Data Centre Energy Efficiency: https://e3p.jrc.ec.europa.eu/communities/data-centres-code-conduct | high |
| EU reporting | datacenters with ≥ 500 kW installed IT power publish Annex VII data by 15 May 2024, then yearly | Directive (EU) 2023/1791 Art. 12(1): https://eur-lex.europa.eu/eli/dir/2023/1791/oj ; Delegated Reg. (EU) 2024/1364: https://eur-lex.europa.eu/eli/reg_del/2024/1364/oj | high |
| Waste heat | datacenters with total rated energy input > 1 MW must use waste heat unless technically or economically unfeasible | Directive (EU) 2023/1791 Art. 26(6) (same URL) | high |
| Green claims | ban on product claims of neutral / reduced / positive GHG impact based on offsetting, applies from 27 Sep 2026 | Directive (EU) 2024/825, Annex I point 4c: https://eur-lex.europa.eu/eli/dir/2024/825/oj | high |
| E-waste | 62 Mt in 2022, 22.3 % documented as formally collected and recycled; ~5.1 Mt/yr shipped across borders, ~65 % uncontrolled | Global E-waste Monitor 2024 (UNITAR/ITU): https://ewastemonitor.info/the-global-e-waste-monitor-2024/ | high |
| Device footprint | devices are 79 % of the French digital carbon footprint (datacenters 16 %, networks 5 %); manufacturing is 78 %, use 21 % | ADEME-Arcep, Jan 2022 synthesis: https://www.arcep.fr/uploads/tx_gspublication/etude-numerique-environnement-ademe-arcep-note-synthese_janv2022.pdf | high |
| Carbon price | EU ETS averages ~€80 (2022), ~€84 (2023), ~€65 (2024), ~€73/t (2025) | ICAP EU ETS factsheet: https://icapcarbonaction.com/en/ets/eu-emissions-trading-system-eu-ets | high |
| Grid saturation | EirGrid: no new Dublin-region datacenter connections until 2028 (2022 decision) | https://www.datacenterdynamics.com/en/news/eirgrid-says-no-new-applications-for-data-centers-in-dublin-till-2028 | high |
| Water conflicts | Chile court partly reversed Google's Cerrillos permit over water during a drought (2024); Google moved to air cooling | https://www.datacenterdynamics.com/en/news/chile-partially-reverses-google-data-center-permit-over-water-use-concerns | high |
| Rebound effect | efficiency gains can raise total consumption | AFNOR Spec; Jevons paradox literature | high |

Corrections made during RES-1: the IEA projection is "more than double (~945 TWh) by 2030", not "roughly double"; the recycled share of e-waste is "less than a quarter (22.3 %)", not "about a fifth"; the EED threshold is "500 kW of IT power or more", not "above 500 kW".

## Game numbers (illustrative by design)

Revenue per MW, capex, opex, debt thresholds, client demand changes, event costs and all of `content/balance.json` are tuned for play, not measured. They are labelled `illustrative` or documented as game design in `docs/GAME_DESIGN.md`.
