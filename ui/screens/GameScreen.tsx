/**
 * Main play screen (layout from the team's campus template, with a bigger map).
 * Desktop: KPIs on top, map ~2/3 width on the left, decision card on the right, shop below.
 * Phone: everything stacks; the decision card becomes a bottom sheet over the map.
 */
import {
  buildOptions,
  demolishOption,
  derive,
  getBuilding,
  getLocation,
  policyOptions,
  powerBudget,
  resolveUpgrade,
  riverPlot,
  upgradeOptions,
  type Building,
  type GameState,
  type Option,
  type Upgrade,
} from '../../engine';
import { useEffect } from 'react';
import { DecisionPanel } from '../components/DecisionPanel';
import { OnboardingTip, useOnboarding } from '../components/Onboarding';
import { reportTax, TaxBadge } from '../components/TaxBadge';
import { CategoryIcon, Icon } from '../components/Icons';
import { BuildingIcon, RingMenu, type RingItem } from '../components/RingMenu';
import { DEBT_LABEL, effectChips, money, num, quarterLabel } from '../format';
import { CampusMap } from '../map/CampusMap';
import { campusView, HALL_PLOTS } from '../map/layout';
import { content, type GameController, type Speed } from '../useGame';

const HEADLINES = ['Small campus. Big decisions.', 'Growing campus. Bigger bills.', 'Big campus. Big footprint?', 'Mega campus. Worth it?'];

function headline(halls: number) {
  if (halls <= 2) return HEADLINES[0];
  if (halls <= 4) return HEADLINES[1];
  if (halls <= 6) return HEADLINES[2];
  return HEADLINES[3];
}

