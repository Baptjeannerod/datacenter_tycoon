# Pitch: Datacenter Tycoon (5 slides, 5 minutes)

> COM-3. Speaker notes for the 17:15 pitch. One slide per minute. Lines in quotes are meant to be said out loud.
> Every number below is sourced in [sources/SOURCES.md](sources/SOURCES.md) or comes from `npm run sim` ([GAME_DESIGN.md §7](GAME_DESIGN.md)).
> Before going on stage: open https://datacenter-tycoon-plum.vercel.app on the demo phone, mirrored to the projector, and `/dashboard` in a second tab if DEV-7 is live.

---

## Slide 1 · The problem (0:00-1:00)

**On screen:** "415 TWh" in big type. Under it: "datacenters, 2024 = 1.5 % of world electricity → ~945 TWh by 2030 (IEA)".

**Say:**
- "In 2024 datacenters used about 415 terawatt-hours, 1.5 % of the world's electricity. The IEA expects that to more than double by 2030, mostly because of AI."
- "But the footprint isn't only electricity. In France, about 80 % of the digital carbon footprint comes from our devices, and most of it from manufacturing them (ADEME-Arcep, 2020 data)."
- "Students hear 'be frugal' and nod. Nobody feels the trade-off. So we made it something you play."

## Slide 2 · The game in 30 seconds (1:00-2:00): live demo

**On screen:** the phone, mirrored.

**Do (rehearsed, 30 s):** tap Start → tap an empty plot → build a **coal plant** (show it's cheap and dense) → tap another plot → build a **hall** → a client card arrives → **propose the lighter alternative** → let a quarter tick → show the two score bars move.

**Say:**
- "You run a datacenter campus for ten years. There is no grid: every megawatt comes from a plant you build yourself: coal, gas, biomass, wind, sun or a dam."
- "Coal is cheap and fits on one plot. Wind is clean but needs several plots and more capital. That's the real trade-off: energy density against impact."
- "Clients knock: accept, refuse, or propose something lighter. Events hit you: a drought, a protest at your coal plant, a pellet scandal. And a quiz question after the big moments."
- "Three to six minutes, one thumb, no sign-up."

## Slide 3 · What you learn: the AFNOR frugal-AI framework, as mechanics (2:00-3:00)

**On screen:** a two-column table.

| AFNOR Spec 2314 idea | What you do in the game |
|---|---|
| Question the need | Accept / refuse / *propose a lighter alternative* to every client |
| Consider non-AI solutions | "Templates instead of an LLM", "FAQ instead of a chatbot" |
| Whole life cycle | Servers age; keep them longer or refresh (e-waste, embodied carbon) |
| Indicators: energy, carbon, water | PUE, WUE, life-cycle gCO2e/kWh of each plant (IPCC) |
| Measure before you claim | Metering defuses audits; "carbon neutral" offsets backfire (EU 2024/825) |
| Rebound effect | Efficiency arms a demand surge; total footprint is scored, not per request |
| Governance and skills | Frugal-AI checklist, staff training, EU reporting (EED 2023/1791) |

**Say:**
- "Every line of the AFNOR framework is a decision, not a text box. You don't read 'question the need': you refuse a horoscope LLM and see what it costs you."
- "18 quiz questions, all sourced: IPCC, IEA, IRENA, the EU directives, ADEME-Arcep. Nothing invented: game numbers are labelled as game numbers."

## Slide 4 · Key numbers (3:00-4:00)

**On screen:** left, the balance sim; right, live dashboard tiles (if DEV-7 is live).

From the sim (1 000 scripted runs per strategy, 4 valleys):
- **Greed pays first, everywhere:** the coal-first player leads the first five years in all four valleys (Paris: €24.6M vs €19.8M for the balanced player).
- **Then the bill arrives:** ≥ 2 bills (carbon tax, audits, protests, churn) in 100 % of greedy runs; its second half grows less than the balanced player's.
- **Balance wins the legacy score in every valley** (Paris 1 014 vs greedy 543, pure virtue 620). In the Sun Belt greed even ends richer (€52M vs €45M) and still loses on legacy (430 vs 726).

From the dashboard (fill in live; say "so far today"): visitors · runs · average quiz score · most-failed question · rating (mean /10) · share of trap upgrades bought.

**Say:**
- "We tested the rules with a simulator on every commit: if a greedy strategy ever wins, the build fails. There is no dominant strategy."
- "Today, [N] people played [M] runs. The question most people got wrong was [X]." *(read from /dashboard)*

## Slide 5 · What's next (4:00-5:00)

**On screen:** three bullets.

- **Physical consequences:** droughts and wind lulls that cut plant output (needs one engine effect, `plantOutputPct`), a "demolish your coal plant" action.
- **Classroom mode:** one seed for the whole room, results on the projector, a debrief sheet mapped to the AFNOR steps.
- **More "it depends":** real locations and grid data, and a footprint badge for the game itself (frugal: no heavy libraries, no AI calls at runtime).

**Say:**
- "We built this in one day with about twenty students and several AI agents working in parallel, all through one repo with a task board and design rules enforced in CI."
- "Scan the QR code, beat our legacy score, and tell us which question you got wrong."

---

## Likely jury questions

**1. "Isn't a game too simplistic? Are your numbers real?"**
"Every number a player sees has a source and a confidence label in the content files. Physical facts are checked against primary sources: IPCC life-cycle emissions, IRENA capacity factors, IEA, the EU directives, ADEME-Arcep, the Global E-waste Monitor. Prices, costs and penalties are game numbers and labelled as such. We simplify, but we don't invent statistics."

**2. "Doesn't the game just say 'green always wins'? That's not true in real life."**
"No, and we tuned it on purpose. Greed earns the most in the first five years in every valley, and in the Sun Belt it ends richer. The responsible player only wins on the combined legacy score, which multiplies profit by impact. Being responsible costs money; the game shows you how much, and what you get for it."

**3. "How do you know players actually learn something?"**
"Three signals on the dashboard: quiz answers (we see which facts people get wrong), the choices they make on client cards (how often they propose the lighter alternative), and how many trap upgrades they buy before and after their first run. With more time, a short before/after quiz would measure it properly."
