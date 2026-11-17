import { describe, expect, it } from 'vitest';
import { loadContent } from './content';
import { derive, resolveUpgrade } from './derive';
import { applyAction, buildOptions, canBuy, createGame, currentDecision, demolishOption, policyOptions, riverPlot, saturate, step, sustainabilityTaxFor, upgradeOptions } from './game';
import { dispatch, plantInfos, powerBudget } from './power';
import { nextRandom, seedFromString } from './rng';
import { archetypeOf, computeScores, legacyScore, summarize } from './scoring';
import { balanced, greedy, playRun, virtuous } from './strategies';
import type { GameState } from './types';

const content = loadContent();
const newGame = (locationId = 'paris-basin', seed = 42) => createGame({ seed, locationId }, content);
const rich = (s: GameState, cash = 50_000): GameState => ({ ...s, cash });

/** Advance n ticks, auto-resolving any card with its first visible option. */
function advance(s: GameState, n: number): GameState {
  for (let i = 0; i < n && s.status === 'playing'; i++) {
    let d = currentDecision(s, content);
    while (d) {
      s = d.kind === 'quiz' ? applyAction(s, { type: 'answer', answerIndex: 0 }, content) : applyAction(s, { type: 'choose', choiceId: d.choices[0].id }, content);
      d = currentDecision(s, content);
    }
    s = step(s, content);
  }
  return s;
}

describe('rng', () => {
  it('is deterministic', () => {
    expect(nextRandom(1)).toEqual(nextRandom(1));
    expect(nextRandom(1).value).not.toEqual(nextRandom(2).value);
  });
  it('turns strings into stable seeds', () => {
    expect(seedFromString('2026-11-17')).toBe(seedFromString('2026-11-17'));
    expect(seedFromString('a')).not.toBe(seedFromString('b'));
  });
});

describe('createGame', () => {
  it('starts with one hall and one gas plant on 9 plots', () => {
    const s = newGame();
    expect(s.plots).toHaveLength(9);
    expect(s.plots[0]?.building).toBe('datacenter-hall');
    expect(s.plots[1]?.building).toBe('gas-plant');
    expect(s.capacityMW).toBe(2);
    expect(s.cash).toBe(1500);
  });
  it('rejects unknown locations', () => {
    expect(() => newGame('atlantis')).toThrow(/Unknown location/);
  });
});

describe('power', () => {
  it('the starting plant powers the starting hall, with a little headroom', () => {
    const b = powerBudget(newGame(), content);
    expect(b.supplyMW).toBe(6);
    expect(b.needMW).toBeCloseTo(3.2);
    expect(b.spareMW).toBeGreaterThan(0);
  });
  it('location resources scale renewables', () => {
    const wind = (loc: string) => {
      let s = rich(newGame(loc));
      s = applyAction(s, { type: 'build', plot: 7, buildingId: 'wind-farm' }, content);
      return plantInfos(s, content).find((p) => p.building.id === 'wind-farm')!.avgMW;
    };
    expect(wind('nordic-fjord')).toBeGreaterThan(wind('sun-belt'));
  });
  it('dispatches the cheapest plants first', () => {
    let s = rich(newGame());
    s = applyAction(s, { type: 'build', plot: 7, buildingId: 'wind-farm' }, content);
    const plants = plantInfos(s, content);
    const prod = dispatch(plants, plants.map((p) => p.avgMW), 2);
    expect(prod[plants.findIndex((p) => p.building.id === 'wind-farm')]).toBe(2);
    expect(prod[plants.findIndex((p) => p.building.id === 'gas-plant')]).toBe(0);
  });
  it('a hall needs spare power to be built', () => {
    const s = rich(newGame());
    const hall = buildOptions(s, content, 2).find((o) => o.item.id === 'datacenter-hall')!;
    expect(hall.ok).toBe(false);
    expect(hall.reason).toMatch(/spare power/);
    const withPlant = applyAction(s, { type: 'build', plot: 7, buildingId: 'coal-plant' }, content);
    expect(buildOptions(withPlant, content, 2).find((o) => o.item.id === 'datacenter-hall')!.ok).toBe(true);
  });
  it('halls without power go dark (brownout)', () => {
    let s = rich(newGame());
    s = applyAction(s, { type: 'build', plot: 7, buildingId: 'coal-plant' }, content);
    s = applyAction(s, { type: 'build', plot: 2, buildingId: 'datacenter-hall' }, content);
    s = applyAction(s, { type: 'build', plot: 3, buildingId: 'datacenter-hall' }, content);
    s = applyAction(s, { type: 'build', plot: 4, buildingId: 'datacenter-hall' }, content);
    s = applyAction(s, { type: 'build', plot: 5, buildingId: 'datacenter-hall' }, content);
    s = applyAction(s, { type: 'build', plot: 6, buildingId: 'datacenter-hall' }, content);
    // Tear the coal plant down: 5 halls on 6 MW of gas.
    s = { ...applyAction(s, { type: 'demolish', plot: 7 }, content), demandMW: 12 };
    expect(s.plots[7]).toBeNull();
    const next = step(s, content);
    expect(next.history.at(-1)!.unpoweredPlots.length).toBeGreaterThan(0);
    expect(next.history.at(-1)!.loadMW).toBeLessThan(next.history.at(-1)!.demandMW);
  });
  it('the dam only goes on the river spot', () => {
    const s = rich(newGame());
    expect(buildOptions(s, content, 3).map((o) => o.item.id)).not.toContain('dam');
    expect(buildOptions(s, content, riverPlot(content)).map((o) => o.item.id)).toEqual(['dam']);
  });
});

