/**
 * App shell: start screen → game → end screen, plus the how-to-play modal.
 * URL params: ?seed=123&loc=paris-basin starts a challenge run (same campus, same luck).
 * "Daily run": same seed and valley for everyone today (ui/daily.ts); best legacy kept per day.
 */
import { useEffect, useRef, useState } from 'react';
import { summarize } from '../engine';
import { dailyRun, isDailyRun, saveDailyBest, type DailyRun } from './daily';
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
        How to play
      </h2>
      <ol>
        <li>
          <strong>Time runs by itself.</strong> One quarter every few seconds, 40 quarters in a run (10 years). Pause or speed up anytime.
        </li>
        <li>
          <strong>Clients knock.</strong> Accept, refuse, or propose a lighter alternative. Does it really need AI?
        </li>
        <li>
          <strong>Build on the map.</strong> Tap a plot to build a datacenter hall or a power plant. There is no grid: halls only run on the power you build (a red &ldquo;!&rdquo; means a hall has no power). Tap a building to upgrade it (or demolish it, for a fee); every upgrade has a trade-off you can see, some hide a bill you can&rsquo;t.
        </li>
        <li>
          <strong>Watch two scores.</strong> Sustainability (what your campus does to the planet) and Responsibility (how you decide). Coal is cheap and compact, wind and sun are clean but need land.
        </li>
        <li>
          <strong>Your legacy</strong> = profit × impact. Pure greed and pure virtue both lose to a smart balance.
        </li>
      </ol>
      <button className="btn primary wide" onClick={() => ref.current?.close()}>
        Got it
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
