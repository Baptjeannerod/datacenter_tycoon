/**
 * End of run: where you landed on the profit vs impact frontier, what you gained,
 * what you gave up, which of your upgrades were traps, a 1-10 rating and a challenge link.
 */
import { useMemo, useState } from 'react';
import { earnedBadges, getLocation, loadBadges, summarize, type GameState } from '../../engine';
import { balanced, greedy, playRun, virtuous } from '../../engine/strategies';
import { track } from '../analytics';
import { copy, fill } from '../copy';
import { ARCHETYPES, money } from '../format';
import { CategoryIcon } from '../components/Icons';
import { shareResultCard } from '../share/share';
import { content } from '../useGame';
import { TopBar } from './GameScreen';

const FAMILY_LABEL = copy.end.families;
const BADGES = loadBadges();

function Frontier({ you, refs }: { you: { p: number; i: number }; refs: { label: string; p: number; i: number }[] }) {
  const W = 320;
  const H = 240;
  const x = (p: number) => 34 + (Math.min(p, 1.5) / 1.5) * (W - 48);
  const y = (i: number) => H - 30 - (i / 100) * (H - 48);
  return (
    <svg className="frontier" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`You: profit ${you.p.toFixed(2)} of reference, impact ${Math.round(you.i)} out of 100`}>
      <rect x={x(0)} y={y(100)} width={x(0.6) - x(0)} height={y(60) - y(100)} fill="#d7cff4" />
      <rect x={x(0.6)} y={y(100)} width={x(1.5) - x(0.6)} height={y(60) - y(100)} fill="#dcec8f" />
      <rect x={x(0.6)} y={y(60)} width={x(1.5) - x(0.6)} height={y(0) - y(60)} fill="#f7c9c3" />
      <rect x={x(0)} y={y(60)} width={x(0.6) - x(0)} height={y(0) - y(60)} fill="#ebe8dc" />
      <rect x={x(0)} y={y(100)} width={x(1.5) - x(0)} height={y(0) - y(100)} fill="none" stroke="#1d2232" strokeWidth={2} />
      <text x={x(0.3)} y={y(92)} className="fr-q" textAnchor="middle">Cloud Monk</text>
      <text x={x(1.05)} y={y(92)} className="fr-q" textAnchor="middle">Frugal Tycoon</text>
      <text x={x(1.05)} y={y(8)} className="fr-q" textAnchor="middle">Planet Burner</text>
      <text x={x(0.3)} y={y(8)} className="fr-q" textAnchor="middle">Lost in the Fog</text>
      <text x={x(0.75)} y={H - 8} className="fr-axis" textAnchor="middle">Profit →</text>
      <text x={12} y={y(50)} className="fr-axis" textAnchor="middle" transform={`rotate(-90 12 ${y(50)})`}>Impact →</text>
      {refs.map((r) => (
        <g key={r.label}>
          <circle cx={x(r.p)} cy={y(r.i)} r={5} fill="#fffdf6" stroke="#1d2232" strokeWidth={1.5} />
          <text x={r.p > 1 ? x(r.p) - 8 : x(r.p) + 8} y={y(r.i) + 4} className="fr-ref" textAnchor={r.p > 1 ? 'end' : 'start'}>
            {r.label}
          </text>
        </g>
      ))}
      <circle cx={x(you.p)} cy={y(you.i)} r={9} fill="#ef8a3a" stroke="#1d2232" strokeWidth={2.5} />
      <text x={x(you.p)} y={y(you.i) - 14} className="fr-you" textAnchor="middle">YOU</text>
    </svg>
  );
}

