import { useMemo, useState } from 'react';
import { createGame, derive, getLocation } from '../../engine';
import { dailyBest, dailyRun } from '../daily';
import { CampusMap } from '../map/CampusMap';
import { campusView } from '../map/layout';
import { content } from '../useGame';
import { TopBar } from './GameScreen';

const DIFFICULTY: Record<string, string> = {
  'paris-basin': 'Classic',
  'nordic-fjord': 'Easy to be green',
  'coal-valley': 'Hard',
  'sun-belt': 'Thirsty',
};

export function StartScreen({
  onStart,
  onDaily,
  onHelp,
  challenge,
}: {
  onStart: (locationId: string, seed?: number) => void;
  onDaily: () => void;
  onHelp: () => void;
  challenge: { seed: number; loc: string } | null;
}) {
  const locations = content.locations.filter((l) => l.enabled);
  const [daily] = useState(() => dailyRun(content));
  const best = dailyBest(daily.date);
  const preview = useMemo(() => {
    const s = createGame({ seed: 7, locationId: 'paris-basin' }, content);
    return campusView(s, content, locations[0], derive(s, content).wue);
  }, [locations]);

  return (
    <div className="start">
      <TopBar onHelp={onHelp} />
      <main className="start-main">
        <section className="hero">
          <div className="hero-copy">
            <h1 className="pixel">Small campus. Big decisions.</h1>
            <p className="lead">Run a datacenter for 10 years. Get rich. Stay responsible. You can&rsquo;t max both.</p>
            <ul className="hero-points">
              <li>Host workloads, or ask if they really need AI.</li>
              <li>No grid: build your own power plants. Coal is cheap, wind needs land.</li>
              <li>4 minutes. No sign-up. Beat your friends&rsquo; legacy score.</li>
            </ul>
            <div className="daily">
              <span className="eyebrow">Daily run · {daily.date}</span>
              <p>
                Same campus and same luck for everyone today, in <strong>{getLocation(content, daily.locationId).name}</strong>.{' '}
                {best !== null ? (
                  <>
                    Your best today: <strong className="mono">{best}</strong>.
                  </>
                ) : (
                  'No score yet today.'
                )}
              </p>
              <button className="btn primary" onClick={onDaily}>
                Daily run
              </button>
            </div>
            {challenge && (
              <div className="challenge">
                <span className="eyebrow">You were challenged</span>
                <p>Same campus, same luck. Can you beat their legacy score?</p>
                <button className="btn primary" onClick={() => onStart(challenge.loc, challenge.seed)}>
                  Accept the challenge
                </button>
              </div>
            )}
          </div>
          <div className="hero-map" aria-hidden="true">
            <CampusMap view={preview} seed={7} />
          </div>
        </section>

        <section aria-labelledby="pick">
          <h2 id="pick" className="pixel section-title">
            Pick your valley
          </h2>
          <div className="locations">
            {locations.map((l) => (
              <button key={l.id} className={`location loc-${l.id}`} onClick={() => onStart(l.id)}>
                <span className="eyebrow">{DIFFICULTY[l.id] ?? 'Location'}</span>
                <span className="pixel loc-name">{l.name}</span>
                <span className="loc-tag">{l.tagline}</span>
                <span className="muted small">{l.context}</span>
                <span className="loc-stats mono">
                  Wind ×{l.resources.wind} · Sun ×{l.resources.solar} · River ×{l.resources.river} · water stress {l.waterStress}
                </span>
                <span className="loc-go">Build here →</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
