/**
 * First-run hints (UX-2): five short bubbles over the map, skippable, shown once.
 * Time is held while a bubble is up (GameScreen passes `hold` to useGame).
 * Tapping a plot during the first hint counts as doing it: the next hint shows when the ring closes.
 */
import { useCallback, useState, type ReactNode } from 'react';
import { copy, fillCopy } from '../copy';
import { BuildingIcon } from './RingMenu';

/** Bumped when the hints change, so returning players see the new ones once. */
const KEY = 'dt-onboarded-2';

function seen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function remember() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* private mode: hints show again next time, that's fine */
  }
}

function RedBang() {
  return (
    <svg viewBox="-15 -15 30 30" width="26" height="26" aria-hidden="true">
      <circle r={13} fill="#e2574c" stroke="#1d2232" strokeWidth={2} />
      <rect x={-2.5} y={-8} width={5} height={10} fill="#fff" />
      <rect x={-2.5} y={4} width={5} height={4} fill="#fff" />
    </svg>
  );
}

function Plus() {
  return (
    <svg viewBox="-15 -15 30 30" width="26" height="26" aria-hidden="true">
      <circle r={13} fill="#dcec8f" stroke="#1d2232" strokeWidth={2} />
      <path d="M-6 0h12M0 -6v12" stroke="#1d2232" strokeWidth={3} />
    </svg>
  );
}

function Tax() {
  return (
    <svg viewBox="-15 -15 30 30" width="26" height="26" aria-hidden="true">
      <circle r={13} fill="#dcec8f" stroke="#1d2232" strokeWidth={2} />
      <path d="M-7 7L7 -7" stroke="#1d2232" strokeWidth={2.5} />
      <circle cx={-5} cy={-5} r={2.6} fill="#e2574c" stroke="#1d2232" strokeWidth={1.5} />
      <circle cx={5} cy={5} r={2.6} fill="#e2574c" stroke="#1d2232" strokeWidth={1.5} />
    </svg>
  );
}

const ICONS: Record<(typeof copy.onboarding)[number]['icon'], ReactNode> = {
  plus: <Plus />,
  plant: <BuildingIcon kind="gas" />,
  alert: <RedBang />,
  tax: <Tax />,
  demolish: <BuildingIcon kind="demolish" />,
};

/** Texts from content/copy.json (GD-2); {maxTicks} and {taxThreshold} follow the game rules. */
const TIPS = copy.onboarding.map((t) => ({ text: fillCopy(t.text), icon: ICONS[t.icon] }));

/** Hint index (0..TIPS.length-1) or -1 when done. */
export function useOnboarding() {
  const [tip, setTip] = useState(() => (seen() ? -1 : 0));
  const finish = useCallback(() => {
    remember();
    setTip(-1);
  }, []);
  const next = useCallback(() => {
    if (tip >= TIPS.length - 1) finish();
    else setTip(tip + 1);
  }, [tip, finish]);
  /** Call when the player taps a plot: the first hint is done. */
  const tapped = useCallback(() => setTip((t) => (t === 0 ? 1 : t)), []);
  return { tip, next, skip: finish, tapped };
}

export function OnboardingTip({ tip, onNext, onSkip }: { tip: number; onNext: () => void; onSkip: () => void }) {
  const t = TIPS[tip];
  if (!t) return null;
  const last = tip === TIPS.length - 1;
  return (
    <div className="tip" role="dialog" aria-live="polite" aria-label={`Hint ${tip + 1} of ${TIPS.length}`}>
      <span className="tip-icon">{t.icon}</span>
      <strong className="tip-text">{t.text}</strong>
      <div className="tip-actions">
        <span className="tip-dots mono" aria-hidden="true">
          {TIPS.map((_, i) => (i === tip ? '■' : '□')).join(' ')}
        </span>
        <button type="button" className="tip-skip" onClick={onSkip}>
          Skip
        </button>
        <button type="button" className="btn primary tip-next" onClick={onNext} autoFocus>
          {last ? 'Play' : 'Next'}
        </button>
      </div>
    </div>
  );
}