export function EndScreen({ state, onReplay, onHome, onHelp }: { state: GameState; onReplay: () => void; onHome: () => void; onHelp: () => void }) {
  const sum = useMemo(() => summarize(state, content), [state]);
  const loc = getLocation(content, state.locationId);
  const arch = ARCHETYPES[sum.archetype];
  const badges = useMemo(() => earnedBadges(state, sum, BADGES), [state, sum]);
  const [rating, setRating] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem(`dt-rating-${state.seed}`);
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  });
  const [copied, setCopied] = useState(false);

  // Where scripted players land in this location (a few seeds, computed in the browser).
  const refs = useMemo(() => {
    const avg = (strategy: typeof greedy) => {
      let p = 0;
      let i = 0;
      for (let seed = 1; seed <= 4; seed++) {
        const s = summarize(playRun(strategy, seed, state.locationId, content), content);
        p += s.profitNorm;
        i += s.impact;
      }
      return { p: p / 4, i: i / 4 };
    };
    return [
      { label: 'Greedy', ...avg(greedy) },
      { label: 'Virtuous', ...avg(virtuous) },
      { label: 'Balanced', ...avg(balanced) },
    ];
  }, [state.locationId]);

  const owned = state.owned.map((id) => content.upgrades.find((u) => u.id === id)!).filter(Boolean);
  const link = `${window.location.origin}${window.location.pathname}?seed=${state.seed}&loc=${state.locationId}`;
  const shareText = fill(arch.share, { legacy: sum.legacy, location: loc.name });

  /** Share card image + challenge link (DEV-8): native share sheet, else download + copy. */
  const share = async () => {
    const result = await shareResultCard(
      { archetypeTitle: arch.title, archetypeLine: arch.line, legacy: sum.legacy, netWorth: sum.netWorth, profitNorm: sum.profitNorm, impact: sum.impact, locationName: loc.name, bankrupt: state.status === 'bankrupt', link },
      shareText,
    );
    if (result === 'downloaded' || result === 'copied') setCopied(true);
  };

  const rate = (v: number) => {
    setRating(v);
    try {
      localStorage.setItem(`dt-rating-${state.seed}`, String(v));
    } catch {
      /* private mode */
    }
    // One rating per run: the API keeps the last value per (session, seed).
    track('rating', { seed: state.seed, value: v });
  };

  return (
    <div className="end">
      <TopBar status={state.status === 'bankrupt' ? 'Bankrupt' : 'Run complete'} onHelp={onHelp} />
      <main className="end-main">
        <section className="end-hero">
          <div>
            <div className="eyebrow">{state.status === 'bankrupt' ? fill(copy.end.bankrupt, { year: Math.floor(state.tick / 4) + 1 }) : copy.end.tenYears} · {loc.name}</div>
            <h1 className="pixel">{arch.title}</h1>
            <p className="lead">{arch.line}</p>
            <div className="legacy">
              <span className="eyebrow">{copy.scores.legacy.label}</span>
              <span className="pixel legacy-num">{sum.legacy}</span>
              <span className="muted small">{copy.end.legacyFormula}</span>
            </div>
            <div className="end-actions">
              <button className="btn primary" onClick={share}>
                {copied ? copy.end.shared : copy.end.share}
              </button>
              <button className="btn" onClick={onReplay}>
                {copy.end.replay}
              </button>
              <button className="btn" onClick={onHome}>
                {copy.end.otherValley}
              </button>
            </div>
          </div>
          <div className="panel">
            <div className="eyebrow">Profit vs impact</div>
            <Frontier you={{ p: sum.profitNorm, i: sum.impact }} refs={refs} />
            <p className="muted small">
              Net worth {money(sum.netWorth)} · average impact {Math.round(sum.impact)}/100
            </p>
          </div>
        </section>

        <section className="end-grid">
          <div className="panel lime">
            <div className="eyebrow">{copy.end.gained}</div>
            <ul className="ticks">
              {sum.gained.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
          <div className="panel lavender">
            <div className="eyebrow">{copy.end.gaveUp}</div>
            <ul className="ticks">
              {sum.gaveUp.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <div className="eyebrow">{copy.end.revealed}</div>
            {owned.length === 0 ? (
              <p className="muted">{copy.end.nothingBought}</p>
            ) : (
              <ul className="reveal">
                {owned.map((u) => (
                  <li key={u.id}>
                    <span className={`fam ${u.family}`}>{FAMILY_LABEL[u.family]}</span> <strong>{u.name}</strong>
                    <span className="muted small"> {u.whyItMatters}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="panel">
            <div className="eyebrow">{copy.end.badges}</div>
            {badges.length === 0 ? (
              <p className="muted">{copy.end.noBadges}</p>
            ) : (
              <ul className="badges">
                {badges.map((b) => (
                  <li key={b.id}>
                    <span className="badge-icon" aria-hidden="true">
                      <CategoryIcon category={b.icon} />
                    </span>
                    <span>
                      <strong>{b.name}</strong>
                      <span className="muted small"> {b.description}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="panel amber">
            <div className="eyebrow">{copy.end.rateTitle}</div>
            <p>{copy.end.rateBody}</p>
            <div className="rating" role="group" aria-label="Rate from 1 to 10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                <button key={v} className={`btn rate ${rating === v ? 'on' : ''}`} aria-pressed={rating === v} onClick={() => rate(v)}>
                  {v}
                </button>
              ))}
            </div>
            {rating && <p className="small">Thanks! Quiz: {sum.quizCorrect}/{sum.quizAnswered} correct.</p>}
          </div>
        </section>
        <p className="muted small" style={{ textAlign: 'center' }}>
          <a href="/dashboard/">Live dashboard</a>
        </p>
      </main>
    </div>
  );
}
