import { useMemo, useState } from 'react';
import { createGame, derive, getLocation } from '../../engine';
import { dailyBest, dailyRun } from '../daily';
import { CampusMap } from '../map/CampusMap';
import { campusView } from '../map/layout';
import { copy, fill } from '../copy';
import { content } from '../useGame';
import { TopBar } from './GameScreen';


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
            <h1 className="pixel">{copy.start.headline}</h1>
            <p className="lead">{copy.start.lead}</p>
            <ul className="hero-points">
              {copy.start.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <div className="daily">
              <span className="eyebrow">
                {copy.start.dailyTitle} · {daily.date}
              </span>
              <p>
                {fill(copy.start.dailyBody, { location: getLocation(content, daily.locationId).name })}{' '}
                <strong className="mono">{best !== null ? fill(copy.start.dailyBest, { best }) : copy.start.dailyNone}</strong>
              </p>
              <button className="btn primary" onClick={onDaily}>
                {copy.start.dailyTitle}
              </button>
            </div>
            {challenge && (
              <div className="challenge">
                <span className="eyebrow">{copy.start.challengeTitle}</span>
                <p>{copy.start.challengeBody}</p>
                <button className="btn primary" onClick={() => onStart(challenge.loc, challenge.seed)}>
                  {copy.start.challengeButton}
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
            {copy.start.pickTitle}
          </h2>
          <div className="locations">
            {locations.map((l) => (
              <button key={l.id} className={`location loc-${l.id}`} onClick={() => onStart(l.id)}>
                <span className="eyebrow">
                  <span className="difficulty" aria-label={`Difficulty ${copy.locations[l.id]?.level ?? 2} of 3`}>
                    {'●'.repeat(copy.locations[l.id]?.level ?? 2)}
                    {'○'.repeat(3 - (copy.locations[l.id]?.level ?? 2))}
                  </span>{' '}
                  {copy.locations[l.id]?.difficulty ?? 'Location'}
                </span>
                <span className="pixel loc-name">{l.name}</span>
                <span className="loc-tag">{l.tagline}</span>
                <span className="muted small">{l.context}</span>
                <span className="loc-stats mono">
                  Wind ×{l.resources.wind} · Sun ×{l.resources.solar} · River ×{l.resources.river} · water stress {l.waterStress}
                </span>
                <span className="loc-go">{copy.start.go}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
