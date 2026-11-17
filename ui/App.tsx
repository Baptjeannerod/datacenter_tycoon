/**
 * DEV HARNESS, not the final UI.
 *
 * A deliberately plain screen that drives the real engine end to end so that
 * designers and devs can play the numbers today. The real mobile UI (HUD,
 * cards, animations, end screen, share card) is task UI-1..UI-6 in docs/TASKS.md
 * and should replace this file piece by piece.
 *
 * Rule for the real UI: never show an upgrade's `family` (good/trap/tradeoff)
 * before purchase. Spotting the trap is the game. Reveal it on the end screen.
 */
import { useMemo, useState } from 'react';
import {
  applyAction,
  canBuy,
  computeScores,
  createGame,
  currentDecision,
  loadContent,
  resolveUpgrade,
  shopUpgrades,
  step,
  summarize,
  type GameState,
} from '../engine';

const content = loadContent();
const money = (k: number) => (Math.abs(k) >= 1000 ? `€${(k / 1000).toFixed(1)}M` : `€${Math.round(k)}k`);
const yearOf = (tick: number) => `Year ${Math.floor(tick / 4) + 1}, Q${(tick % 4) + 1}`;

function seedFromUrl(): number {
  const raw = new URLSearchParams(window.location.search).get('seed');
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : Math.floor(Math.random() * 2 ** 31);
}

export function App() {
  const [state, setState] = useState<GameState | null>(null);

  if (!state) {
    return (
      <main className="app">
        <div className="banner">Dev harness: wired to the real engine, not the final UI.</div>
        <section className="card">
          <h2>Datacenter Tycoon</h2>
          <p className="muted">Run a datacenter for 10 years. Get rich. Stay responsible. You can't max both.</p>
          <div className="choices">
            {content.locations
              .filter((l) => l.enabled)
              .map((l) => (
                <button key={l.id} onClick={() => setState(createGame({ seed: seedFromUrl(), locationId: l.id }, content))}>
                  <strong>{l.name}</strong>
                  <div className="muted">{l.tagline}</div>
                </button>
              ))}
          </div>
        </section>
      </main>
    );
  }

  return <Game state={state} setState={setState} />;
}

function Game({ state, setState }: { state: GameState; setState: (s: GameState | null) => void }) {
  const scores = useMemo(() => computeScores(state, content), [state]);
  const decision = currentDecision(state, content);
  const loc = content.locations.find((l) => l.id === state.locationId);

  if (state.status !== 'playing') {
    const sum = summarize(state, content);
    return (
      <main className="app">
        <section className="card">
          <h2>{state.status === 'bankrupt' ? 'Bankrupt' : 'Ten years later'}</h2>
          <p>
            Archetype: <strong>{sum.archetype}</strong>. Legacy score <strong>{sum.legacy}</strong>
          </p>
          <div className="hud">
            <div className="stat money">Net worth<b>{money(sum.netWorth)}</b></div>
            <div className="stat sus">Impact (avg)<b>{Math.round(sum.impact)}</b></div>
          </div>
          <h3>What you gained</h3>
          <ul>{sum.gained.map((g) => <li key={g}>{g}</li>)}</ul>
          <h3>What you gave up</h3>
          <ul>{sum.gaveUp.map((g) => <li key={g}>{g}</li>)}</ul>
          <p className="muted">
            Quiz: {sum.quizCorrect}/{sum.quizAnswered}. Seed {sum.seed}.
          </p>
          <button className="primary" onClick={() => setState(null)}>Play again</button>
        </section>
      </main>
    );
  }

  return (
    <main className="app">
      <div className="banner">Dev harness: wired to the real engine, not the final UI.</div>
      <section className="card">
        <div className="muted">
          {loc?.name} · {yearOf(state.tick)} · {state.demandMW.toFixed(1)} MW
        </div>
        <div className="hud">
          <div className="stat money">Cash<b>{money(state.cash)}</b></div>
          <div className="stat">Last quarter<b>{money(state.history.at(-1)?.net ?? 0)}</b></div>
          <div className="stat sus">Sustainability<b>{Math.round(scores.sustainability)}</b></div>
          <div className="stat resp">Responsibility<b>{Math.round(scores.responsibility)}</b></div>
        </div>
      </section>

      {decision ? (
        <section className="card">
          {decision.kind === 'quiz' ? (
            <>
              <h3>Quick question</h3>
              <p>{decision.question.question}</p>
              <div className="choices">
                {decision.question.answers.map((a, i) => (
                  <button key={a} onClick={() => setState(applyAction(state, { type: 'answer', answerIndex: i }, content))}>
                    {a}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3>{decision.kind === 'event' ? decision.event.title : `Client: ${decision.client.name}`}</h3>
              <p>{decision.kind === 'event' ? decision.event.body : decision.client.request}</p>
              <div className="choices">
                {decision.choices.map((c) => (
                  <button key={c.id} onClick={() => setState(applyAction(state, { type: 'choose', choiceId: c.id }, content))}>
                    <strong>{c.label}</strong>
                    {c.hint && <div className="muted">{c.hint}</div>}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <button className="primary" onClick={() => setState(step(state, content))}>
          Next quarter ▸
        </button>
      )}

      <section className="card">
        <h3>Upgrades</h3>
        <div className="shop">
          {shopUpgrades(state, content).map((u) => {
            const note = resolveUpgrade(u, state.locationId).note;
            return (
              <div key={u.id} className="shop-item">
                <div>
                  <strong>{u.name}</strong>
                  <div className="muted">{u.pitch}</div>
                  {note && <div className="muted">📍 {note}</div>}
                </div>
                <button disabled={!canBuy(state, content, u.id)} onClick={() => setState(applyAction(state, { type: 'buy', upgradeId: u.id }, content))}>
                  {money(u.cost)}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h3>Log</h3>
        <div className="log">
          {state.log
            .slice(-12)
            .reverse()
            .map((l, i) => (
              <div key={`${l.tick}-${i}`} className={l.kind}>
                Q{l.tick} · {l.text}
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}
