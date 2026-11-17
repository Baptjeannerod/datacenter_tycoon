/**
 * /dashboard (DEV-7): live aggregates from GET /api/stats, refreshed every 30 s.
 * Readable on a projector (large type, high contrast) and on a 375 px phone.
 * If the API cannot be reached before any live data arrived, shows DEMO_STATS
 * under a loud "demo data" label.
 */
import { useEffect, useState } from 'react';
import type { Ranked, Stats } from '../api/_lib/aggregate';
import buildings from '../content/buildings.json';
import clients from '../content/clients.json';
import events from '../content/events.json';
import locations from '../content/locations.json';
import quiz from '../content/quiz.json';
import upgrades from '../content/upgrades.json';
import { ARCHETYPES } from '../ui/format';
import { DEMO_STATS } from './demo';

const REFRESH_MS = 30_000;

const nameOf = (list: { id: string; name?: string; title?: string }[], id: string) => {
  const item = list.find((x) => x.id === id);
  return item?.name ?? item?.title ?? id;
};
const questionOf = (id: string) => quiz.find((q) => q.id === id)?.question ?? id;
const choiceOf = (kind: string, decisionId: string, choiceId: string) => {
  const src = (kind === 'client' ? clients : events) as { id: string; name?: string; title?: string; choices: { id: string; label: string }[] }[];
  const d = src.find((x) => x.id === decisionId);
  return { decision: d?.name ?? d?.title ?? decisionId, choice: d?.choices.find((c) => c.id === choiceId)?.label ?? choiceId };
};
const archetypeName = (id: string) => (ARCHETYPES as Record<string, { title: string }>)[id]?.title ?? id;
const fmt = (n: number) => n.toLocaleString('en');
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

type Source = { kind: 'live'; stats: Stats; failedAt: string | null } | { kind: 'demo'; stats: Stats } | { kind: 'loading' };

async function fetchStats(): Promise<Stats> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch('/api/stats', { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Stats;
    if (typeof data?.visitors !== 'number') throw new Error('unexpected payload');
    return data;
  } finally {
    window.clearTimeout(timer);
  }
}

function useStats(): Source {
  const [source, setSource] = useState<Source>({ kind: 'loading' });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const stats = await fetchStats();
        if (alive) setSource({ kind: 'live', stats, failedAt: null });
      } catch {
        if (!alive) return;
        // Keep the last live numbers if we had some; otherwise fall back to demo data.
        setSource((s) => (s.kind === 'live' ? { ...s, failedAt: new Date().toISOString() } : { kind: 'demo', stats: DEMO_STATS }));
      }
    };
    void load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);
  return source;
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'lime' | 'lavender' | 'amber' }) {
  return (
    <div className={`d-kpi ${tone ?? ''}`}>
      <span className="eyebrow">{label}</span>
      <span className="pixel d-kpi-value">{value}</span>
      {sub && <span className="d-kpi-sub">{sub}</span>}
    </div>
  );
}