describe('demolish', () => {
  const twoHalls = () => {
    let s = rich(newGame());
    s = applyAction(s, { type: 'build', plot: 7, buildingId: 'coal-plant' }, content);
    s = applyAction(s, { type: 'build', plot: 2, buildingId: 'datacenter-hall' }, content);
    return s;
  };
  it('removes the building, frees the plot and charges a fee without refund', () => {
    const s0 = twoHalls();
    const coal = content.buildings.find((b) => b.id === 'coal-plant')!;
    const fee = Math.round(coal.cost * content.balance.demolishCostPct);
    expect(demolishOption(s0, content, 7)).toEqual({ ok: true, cost: fee, reason: undefined });
    const s1 = applyAction(s0, { type: 'demolish', plot: 7 }, content);
    expect(s1.plots[7]).toBeNull();
    expect(s1.cash).toBe(s0.cash - fee);
    expect(s1.decisions).toContain('demolish:coal-plant');
    expect(plantInfos(s1, content).map((p) => p.building.id)).toEqual(['gas-plant']);
    expect(buildOptions(s1, content, 7).length).toBeGreaterThan(0);
  });
  it('removing a hall reduces capacity', () => {
    const s0 = twoHalls();
    expect(s0.capacityMW).toBe(4);
    const s1 = applyAction(s0, { type: 'demolish', plot: 2 }, content);
    expect(s1.capacityMW).toBe(2);
    expect(derive(s1, content).halls).toBe(1);
  });
  it('removes its upgrades and their effects', () => {
    let s = twoHalls();
    const base = derive(s, content).pue;
    s = applyAction(s, { type: 'buy', upgradeId: 'free-cooling', plot: 2 }, content);
    expect(derive(s, content).pue).toBeLessThan(base);
    expect(s.owned).toContain('free-cooling');
    s = applyAction(s, { type: 'demolish', plot: 2 }, content);
    expect(derive(s, content).pue).toBeCloseTo(content.locations.find((l) => l.id === 'paris-basin')!.basePue);
    expect(s.owned).not.toContain('free-cooling');
    expect(s.modifiers.some((m) => m.source.startsWith('plot:2:'))).toBe(false);
  });
  it('keeps the same upgrade on another building', () => {
    let s = twoHalls();
    s = applyAction(s, { type: 'buy', upgradeId: 'free-cooling', plot: 0 }, content);
    s = applyAction(s, { type: 'buy', upgradeId: 'free-cooling', plot: 2 }, content);
    s = applyAction(s, { type: 'demolish', plot: 2 }, content);
    expect(s.owned).toContain('free-cooling');
    expect(s.modifiers.some((m) => m.source === 'plot:0:free-cooling')).toBe(true);
  });
  it("removes a plant's own upgrades, output and hidden debt", () => {
    let s = twoHalls();
    expect(derive(s, content).envDebtPerTick).toBeGreaterThan(0);
    const before = powerBudget(s, content).supplyMW;
    s = applyAction(s, { type: 'build', plot: 3, buildingId: 'gas-plant' }, content);
    s = applyAction(s, { type: 'buy', upgradeId: 'gas-heat-recovery', plot: 3 }, content);
    s = applyAction(s, { type: 'demolish', plot: 3 }, content);
    expect(powerBudget(s, content).supplyMW).toBeCloseTo(before);
    expect(s.owned).not.toContain('gas-heat-recovery');
    s = applyAction(s, { type: 'demolish', plot: 7 }, content);
    expect(derive(s, content).envDebtPerTick).toBe(0);
  });
  it('frees the power an upgrade drew, but a bill already scheduled still arrives', () => {
    let s = twoHalls();
    const spare = powerBudget(s, content).spareMW;
    s = applyAction(s, { type: 'buy', upgradeId: 'gpu-hype-cluster', plot: 2 }, content);
    expect(s.scheduled.length).toBeGreaterThan(0);
    const scheduled = s.scheduled.length;
    s = applyAction(s, { type: 'demolish', plot: 2 }, content);
    expect(s.scheduled.length).toBe(scheduled);
    expect(powerBudget(s, content).spareMW).toBeGreaterThan(spare);
  });
  it('cannot demolish the only hall, an empty plot, without the fee, or while a card is open', () => {
    const s = rich(newGame());
    expect(demolishOption(s, content, 0)!.ok).toBe(false);
    expect(applyAction(s, { type: 'demolish', plot: 0 }, content)).toBe(s);
    expect(demolishOption(s, content, 5)).toBeNull();
    expect(applyAction(s, { type: 'demolish', plot: 5 }, content)).toBe(s);
    const broke = { ...twoHalls(), cash: 10 };
    expect(demolishOption(broke, content, 7)!.reason).toMatch(/Needs/);
    const busy = { ...twoHalls(), queue: [{ kind: 'event' as const, id: 'heatwave' }] };
    expect(applyAction(busy, { type: 'demolish', plot: 7 }, content)).toBe(busy);
  });
  it('is pure', () => {
    const s0 = twoHalls();
    const snapshot = JSON.stringify(s0);
    applyAction(s0, { type: 'demolish', plot: 7 }, content);
    expect(JSON.stringify(s0)).toBe(snapshot);
  });
});

