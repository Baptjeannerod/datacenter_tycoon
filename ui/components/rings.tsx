/**
 * What goes in each ring menu: build options on an empty plot, upgrades (+ demolish) on a
 * building, campus policies. RingMenu only draws; this file turns engine options into ring items.
 * Demolish keeps the ring open on the same plot so the player can pick a replacement at once.
 */
import { useState } from 'react';
import {
  buildOptions,
  demolishOption,
  getBuilding,
  getLocation,
  policyOptions,
  resolveUpgrade,
  riverPlot,
  upgradeOptions,
  type Building,
  type GameState,
  type Option,
  type Upgrade,
} from '../../engine';
import { effectChips, money, num } from '../format';
import { content, type GameController } from '../useGame';
import { CategoryIcon } from './Icons';
import { BuildingIcon, RingMenu, type RingItem } from './RingMenu';

const SHORT: Record<string, string> = {
  'datacenter-hall': 'Hall',
  'gas-plant': 'Gas',
  'coal-plant': 'Coal',
  'biomass-plant': 'Biomass',
  'wind-farm': 'Wind',
  'solar-farm': 'Solar',
  dam: 'Dam',
};

const pctChip = (v: number | undefined, label: string, goodWhenUp: boolean) =>
  v ? [{ text: `${label} ${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`, tone: (v > 0) === goodWhenUp ? ('up' as const) : ('down' as const) }] : [];

function buildingItem(state: GameState, o: Option<Building>): RingItem {
  const b = o.item;
  const loc = getLocation(content, state.locationId);
  const chips: RingItem['chips'] = [];
  if (b.kind === 'datacenter') {
    chips.push({ text: `+${b.itMW} MW of servers`, tone: 'up' }, { text: `Needs ${num(o.needMW ?? 0, 1)} MW power`, tone: 'info' });
  } else {
    const avg = (b.nameplateMW ?? 0) * (b.capacityFactor ?? 1) * (b.resource ? loc.resources[b.resource] : 1);
    chips.push({ text: `~${num(avg, 1)} MW here`, tone: 'up' });
    chips.push({ text: `${b.carbonPerMWh} gCO₂/kWh`, tone: (b.carbonPerMWh ?? 0) > 150 ? 'down' : 'up' });
    chips.push({ text: `€${Math.round((b.costPerMWh ?? 0) * (b.fuel ? loc.fuelPrice : 1))}/MWh`, tone: 'info' });
    if (b.variability) chips.push({ text: `Varies ±${Math.round(b.variability * 100)}%`, tone: 'down' });
  }
  return { id: b.id, label: SHORT[b.id] ?? b.name, name: b.name, pitch: b.pitch, cost: b.cost, icon: <BuildingIcon kind={b.kind === 'datacenter' ? 'hall' : (b.plantType ?? 'gas')} />, ok: o.ok, reason: o.reason, chips };
}

function upgradeItem(state: GameState, o: Option<Upgrade>): RingItem {
  const u = o.item;
  const r = resolveUpgrade(u, state.locationId);
  const pe = u.plantEffects ?? {};
  const chips: RingItem['chips'] = [
    ...effectChips(r.effects),
    ...pctChip(pe.outputPct, 'Output', true),
    ...pctChip(pe.carbonPct, 'CO₂', false),
    ...pctChip(pe.costPct, 'Fuel cost', false),
    ...(pe.variabilityPct ? [{ text: 'Steadier output', tone: 'up' as const }] : []),
    ...(u.powerMW ? [{ text: `Draws +${u.powerMW} MW`, tone: 'down' as const }] : []),
  ];
  return { id: u.id, label: u.name, name: u.name, pitch: u.pitch, cost: u.cost, icon: <CategoryIcon category={u.category} />, ok: o.ok, reason: o.reason, installed: o.installed, chips, note: r.note };
}

/** Ring item id for "tear this building down" (never a real upgrade id). */
const DEMOLISH = '__demolish';

/** The ring for a plot (-1 = campus policies). Keyed by plot so its state resets when you tap elsewhere. */
export function ringFor(game: GameController, plot: number) {
  return <PlotRing key={plot} game={game} plot={plot} />;
}

function PlotRing({ game, plot }: { game: GameController; plot: number }) {
  /** Name of the building just demolished here: the ring then asks what replaces it. */
  const [replacing, setReplacing] = useState<string | null>(null);
  const state = game.state!;
  const close = () => game.setMenu(null);

  if (plot < 0) {
    const items = policyOptions(state, content).map((o) => upgradeItem(state, o));
    return <RingMenu title="Campus policies" subtitle="Rules for the whole campus" items={items} verb="Adopt" onConfirm={(id) => game.act({ type: 'buy', upgradeId: id })} onClose={close} />;
  }

  const p = state.plots[plot];
  if (!p) {
    const items = buildOptions(state, content, plot).map((o) => buildingItem(state, o));
    const river = plot === riverPlot(content);
    return (
      <RingMenu
        key={replacing ? 'replace' : 'empty'}
        title={replacing ? 'What do you build instead?' : river ? 'River spot' : 'Empty plot'}
        subtitle={replacing ? `${replacing} is gone. Pick what takes its place, or close to leave the plot empty.` : river ? 'Only a dam fits here' : 'Build a hall, or the power to run one'}
        items={items}
        verb="Build"
        onConfirm={(id) => game.act({ type: 'build', plot, buildingId: id })}
        onClose={close}
      />
    );
  }

  const b = getBuilding(content, p.building);
  const items = upgradeOptions(state, content, plot).map((o) => upgradeItem(state, o));
  const demo = demolishOption(state, content, plot);
  const hallNo = state.plots.slice(0, plot + 1).filter((x) => x && getBuilding(content, x.building).kind === 'datacenter').length;
  const name = b.kind === 'datacenter' ? `Hall ${String(hallNo).padStart(2, '0')}` : b.name;
  if (demo) {
    const chips: RingItem['chips'] = [{ text: 'No refund', tone: 'down' }];
    if (b.kind === 'datacenter') chips.push({ text: `−${b.itMW} MW of servers`, tone: 'down' });
    else chips.push({ text: 'Its power is lost', tone: 'down' });
    if (p.upgrades.length) chips.push({ text: `${p.upgrades.length} upgrade${p.upgrades.length > 1 ? 's' : ''} removed`, tone: 'info' });
    items.push({
      id: DEMOLISH,
      label: 'Demolish',
      name: `Demolish ${b.kind === 'datacenter' ? 'this hall' : b.name}`,
      pitch: 'Free the plot to build something else. Nothing is refunded.',
      cost: demo.cost,
      icon: <BuildingIcon kind="demolish" />,
      ok: demo.ok,
      reason: demo.reason,
      chips,
      verb: `Demolish · ${demo.cost === 0 ? 'free' : money(demo.cost)}, then pick what to build`,
      danger: true,
    });
  }
  return (
    <RingMenu
      key="building"
      title={name}
      subtitle={`${p.upgrades.length} upgrade${p.upgrades.length === 1 ? '' : 's'} installed${b.kind === 'datacenter' ? ' · applies to this hall' : ''}`}
      items={items}
      verb="Install"
      onConfirm={(id) => {
        if (id !== DEMOLISH) return game.act({ type: 'buy', upgradeId: id, plot });
        setReplacing(name);
        game.act({ type: 'demolish', plot });
      }}
      onClose={close}
    />
  );
}