/** Horizontal ranked bars, one series: ink bars, value label at the end. */
function Bars({ rows, max, unit = '', empty = 'No data yet' }: { rows: { key: string; label: string; value: number }[]; max?: number; unit?: string; empty?: string }) {
  if (rows.length === 0) return <p className="muted">{empty}</p>;
  const top = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="d-bars">
      {rows.map((r) => (
        <li key={r.key} title={`${r.label}: ${fmt(r.value)}${unit}`}>
          <span className="d-bar-label">{r.label}</span>
          <span className="d-bar-track">
            <span className="d-bar-fill" style={{ width: `${Math.max(0, Math.min(100, (100 * r.value) / top))}%` }} />
          </span>
          <span className="d-bar-value">
            {fmt(r.value)}
            {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RatingChart({ distribution }: { distribution: number[] }) {
  const max = Math.max(...distribution, 1);
  return (
    <div className="d-rating" role="img" aria-label={`Ratings from 1 to 10: ${distribution.map((n, i) => `${i + 1}: ${n}`).join(', ')}`}>
      {distribution.map((n, i) => (
        <div key={i} className="d-rating-col" title={`${n} rating${n === 1 ? '' : 's'} of ${i + 1}`}>
          <span className="d-rating-n">{n > 0 ? n : ''}</span>
          <span className="d-rating-bar" style={{ height: `${(100 * n) / max}%` }} />
          <span className="d-rating-x">{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

const ranked = (list: Ranked[], label: (id: string) => string, n = 6) => list.slice(0, n).map((r) => ({ key: r.id, label: label(r.id), value: r.count }));

const FAMILY = [
  { id: 'good', label: 'Good calls' },
  { id: 'trap', label: 'Traps' },
  { id: 'tradeoff', label: 'Trade-offs' },
] as const;

export function Dashboard() {
  const source = useStats();
  if (source.kind === 'loading') {
    return (
      <div className="d-page">
        <Header />
        <main className="d-main">
          <p className="muted">Loading live numbers…</p>
        </main>
      </div>
    );
  }
  const s = source.stats;
  const demo = source.kind === 'demo';

  return (
    <div className="d-page">
      <Header status={demo ? 'Demo data' : 'Live'} updated={demo ? undefined : s.generatedAt} />
      <main className="d-main">
        {demo && (
          <div className="d-demo" role="status">
            <strong className="pixel">Demo data</strong> The stats API is unreachable, so these numbers are made up. Retrying every 30 s.
          </div>
        )}
        {source.kind === 'live' && source.failedAt && (
          <div className="d-stale" role="status">
            Last refresh failed at {time(source.failedAt)}. Showing numbers from {time(s.generatedAt)}.
          </div>
        )}
        {source.kind === 'live' && s.storage === 'memory' && (
          <p className="d-note">In-memory store (local dev or storage not connected): numbers reset on restart.</p>
        )}

        <section className="d-kpis" aria-label="Headline numbers">
          <Kpi label="Unique visitors" value={fmt(s.visitors)} sub={`${fmt(s.sessions)} sessions`} />
          <Kpi label="Runs played" value={fmt(s.runsStarted)} sub={`${fmt(s.runsEnded)} finished`} />
          <Kpi label="Knowledge" value={s.quiz.pct === null ? '–' : `${Math.round(s.quiz.pct)}%`} sub={`of ${fmt(s.quiz.answered)} quiz answers right`} tone="lavender" />
          <Kpi label="Rating" value={s.ratings.mean === null ? '–' : `${s.ratings.mean.toFixed(1)}`} sub={`/10 · ${fmt(s.ratings.count)} votes`} tone="amber" />
          <Kpi label="Avg legacy" value={s.scores ? fmt(s.scores.legacy) : '–'} sub="profit × impact" tone="lime" />
        </section>

        <section className="d-grid">
          <div className="panel amber">
            <div className="eyebrow">How players rate the game (1-10)</div>
            {s.ratings.count === 0 ? <p className="muted">No ratings yet</p> : <RatingChart distribution={s.ratings.distribution} />}
          </div>

          <div className="panel lime">
            <div className="eyebrow">Average end-of-run scores</div>
            <Bars
              max={100}
              unit="/100"
              rows={
                s.scores
                  ? [
                      { key: 's', label: 'Sustainability', value: Math.round(s.scores.sustainability) },
                      { key: 'r', label: 'Responsibility', value: Math.round(s.scores.responsibility) },
                      { key: 'i', label: 'Impact (time avg.)', value: Math.round(s.scores.impact) },
                    ]
                  : []
              }
              empty="No finished runs yet"
            />
            {s.scores && <p className="small">Average legacy {fmt(s.scores.legacy)} · profit {Math.round(s.scores.profitNorm * 100)}% of reference</p>}
          </div>

          <div className="panel lavender d-wide">
            <div className="eyebrow">Most-missed quiz questions (% right)</div>
            <Bars
              max={100}
              unit="%"
              rows={s.quiz.mostFailed.map((q) => ({ key: q.id, label: `${questionOf(q.id)} (${q.answered})`, value: Math.round(q.pct) }))}
              empty="No quiz answers yet"
            />
          </div>

          <div className="panel">
            <div className="eyebrow">Player archetypes</div>
            <Bars rows={ranked(s.archetypes, archetypeName)} empty="No finished runs yet" />
          </div>

          <div className="panel">
            <div className="eyebrow">Most-built buildings</div>
            <Bars rows={ranked(s.buildings, (id) => nameOf(buildings, id))} />
          </div>

          <div className="panel d-wide">
            <div className="eyebrow">Most-bought upgrades, by family</div>
            <div className="d-families">
              {FAMILY.map((f) => (
                <div key={f.id}>
                  <span className={`d-fam ${f.id}`}>{f.label}</span>
                  <Bars rows={ranked(s.upgrades[f.id], (id) => nameOf(upgrades, id), 5)} empty="None yet" />
                </div>
              ))}
            </div>
          </div>

          <div className="panel d-wide">
            <div className="eyebrow">Most-chosen answers to clients and events</div>
            <Bars
              rows={s.choices.slice(0, 8).map((c) => {
                const { decision, choice } = choiceOf(c.kind, c.decisionId, c.choiceId);
                return { key: c.id, label: `${decision} → ${choice}`, value: c.count };
              })}
            />
          </div>

          <div className="panel">
            <div className="eyebrow">Valleys played</div>
            <Bars rows={ranked(s.locations, (id) => nameOf(locations, id))} />
          </div>
        </section>
        <footer className="d-foot muted small">
          Anonymous data only: a random id per browser, no IP, no name. Refreshes every 30 s. <a href="/">Play the game</a>
        </footer>
      </main>
    </div>
  );
}

function Header({ status, updated }: { status?: string; updated?: string }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark pixel">DT</span>
        <span className="brand-name">
          <span className="pixel">Datacenter</span>
          <span className="brand-sub">L I V E · D A S H B O A R D</span>
        </span>
      </div>
      {status && (
        <div className={`d-status ${status === 'Live' ? 'live' : 'demo'}`}>
          <span className="square" /> {status}
          {updated && <span className="d-updated"> · {time(updated)}</span>}
        </div>
      )}
    </header>
  );
}
