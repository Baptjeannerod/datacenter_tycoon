/**
 * UI-side game controller: holds the engine state, auto-advances quarters,
 * pauses on every card, and keeps short-lived feedback (choice outcome, quiz answer).
 * All game rules stay in /engine; this hook only sequences them for the screen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyAction,
  computeScores,
  createGame,
  getBuilding,
  getUpgrade,
  currentDecision,
  loadContent,
  nextRandom,
  seedFromString,
  step,
  summarize,
  type Content,
  type GameState,
  type QuizQuestion,
  type Stance,
} from '../engine';
import { track } from './analytics';

export const content: Content = loadContent();

/** Real time per quarter at 1x speed. 40 quarters ≈ 100 s plus cards ≈ 3-5 min per run. */
export const TICK_MS = 2600;

export type Speed = 1 | 2 | 3;

export type Feedback =
  | { kind: 'outcome'; title: string; label: string; text: string; stance: Stance; delta: { cash: number; s: number; r: number } }
  | { kind: 'quiz'; question: QuizQuestion; order: number[]; chosen: number; correct: boolean };

/** Seeded shuffle of answer indices so the right answer is not always first. */
export function answerOrder(q: QuizQuestion, seed: number): number[] {
  let rng = seed ^ seedFromString(q.id);
  const idx = q.answers.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const r = nextRandom(rng);
    rng = r.state;
    const j = Math.floor(r.value * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

export function useGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  /** Plot whose ring menu is open (-1 = policies), or null. Time pauses while it is open. */
  const [menu, setMenu] = useState<number | null>(null);
  /** Last run whose run_end was sent, so a finished run is reported once. */
  const reported = useRef<GameState | null>(null);

  const decision = state ? currentDecision(state, content) : null;
  const hasDecision = decision !== null;
  const playing = state?.status === 'playing';

  // Auto-advance: one quarter every TICK_MS / speed, unless paused or a card is open.
  useEffect(() => {
    if (!state || !playing || paused || hasDecision || feedback || menu !== null) return;
    const id = window.setTimeout(() => setState((s) => (s ? step(s, content) : s)), TICK_MS / speed);
    return () => window.clearTimeout(id);
  }, [state, playing, paused, speed, hasDecision, feedback, menu]);

  // Outcome banners clear themselves; quiz explanations wait for "Continue".
  useEffect(() => {
    if (feedback?.kind !== 'outcome') return;
    const id = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(id);
  }, [feedback]);

  const start = useCallback((locationId: string, seed?: number) => {
    const s = seed ?? Math.floor(Math.random() * 2 ** 31);
    setState(createGame({ seed: s, locationId }, content));
    setFeedback(null);
    setPaused(false);
    track('run_start', { seed: s, locationId });
  }, []);

  // Report the end of a run once (status leaves "playing").
  const ended = state && state.status !== 'playing' ? state : null;
  useEffect(() => {
    if (!ended || reported.current === ended) return;
    reported.current = ended;
    const sum = summarize(ended, content);
    track('run_end', {
      seed: sum.seed,
      locationId: sum.locationId,
      status: sum.status,
      legacy: sum.legacy,
      sustainability: sum.finalSustainability,
      responsibility: sum.finalResponsibility,
      impact: sum.impact,
      profitNorm: sum.profitNorm,
      archetype: sum.archetype,
      quizCorrect: sum.quizCorrect,
      quizAnswered: sum.quizAnswered,
    });
  }, [ended]);

  const choose = useCallback(
    (choiceId: string) => {
      if (!state || !decision || decision.kind === 'quiz') return;
      const choice = decision.choices.find((c) => c.id === choiceId);
      if (!choice) return;
      const before = computeScores(state, content);
      const next = applyAction(state, { type: 'choose', choiceId }, content);
      const after = computeScores(next, content);
      setState(next);
      const decisionId = decision.kind === 'event' ? decision.event.id : decision.client.id;
      track('decision', { action: 'choose', kind: decision.kind, id: decisionId, choiceId });
      setFeedback({
        kind: 'outcome',
        title: decision.kind === 'event' ? decision.event.title : decision.client.name,
        label: choice.label,
        text: choice.outcome,
        stance: choice.stance,
        delta: { cash: next.cash - state.cash, s: after.sustainability - before.sustainability, r: after.responsibility - before.responsibility },
      });
    },
    [state, decision],
  );

  const answer = useCallback(
    (originalIndex: number) => {
      if (!state || decision?.kind !== 'quiz') return;
      const q = decision.question;
      setState(applyAction(state, { type: 'answer', answerIndex: originalIndex }, content));
      track('decision', { action: 'answer', id: q.id });
      track('quiz_answer', { id: q.id, correct: originalIndex === q.correctIndex });
      setFeedback({ kind: 'quiz', question: q, order: answerOrder(q, state.seed), chosen: originalIndex, correct: originalIndex === q.correctIndex });
    },
    [state, decision],
  );

  /** Build on a plot or install an upgrade, close the ring, and explain what it does. */
  const act = useCallback(
    (action: { type: 'build'; plot: number; buildingId: string } | { type: 'buy'; upgradeId: string; plot?: number }) => {
      if (!state) return;
      const next = applyAction(state, action, content);
      if (next === state) return;
      const before = computeScores(state, content);
      const after = computeScores(next, content);
      const item = action.type === 'build' ? getBuilding(content, action.buildingId) : getUpgrade(content, action.upgradeId);
      const dirty = action.type === 'build' && (getBuilding(content, action.buildingId).carbonPerMWh ?? 0) > 300;
      setState(next);
      setMenu(null);
      if (action.type === 'build') track('decision', { action: 'build', id: action.buildingId });
      else track('decision', { action: 'buy', id: action.upgradeId, family: getUpgrade(content, action.upgradeId).family });
      setFeedback({
        kind: 'outcome',
        title: action.type === 'build' ? 'Built' : 'Installed',
        label: item.name,
        text: item.whyItMatters,
        stance: dirty ? 'greedy' : 'neutral',
        delta: { cash: next.cash - state.cash, s: after.sustainability - before.sustainability, r: after.responsibility - before.responsibility },
      });
    },
    [state],
  );
  const nextQuarter = useCallback(() => setState((s) => (s ? step(s, content) : s)), []);
  const quit = useCallback(() => {
    setState(null);
    setFeedback(null);
    setMenu(null);
  }, []);

  const scores = useMemo(() => (state ? computeScores(state, content) : null), [state]);

  return { state, decision, scores, paused, setPaused, speed, setSpeed, feedback, setFeedback, menu, setMenu, start, choose, answer, act, nextQuarter, quit };
}

export type GameController = ReturnType<typeof useGame>;