export function TopBar({ status, onHelp, onQuit }: { status?: string; onHelp: () => void; onQuit?: () => void }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <Icon.logo />
        </span>
        <span className="brand-name">
          <span className="pixel">Datacenter</span>
          <span className="brand-sub">T Y C O O N</span>
        </span>
      </div>
      {status && (
        <div className="run-status">
          <span className="square" /> {status}
        </div>
      )}
      <nav className="topbar-actions">
        <button className="btn dark" onClick={onHelp}>
          How to play
        </button>
        {onQuit && (
          <button className="btn dark" onClick={onQuit}>
            Quit
          </button>
        )}
      </nav>
    </header>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="bar" aria-hidden="true">
      <div style={{ transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})` }} />
    </div>
  );
}

function Trend({ v }: { v: number }) {
  if (Math.abs(v) < 0.5) return <span className="trend flat">=</span>;
  return <span className={`trend ${v > 0 ? 'up' : 'down'}`}>{v > 0 ? `↑ ${Math.round(v)}` : `↓ ${Math.abs(Math.round(v))}`}</span>;
}

function Kpis({ state, s, r }: { state: GameState; s: number; r: number }) {
  const loc = getLocation(content, state.locationId);
  const last = state.history.at(-1);
  const prev = state.history.at(-2);
  const debt = DEBT_LABEL[state.envDebt >= 80 ? 3 : state.envDebt >= 40 ? 2 : state.envDebt >= 15 ? 1 : 0];
  const d = derive(state, content);
  const power = powerBudget(state, content, d);
  const halls = campusView(state, content, loc, 0).halls;
  return (
    <section className="kpis" aria-label="Scores">
      <div className="kpi">
        <div className="eyebrow">Cash balance</div>
        <div className="kpi-value">{money(state.cash)}</div>
        <div className={`kpi-sub ${last && last.net < 0 ? 'neg' : 'pos'}`}>{last ? `${money(last.net, true)} last quarter` : 'Your first quarter starts now'}</div>
      </div>
      <div className={`kpi load${power.spareMW < 0 ? ' short' : ''}`}>
        <div className="eyebrow">Power</div>
        <div className="kpi-value">
          {num(power.supplyMW, 1)} <small>/ {num(power.needMW, 1)} MW needed</small>
        </div>
        <div className="kpi-sub">
          {power.spareMW < 0 ? `Short by ${num(-power.spareMW, 1)} MW: halls go dark` : `${num(power.spareMW, 1)} MW spare`} · {halls} hall{halls === 1 ? '' : 's'} · demand {num(state.demandMW, 1)} MW
        </div>
      </div>
      <div className="kpi lime">
        <div className="eyebrow">Sustainability</div>
        <div className="kpi-value">
          {Math.round(s)} <small>/ 100</small> <Trend v={prev ? s - prev.sustainability : 0} />
        </div>
        <Bar value={s} />
        <TaxBadge score={s} balance={content.balance} />
      </div>
      <div className="kpi lavender">
        <div className="eyebrow">Responsibility</div>
        <div className="kpi-value">
          {Math.round(r)} <small>/ 100</small> <Trend v={prev ? r - prev.responsibility : 0} />
        </div>
        <Bar value={r} />
      </div>
      <div className={`kpi amber debt-${debt.label.toLowerCase()}`}>
        <div className="eyebrow">Environmental debt</div>
        <div className="kpi-value pixel">
          {debt.label} {state.envDebt >= 15 && <Icon.warn />}
        </div>
        <div className="kpi-sub">{debt.hint}</div>
      </div>
    </section>
  );
}

function QuarterReport({ state }: { state: GameState }) {
  const h = state.history.at(-1);
  const news = state.log.slice(-6).reverse();
  return (
    <section className="panel report">
      <div className="eyebrow">Last quarter</div>
      {h ? (
        <dl className="ledger">
          <dt>Revenue</dt>
          <dd>{money(h.revenue)}</dd>
          <dt>Energy bill</dt>
          <dd>−{money(h.energyCost)}</dd>
          <dt>Operations</dt>
          <dd>−{money(h.opex)}</dd>
          {h.carbonTax > 0 && (
            <>
              <dt>Carbon tax</dt>
              <dd>−{money(h.carbonTax)}</dd>
            </>
          )}
          {reportTax(h) > 0 && (
            <>
              <dt>Sustainability tax</dt>
              <dd>−{money(reportTax(h))}</dd>
            </>
          )}
          {h.capex > 0 && (
            <>
              <dt>Building &amp; servers</dt>
              <dd>−{money(h.capex)}</dd>
            </>
          )}
          <dt className="total">Net</dt>
          <dd className={`total ${h.net < 0 ? 'neg' : 'pos'}`}>{money(h.net, true)}</dd>
        </dl>
      ) : (
        <p className="muted">Press play. Clients will knock soon.</p>
      )}
      <div className="eyebrow news-title">Campus news</div>
      <ul className="news">
        {news.map((l, i) => (
          <li key={`${l.tick}-${i}`} className={l.kind}>
            <span className="news-q">Q{l.tick}</span> {l.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

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

function ringFor(game: GameController, plot: number) {
  const state = game.state!;
  if (plot < 0) {
    const items = policyOptions(state, content).map((o) => upgradeItem(state, o));
    return <RingMenu title="Campus policies" subtitle="Rules for the whole campus" items={items} verb="Adopt" onConfirm={(id) => game.act({ type: 'buy', upgradeId: id })} onClose={() => game.setMenu(null)} />;
  }
  const p = state.plots[plot];
  if (!p) {
    const items = buildOptions(state, content, plot).map((o) => buildingItem(state, o));
    const river = plot === riverPlot(content);
    return (
      <RingMenu
        title={river ? 'River spot' : 'Empty plot'}
        subtitle={river ? 'Only a dam fits here' : 'Build a hall, or the power to run one'}
        items={items}
        verb="Build"
        onConfirm={(id) => game.act({ type: 'build', plot, buildingId: id })}
        onClose={() => game.setMenu(null)}
      />
    );
  }
  const b = getBuilding(content, p.building);
  const items = upgradeOptions(state, content, plot).map((o) => upgradeItem(state, o));
  const demo = demolishOption(state, content, plot);
  if (demo) {
    const chips: RingItem['chips'] = [{ text: 'No refund', tone: 'down' }];
    if (b.kind === 'datacenter') chips.push({ text: `−${b.itMW} MW of servers`, tone: 'down' });
    else chips.push({ text: 'Its power is lost', tone: 'down' });
    if (p.upgrades.length) chips.push({ text: `${p.upgrades.length} upgrade${p.upgrades.length > 1 ? 's' : ''} removed`, tone: 'info' });
    items.push({ id: DEMOLISH, label: 'Demolish', name: `Demolish ${b.kind === 'datacenter' ? 'this hall' : b.name}`, pitch: 'Free the plot. Nothing is refunded.', cost: demo.cost, icon: <BuildingIcon kind="demolish" />, ok: demo.ok, reason: demo.reason, chips, verb: 'Demolish', danger: true });
  }
  const hallNo = state.plots.slice(0, plot + 1).filter((x) => x && getBuilding(content, x.building).kind === 'datacenter').length;
  return (
    <RingMenu
      title={b.kind === 'datacenter' ? `Hall ${String(hallNo).padStart(2, '0')}` : b.name}
      subtitle={`${p.upgrades.length} upgrade${p.upgrades.length === 1 ? '' : 's'} installed${b.kind === 'datacenter' ? ' · applies to this hall' : ''}`}
      items={items}
      verb="Install"
      onConfirm={(id) => game.act(id === DEMOLISH ? { type: 'demolish', plot } : { type: 'buy', upgradeId: id, plot })}
      onClose={() => game.setMenu(null)}
    />
  );
}

export function GameScreen({ game, onHelp }: { game: GameController; onHelp: () => void }) {
  const { state, scores, decision, feedback, setHold } = game;
  const tour = useOnboarding();
  // Time stands still while a first-run hint is up.
  useEffect(() => {
    setHold(tour.tip >= 0);
    return () => setHold(false);
  }, [tour.tip, setHold]);
  if (!state || !scores) return null;
  const loc = getLocation(content, state.locationId);
  const d = derive(state, content);
  const view = campusView(state, content, loc, d.wue);
  const last = state.history.at(-1);
  const sheetOpen = Boolean(decision || feedback);
  const status = view.outage ? 'Outage' : 'All systems online';

  return (
    <div className={`game ${sheetOpen ? 'sheet-open' : ''}`}>
      <TopBar status={`Run in progress · ${quarterLabel(state.tick)}`} onHelp={onHelp} onQuit={game.quit} />
      <main className="game-main">
        <section className="title-row">
          <div>
            <h1 className="pixel">{headline(view.halls)}</h1>
            <p className="muted">Build your empire. Mind your footprint.</p>
          </div>
          <div className="loc-pill">
            <Icon.pin /> {loc.name}
          </div>
          <div className="clock">
            <div className="mono">
              QUARTER {Math.min(state.tick + 1, content.balance.maxTicks)} / {content.balance.maxTicks}
            </div>
            <div className="muted small">{quarterLabel(state.tick)} · make it count</div>
          </div>
          <div className="controls">
            <button className="btn square" aria-label={game.paused ? 'Resume' : 'Pause'} onClick={() => game.setPaused(!game.paused)}>
              {game.paused ? <Icon.play /> : <Icon.pause />}
            </button>
            <button className="btn square" aria-label="Change speed" onClick={() => game.setSpeed(((game.speed % 3) + 1) as Speed)}>
              {game.speed}×
            </button>
            <button className="btn" onClick={() => game.setMenu(game.menu === -1 ? null : -1)}>
              Policies
            </button>
            <button className="btn primary" disabled={sheetOpen} onClick={game.nextQuarter}>
              Next quarter <Icon.arrow />
            </button>
          </div>
        </section>

        <Kpis state={state} s={scores.sustainability} r={scores.responsibility} />

        <section className="board">
          <div className={`map-card${tour.tip === 0 ? ' tour-plots' : ''}`}>
            <div className="map-head">
              <span className="mono">YOUR CAMPUS</span>
              <span className={`status ${view.outage ? 'bad' : ''}`}>
                <span className="square" /> {status}
              </span>
              <span className="muted small">
                {view.plots.filter((p) => p.kind === 'empty').length} of {HALL_PLOTS.length} plots free · tap a plot to build or upgrade
              </span>
            </div>
            <CampusMap
              view={view}
              seed={state.seed}
              selected={game.menu}
              onSelect={(plot) => {
                if (plot !== null) tour.tapped();
                game.setMenu(plot);
              }}
              ring={game.menu !== null ? ringFor(game, game.menu) : null}
              overlay={tour.tip >= 0 && game.menu === null && !sheetOpen ? <OnboardingTip tip={tour.tip} onNext={tour.next} onSkip={tour.skip} /> : null}
            />
            <div className="map-stats">
              <div>
                <Icon.energy />
                <span className="eyebrow">Energy</span>
                <strong>{last ? `${num(last.energyMWh / 1000, 1)} GWh` : '—'}</strong>
              </div>
              <div>
                <Icon.cloud />
                <span className="eyebrow">Carbon</span>
                <strong>{last ? `${num(last.co2T)} t CO₂e` : '—'}</strong>
              </div>
              <div>
                <Icon.drop />
                <span className="eyebrow">Water</span>
                <strong>{last ? `${num(last.waterM3)} m³` : '—'}</strong>
              </div>
              <div>
                <Icon.bars />
                <span className="eyebrow">PUE</span>
                <strong>{d.pue.toFixed(2)}</strong>
              </div>
              <span className="mono small per">/ QUARTER</span>
            </div>
          </div>

          <aside className="side">
            {sheetOpen ? (
              <div className="sheet">
                <DecisionPanel decision={decision} feedback={feedback} seed={state.seed} onChoose={game.choose} onAnswer={game.answer} onDismiss={() => game.setFeedback(null)} />
              </div>
            ) : (
              <QuarterReport state={state} />
            )}
          </aside>
        </section>

      </main>
      <footer className="footer">
        <span className="mono">BUILD A DATACENTER. TRY NOT TO WRECK THE PLANET.</span>
        <span className="muted small">Illustrative game values · sourced facts in the quiz</span>
        <span className="mono">THE SMIC DAY · CENTRALESUPÉLEC</span>
      </footer>
    </div>
  );
}