describe('step', () => {
  it('advances one quarter and records history', () => {
    const s = step(newGame(), content);
    expect(s.tick).toBe(1);
    expect(s.history[0].revenue).toBeGreaterThan(0);
    expect(s.history[0].carbonIntensity).toBe(490);
  });
  it('is pure: does not mutate its input', () => {
    const s0 = newGame();
    const snapshot = JSON.stringify(s0);
    step(s0, content);
    expect(JSON.stringify(s0)).toBe(snapshot);
  });
  it('is deterministic for a given seed', () => {
    expect(JSON.stringify(advance(newGame('paris-basin', 7), 20))).toBe(JSON.stringify(advance(newGame('paris-basin', 7), 20)));
  });
  it('does not advance while a decision is pending', () => {
    const s = { ...newGame(), queue: [{ kind: 'event' as const, id: 'heatwave' }] };
    expect(step(s, content)).toBe(s);
  });
  it('ends the run after maxTicks', () => {
    const s = advance(newGame(), 100);
    expect(['ended', 'bankrupt']).toContain(s.status);
  });
  it('a run lasts 20 quarters', () => {
    expect(content.balance.maxTicks).toBe(20);
    const s = playRun(balanced, 3, 'paris-basin', content);
    expect(s.status).toBe('ended');
    expect(s.tick).toBe(20);
    expect(s.history).toHaveLength(20);
  });
});

