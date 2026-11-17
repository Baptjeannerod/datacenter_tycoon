/**
 * Headless balance simulation.
 *
 *   npm run sim                  # 1000 runs per strategy, spread over enabled locations
 *   npm run sim -- --runs 200    # faster
 *   npm run sim -- --json        # machine-readable output
 *
 * Exits with code 1 if a design rule is broken (see docs/GAME_DESIGN.md §7):
 *   1. balanced beats greedy and virtuous on mean legacy score, in every location
 *   2. greedy hits a wall: >= 2 environmental bills come due in most runs
 *   3. virtuous is viable: never bankrupt, and makes real money
 *   4. tension: greedy out-earns virtuous in the first half and overall
 *   5. the wall: greedy's second half grows less (relative to its first half) than balanced's
 */
import { loadContent } from '../engine/content';
import { summarize } from '../engine/scoring';
import { STRATEGIES, playRun, randomStrategy, type Strategy } from '../engine/strategies';
import type { RunSummary } from '../engine/types';

const args = process.argv.slice(2);
const runsArg = args.indexOf('--runs');
const totalRuns = runsArg >= 0 ? Number(args[runsArg + 1]) : 1000;
const asJson = args.includes('--json');

const content = loadContent();
const locations = content.locations.filter((l) => l.enabled);
const runsPerLocation = Math.max(1, Math.round(totalRuns / locations.length));

interface Row {
  strategy: string;
  location: string;
  runs: number;
  netWorth: number;
  profitNorm: number;
  impact: number;
  legacy: number;
  bankruptPct: number;
  bills: number;
  wallPct: number;
  co2kt: number;
  archetypes: Record<string, number>;
  /** Net worth gained in the first vs second half of the run (shows the wall). */
  firstHalfGain: number;
  secondHalfGain: number;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

function simulate(strategyFor: (seed: number) => Strategy, locationId: string): Row {
  const summaries: RunSummary[] = [];
  const bills: number[] = [];
  const halves: [number, number][] = [];
  let id = '';
  for (let i = 0; i < runsPerLocation; i++) {
    const seed = 1000 + i;
    const strategy = strategyFor(seed);
    id = strategy.id;
    const final = playRun(strategy, seed, locationId, content);
    summaries.push(summarize(final, content));
    bills.push(final.firedEvents.filter((e) => content.events.find((x) => x.id === e)?.kind === 'consequence').length);
    const mid = final.history[Math.floor(final.history.length / 2)]?.cash ?? 0;
    const start = content.locations.find((l) => l.id === locationId)?.startCash ?? 0;
    halves.push([mid - start, final.cash - mid]);
  }
  const archetypes: Record<string, number> = {};
  for (const s of summaries) archetypes[s.archetype] = (archetypes[s.archetype] ?? 0) + 1;
  return {
    strategy: id,
    location: locationId,
    runs: summaries.length,
    netWorth: mean(summaries.map((s) => s.netWorth)),
    profitNorm: mean(summaries.map((s) => s.profitNorm)),
    impact: mean(summaries.map((s) => s.impact)),
    legacy: mean(summaries.map((s) => s.legacy)),
    bankruptPct: (100 * summaries.filter((s) => s.status === 'bankrupt').length) / summaries.length,
    bills: mean(bills),
    wallPct: (100 * bills.filter((b) => b >= 2).length) / bills.length,
    co2kt: mean(summaries.map((s) => s.totals.co2T)) / 1000,
    archetypes,
    firstHalfGain: mean(halves.map((h) => h[0])),
    secondHalfGain: mean(halves.map((h) => h[1])),
  };
}

const started = Date.now();
const rows: Row[] = [];
for (const loc of locations) {
  for (const strategy of STRATEGIES) rows.push(simulate(() => strategy, loc.id));
  rows.push(simulate((seed) => randomStrategy(seed), loc.id));
}

// ---- design-rule checks ---------------------------------------------------
const failures: string[] = [];
for (const loc of locations) {
  const get = (id: string) => rows.find((r) => r.location === loc.id && r.strategy === id);
  const bal = get('balanced');
  const gre = get('greedy');
  const vir = get('virtuous');
  if (!bal || !gre || !vir) continue;
  if (!(bal.legacy > gre.legacy)) failures.push(`[${loc.id}] balanced legacy ${bal.legacy.toFixed(0)} <= greedy ${gre.legacy.toFixed(0)}`);
  if (!(bal.legacy > vir.legacy)) failures.push(`[${loc.id}] balanced legacy ${bal.legacy.toFixed(0)} <= virtuous ${vir.legacy.toFixed(0)}`);
  if (gre.wallPct < 80) failures.push(`[${loc.id}] greedy hit >= 2 bills in only ${gre.wallPct.toFixed(0)} % of runs (want >= 80 %)`);
  if (vir.bankruptPct > 0) failures.push(`[${loc.id}] virtuous went bankrupt in ${vir.bankruptPct.toFixed(1)} % of runs`);
  if (vir.profitNorm < 0.2) failures.push(`[${loc.id}] virtuous profit too low (${vir.profitNorm.toFixed(2)} < 0.20 of reference)`);
  if (!(gre.netWorth > vir.netWorth)) failures.push(`[${loc.id}] greedy should still earn more than virtuous (tension), got ${gre.netWorth.toFixed(0)} vs ${vir.netWorth.toFixed(0)}`);
  if (!(gre.firstHalfGain > vir.firstHalfGain)) failures.push(`[${loc.id}] greedy should out-earn virtuous in the first half (short-term temptation)`);
  const ratio = (r: Row) => r.secondHalfGain / Math.max(1, r.firstHalfGain);
  if (!(ratio(gre) < ratio(bal))) failures.push(`[${loc.id}] no wall: greedy 2nd/1st half ${ratio(gre).toFixed(2)} >= balanced ${ratio(bal).toFixed(2)}`);
}

if (asJson) {
  console.log(JSON.stringify({ runsPerLocation, rows, failures }, null, 2));
} else {
  const fmt = (n: number, d = 0) => n.toFixed(d).padStart(8);
  console.log(`\nDatacenter Tycoon balance sim: ${runsPerLocation} runs per strategy per location (${((Date.now() - started) / 1000).toFixed(1)} s)\n`);
  for (const loc of locations) {
    console.log(`== ${loc.name} (${loc.id})`);
    console.log('  strategy     netWorth k€  profit  impact  legacy  bankrupt%  bills  wall%  CO2 kt  1st-half k€  2nd-half k€  top archetype');
    for (const r of rows.filter((x) => x.location === loc.id)) {
      const top = Object.entries(r.archetypes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      console.log(
        `  ${r.strategy.padEnd(10)} ${fmt(r.netWorth)}    ${fmt(r.profitNorm, 2)}${fmt(r.impact, 1)}${fmt(r.legacy)}${fmt(r.bankruptPct, 1)}   ${fmt(r.bills, 1)}${fmt(r.wallPct)} ${fmt(r.co2kt, 1)}    ${fmt(r.firstHalfGain)}     ${fmt(r.secondHalfGain)}  ${top}`,
      );
    }
    console.log('');
  }
  if (failures.length) {
    console.log('DESIGN RULES BROKEN:');
    for (const f of failures) console.log(`  ✗ ${f}`);
  } else {
    console.log('✓ All design rules hold: greed hits a wall, virtue is viable, balance wins.');
  }
}

process.exit(failures.length ? 1 : 0);
