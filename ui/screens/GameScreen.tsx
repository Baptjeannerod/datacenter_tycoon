/**
 * Main play screen (layout from the team's campus template, with a bigger map).
 * Desktop: KPIs on top, map ~2/3 width on the left, decision card on the right, shop below.
 * Phone: everything stacks; the decision card becomes a bottom sheet over the map.
 */
import { derive, getLocation, powerBudget, type GameState } from '../../engine';
import { useEffect, useState, type ReactNode } from 'react';
import { DecisionPanel } from '../components/DecisionPanel';
import { OnboardingTip, useOnboarding } from '../components/Onboarding';
import { Icon } from '../components/Icons';
import { ringFor } from '../components/rings';
import { copy, debtLevel, debtWarning, headlineFor } from '../copy';
import { money, num, quarterLabel } from '../format';
import { CampusMap } from '../map/CampusMap';
import { campusView, HALL_PLOTS } from '../map/layout';
import { content, type GameController, type Speed } from '../useGame';
import { reportTax, TaxBadge } from '../components/TaxBadge';


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

type ScoreKey = keyof typeof copy.scores;

/** A KPI tile; tap it to read what the number means (tooltips from content/copy.json). */
function Kpi({ k, className, open, onToggle, children }: { k: ScoreKey; className?: string; open: ScoreKey | null; onToggle: (k: ScoreKey | null) => void; children: ReactNode }) {
  const t = copy.scores[k];
  const on = open === k;
  return (
    <div className={`kpi ${className ?? ''}`} title={t.tooltip}>
      <button type="button" className="eyebrow kpi-label" aria-expanded={on} onClick={() => onToggle(on ? null : k)}>
        {t.label} <span aria-hidden="true">ⓘ</span>
      </button>
      {children}
      {on && <p className="kpi-tip">{t.tooltip}</p>}
    </div>
  );
}

function Kpis({ state, s, r }: { state: GameState; s: number; r: number }) {
  const [open, setOpen] = useState<ScoreKey | null>(null);
  const loc = getLocation(content, state.locationId);
  const last = state.history.at(-1);
  const prev = state.history.at(-2);
  const debt = debtLevel(state.envDebt);
  const level = copy.debt.indexOf(debt);
  const d = derive(state, content);
  const power = powerBudget(state, content, d);
  const halls = campusView(state, content, loc, 0).halls;
  return (
    <section className="kpis" aria-label="Scores">
      <Kpi k="cash" open={open} onToggle={setOpen}>
        <div className="kpi-value">{money(state.cash)}</div>
        <div className={`kpi-sub ${last && last.net < 0 ? 'neg' : 'pos'}`}>{last ? `${money(last.net, true)} last quarter` : 'Your first quarter starts now'}</div>
      </Kpi>
      <Kpi k="power" className={`load${power.spareMW < 0 ? ' short' : ''}`} open={open} onToggle={setOpen}>
        <div className="kpi-value">
          {num(power.supplyMW, 1)} <small>/ {num(power.needMW, 1)} MW needed</small>
        </div>
        <div className="kpi-sub">
          {power.spareMW < 0 ? `Short by ${num(-power.spareMW, 1)} MW: halls go dark` : `${num(power.spareMW, 1)} MW spare`} · {halls} hall{halls === 1 ? '' : 's'} · demand {num(state.demandMW, 1)} MW
        </div>
      </Kpi>
      <Kpi k="sustainability" className="lime" open={open} onToggle={setOpen}>
        <div className="kpi-value">
          {Math.round(s)} <small>/ 100</small> <Trend v={prev ? s - prev.sustainability : 0} />
        </div>
        <Bar value={s} />
        <TaxBadge state={state} score={s} balance={content.balance} />
      </Kpi>
      <Kpi k="responsibility" className="lavender" open={open} onToggle={setOpen}>
        <div className="kpi-value">
          {Math.round(r)} <small>/ 100</small> <Trend v={prev ? r - prev.responsibility : 0} />
        </div>
        <Bar value={r} />
      </Kpi>
      <Kpi k="envDebt" className={`amber debt-${['low', 'rising', 'high', 'critical'][Math.min(level, 3)]}`} open={open} onToggle={setOpen}>
        <div className="kpi-value pixel">
          {debt.label} {level > 0 && <Icon.warn />}
        </div>
        <div className="kpi-sub" title={debt.hint}>
          {debtWarning(state.envDebt, state.tick)}
        </div>
      </Kpi>
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
        <p className="muted">{copy.game.emptyReport}</p>
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

/** GD-4: "it depends" card when a run starts. A question about this valley, the answer on tap. */
function LocationIntro({ locationId, onStart }: { locationId: string; onStart: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const loc = getLocation(content, locationId);
  const card = copy.locations[locationId];
  if (!card) return null;
  return (
    <div className="tip intro" role="dialog" aria-live="polite" aria-label={`${loc.name}: ${card.question}`}>
      <span className="eyebrow">
        {copy.intro.eyebrow} · {loc.name} · {card.difficulty}
      </span>
      <strong className="tip-text">{card.question}</strong>
      {revealed && <p className="intro-answer">{card.answer}</p>}
      <div className="tip-actions">
        {!revealed && (
          <button type="button" className="btn tip-next" onClick={() => setRevealed(true)}>
            {copy.intro.reveal}
          </button>
        )}
        <button type="button" className="btn primary tip-next" onClick={onStart} autoFocus>
          {copy.intro.start}
        </button>
      </div>
    </div>
  );
}

export function GameScreen({ game, onHelp }: { game: GameController; onHelp: () => void }) {
  const { state, scores, decision, feedback, setHold } = game;
  const tour = useOnboarding();
  const [intro, setIntro] = useState(() => Boolean(state && state.tick === 0 && copy.locations[state.locationId]));
  // Time stands still while the valley card or a first-run hint is up.
  useEffect(() => {
    setHold(intro || tour.tip >= 0);
    return () => setHold(false);
  }, [intro, tour.tip, setHold]);
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
            <h1 className="pixel">{headlineFor(view.halls)}</h1>
            <p className="muted">{copy.game.subtitle}</p>
          </div>
          <div className="loc-pill" title={loc.name}>
            <Icon.pin /> <span className="loc-pill-name">{loc.name}</span>
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
              overlay={
                intro && game.menu === null ? (
                  <LocationIntro locationId={state.locationId} onStart={() => setIntro(false)} />
                ) : tour.tip >= 0 && game.menu === null && !sheetOpen ? (
                  <OnboardingTip tip={tour.tip} onNext={tour.next} onSkip={tour.skip} />
                ) : null
              }
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
        <span className="mono">{copy.brand.footer.toUpperCase()}</span>
        <span className="muted small">{copy.brand.footerNote}</span>
        <span className="mono">THE SMIC DAY · CENTRALESUPÉLEC</span>
      </footer>
    </div>
  );
}
