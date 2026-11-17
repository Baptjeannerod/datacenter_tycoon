/**
 * App shell: start screen → game → end screen, plus the how-to-play modal.
 * URL params: ?seed=123&loc=paris-basin starts a challenge run (same campus, same luck).
 * "Daily run": same seed and valley for everyone today (ui/daily.ts); best legacy kept per day.
 */
import { useEffect, useRef, useState } from 'react';
import { summarize } from '../engine';
import { dailyRun, isDailyRun, saveDailyBest, type DailyRun } from './daily';
import { trackVisit } from './analytics';
import { copy, fillCopy } from './copy';
import { EndScreen } from './screens/EndScreen';
import { GameScreen } from './screens/GameScreen';
import { StartScreen } from './screens/StartScreen';
import { content, useGame } from './useGame';

function readChallenge(): { seed: number; loc: string } | null {
  const q = new URLSearchParams(window.location.search);
  const seed = Number(q.get('seed'));
  const loc = q.get('loc') ?? 'paris-basin';
  if (!q.get('seed') || !Number.isFinite(seed) || !content.locations.some((l) => l.id === loc && l.enabled)) return null;
  return { seed, loc };
}

function HowToPlay({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="modal" onClose={onClose} aria-labelledby="how-title">
      <h2 id="how-title" className="pixel">
        {copy.howToPlay.title}
      </h2>
      <ol>
        {copy.howToPlay.steps.map((st) => (
          <li key={st.lead}>
            <strong>{st.lead}</strong> {fillCopy(st.text)}
          </li>
        ))}
      </ol>
      <button className="btn primary wide" onClick={() => ref.current?.close()}>
        {copy.howToPlay.close}
      </button>
    </dialog>
  );
}

export function App() {
  const game = useGame();
  const [help, setHelp] = useState(false);
  const [challenge] = useState(readChallenge);
  /** Today's daily run, fixed when the player starts it (a run that crosses midnight still counts for its day). */
  const [daily, setDaily] = useState<DailyRun | null>(null);
  const startDaily = () => {
    const d = dailyRun(content);
    setDaily(d);
    game.start(d.locationId, d.seed);
  };

  // Keep the best daily legacy of the day.
  const ended = game.state && game.state.status !== 'playing' ? game.state : null;
  useEffect(() => {
    if (ended && daily && isDailyRun(daily, ended.seed, ended.locationId)) saveDailyBest(daily.date, summarize(ended, content).legacy);
  }, [ended, daily]);
  useEffect(trackVisit, []);
  const openHelp = () => {
    game.setPaused(true);
    setHelp(true);
  };

  let screen;
  if (!game.state) {
    screen = <StartScreen onStart={game.start} onDaily={startDaily} onHelp={openHelp} challenge={challenge} />;
  } else if (game.state.status !== 'playing') {
    const s = game.state;
    screen = <EndScreen state={s} onReplay={() => game.start(s.locationId)} onHome={game.quit} onHelp={openHelp} />;
  } else {
    screen = <GameScreen game={game} onHelp={openHelp} />;
  }

  return (
    <>
      {screen}
      {help && (
        <HowToPlay
          onClose={() => {
            setHelp(false);
            game.setPaused(false);
          }}
        />
      )}
    </>
  );
}