describe('sustainability tax', () => {
  const { sustainabilityTaxThreshold: threshold } = content.balance;
  /** One quarter from a state whose last recorded Sustainability is `score`. */
  const quarterAfter = (score: number) => {
    const s0 = step(newGame(), content);
    const s = { ...s0, history: s0.history.map((h) => ({ ...h, sustainability: score })) };
    return step(s, content);
  };
  it('applies below the threshold, based on last quarter\'s Sustainability', () => {
    const s = quarterAfter(20);
    const h = s.history.at(-1)!;
    expect(h.sustainabilityTax).toBeCloseTo(sustainabilityTaxFor(h.revenue, 20, content));
    expect(h.sustainabilityTax).toBeGreaterThan(0);
    expect(s.totals.sustainabilityTax).toBeCloseTo(h.sustainabilityTax);
    expect(s.log.some((l) => l.text.startsWith('Sustainability tax'))).toBe(true);
  });
  it('does not apply at or above the threshold', () => {
    expect(quarterAfter(threshold).history.at(-1)!.sustainabilityTax).toBe(0);
    expect(quarterAfter(90).history.at(-1)!.sustainabilityTax).toBe(0);
    expect(sustainabilityTaxFor(1000, threshold + 1, content)).toBe(0);
  });
  it('costs about a quarter of revenue at Sustainability 20', () => {
    const share = sustainabilityTaxFor(1000, 20, content) / 1000;
    expect(share).toBeGreaterThan(0.22);
    expect(share).toBeLessThan(0.28);
  });
  it('lowers net cash by exactly the tax (same quarter, same luck)', () => {
    const taxed = quarterAfter(20).history.at(-1)!;
    const untaxed = quarterAfter(90).history.at(-1)!;
    expect(untaxed.net - taxed.net).toBeCloseTo(taxed.sustainabilityTax);
  });
  it('shows up in the end-of-run summary', () => {
    const s = playRun(greedy, 1, 'sun-belt', content);
    expect(s.totals.sustainabilityTax).toBeGreaterThan(0);
    expect(summarize(s, content).gaveUp.some((g) => g.includes('sustainability tax'))).toBe(true);
  });
  it('the Eco-tax law card fires once, the first time Sustainability drops below the threshold', () => {
    const s = playRun(greedy, 1, 'sun-belt', content);
    expect(s.firedEvents.filter((e) => e === 'eco-tax-law')).toHaveLength(1);
    expect(playRun(virtuous, 1, 'nordic-fjord', content).firedEvents).not.toContain('eco-tax-law');
  });
});

describe('upgrades', () => {
  it('a hall upgrade only counts for its share of the campus', () => {
    let s = rich(newGame());
    s = applyAction(s, { type: 'build', plot: 7, buildingId: 'coal-plant' }, content);
    s = applyAction(s, { type: 'build', plot: 2, buildingId: 'datacenter-hall' }, content);
    const base = derive(s, content).pue;
    const one = applyAction(s, { type: 'buy', upgradeId: 'free-cooling', plot: 0 }, content);
    expect(derive(one, content).pue).toBeCloseTo(base - 0.25 / 2);
    const both = applyAction(one, { type: 'buy', upgradeId: 'free-cooling', plot: 2 }, content);
    expect(derive(both, content).pue).toBeCloseTo(base - 0.25);
  });
  it('one cooling system per hall', () => {
    const s = applyAction(rich(newGame()), { type: 'buy', upgradeId: 'evaporative-cooling', plot: 0 }, content);
    expect(upgradeOptions(s, content, 0).find((o) => o.item.id === 'free-cooling')!.ok).toBe(false);
  });
  it('plant upgrades only fit their plant type', () => {
    const ids = upgradeOptions(rich(newGame()), content, 1).map((o) => o.item.id);
    expect(ids).toContain('methane-leak-checks');
    expect(ids).not.toContain('cheap-lignite');
  });
  it('plant upgrades change that plant', () => {
    const s = rich(newGame());
    const before = plantInfos(s, content)[0].avgMW;
    const after = plantInfos(applyAction(s, { type: 'buy', upgradeId: 'gas-heat-recovery', plot: 1 }, content), content)[0].avgMW;
    expect(after).toBeCloseTo(before * 1.15);
  });
  it('policies are campus-wide and bought once', () => {
    const s = applyAction(newGame(), { type: 'buy', upgradeId: 'staff-training' }, content);
    expect(s.policies).toContain('staff-training');
    expect(policyOptions(s, content).find((o) => o.item.id === 'staff-training')!.ok).toBe(false);
    expect(canBuy(s, content, 'staff-training')).toBe(false);
  });
  it('applies location overrides (context matters)', () => {
    const up = content.upgrades.find((u) => u.id === 'free-cooling')!;
    expect(resolveUpgrade(up, 'paris-basin').effects.pue).toBe(-0.25);
    expect(resolveUpgrade(up, 'sun-belt').effects.pue).toBe(-0.05);
  });
});

describe('traps and delayed effects', () => {
  it('greenwashing without measurement comes back as a scandal', () => {
    let s = applyAction(newGame(), { type: 'buy', upgradeId: 'carbon-offsets-greenwash' }, content);
    let saw = false;
    for (let i = 0; i < 12 && !saw; i++) {
      const d = currentDecision(s, content);
      if (d?.kind === 'event' && d.event.id === 'greenwash-scandal') saw = true;
      s = advance(s, 1);
    }
    expect(saw).toBe(true);
  });
});

describe('decisions', () => {
  it('a client card can be answered and is logged', () => {
    const s0 = { ...newGame(), queue: [{ kind: 'client' as const, id: 'crypto-farm' }] };
    const s1 = applyAction(s0, { type: 'choose', choiceId: 'refuse' }, content);
    expect(s1.decisions).toContain('client:crypto-farm:refuse');
    expect(s1.responsibility).toBeGreaterThan(s0.responsibility);
  });
  it('building is blocked while a card is open', () => {
    const s = { ...rich(newGame()), queue: [{ kind: 'event' as const, id: 'heatwave' }] };
    expect(buildOptions(s, content, 7).every((o) => !o.ok)).toBe(true);
  });
  it('queues a quiz after an event that has one', () => {
    const s0 = { ...newGame(), queue: [{ kind: 'event' as const, id: 'heatwave' }] };
    const s1 = applyAction(s0, { type: 'choose', choiceId: 'throttle' }, content);
    expect(currentDecision(s1, content)?.kind).toBe('quiz');
  });
  it('lobbying delays the carbon tax instead of cancelling it', () => {
    let s: GameState = { ...newGame(), queue: [{ kind: 'event', id: 'carbon-tax' }] };
    s = applyAction(s, { type: 'choose', choiceId: 'lobby' }, content);
    expect(s.flags).not.toContain('carbon-tax');
    s = advance(s, 9);
    expect(s.flags).toContain('carbon-tax');
  });
});

describe('scoring', () => {
  it('scores stay within 0..100', () => {
    const sc = computeScores(advance(newGame(), 40), content);
    for (const v of [sc.sustainability, sc.responsibility]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
  it('clean power scores better on carbon than coal', () => {
    let coal = rich(newGame());
    coal = applyAction(coal, { type: 'build', plot: 7, buildingId: 'coal-plant' }, content);
    coal = { ...coal, plots: coal.plots.map((p, i) => (i === 1 ? null : p)) };
    let wind = rich(newGame());
    wind = applyAction(wind, { type: 'build', plot: 7, buildingId: 'wind-farm' }, content);
    expect(computeScores(wind, content).breakdown.carbon).toBeGreaterThan(computeScores(coal, content).breakdown.carbon);
  });
  it('responsibility has diminishing returns', () => {
    expect(saturate(50, 8)).toBe(58);
    expect(saturate(90, 8) - 90).toBeCloseTo(1.6);
  });
  it('legacy rewards balance over extremes', () => {
    expect(legacyScore(1, 70, false)).toBeGreaterThan(legacyScore(1.5, 25, false));
  });
  it('maps quadrants to archetypes', () => {
    expect(archetypeOf(1.2, 80)).toBe('frugal-tycoon');
    expect(archetypeOf(1.2, 20)).toBe('planet-burner');
    expect(archetypeOf(0.3, 80)).toBe('cloud-monk');
    expect(archetypeOf(0.3, 20)).toBe('lost-in-the-fog');
  });
  it('summarize explains what was gained and given up', () => {
    const sum = summarize(advance(newGame(), content.balance.maxTicks), content);
    expect(sum.gained.length).toBeGreaterThan(0);
    expect(sum.gaveUp.length).toBeGreaterThan(0);
  });
});

describe('design rules (smoke version of npm run sim)', () => {
  it('balanced beats greedy and virtuous on legacy in Paris', () => {
    const mean = (strategy: typeof greedy) => {
      let total = 0;
      for (let seed = 1; seed <= 15; seed++) total += summarize(playRun(strategy, seed, 'paris-basin', content), content).legacy;
      return total / 15;
    };
    const b = mean(balanced);
    expect(b).toBeGreaterThan(mean(greedy));
    expect(b).toBeGreaterThan(mean(virtuous));
  });
});
