/**
 * UI-side game controller: holds the engine state, auto-advances quarters,
 * pauses on every card, and keeps short-lived feedback (choice outcome, quiz answer).
 * All game rules stay in /engine; this hook only sequences them for the screen.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyAction,
  computeScores,
  createGame,
  currentDecision,
  loadContent,
  nextRandom,
  seedFromString,
  step,
  type Content,
  type GameState,
  type QuizQuestion,
  type Stance,
} from '../engine';

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

  const decision = state ? currentDecision(state, content) : null;
  const hasDecision = decision !== null;
  const playing = state?.status === 'playing';

  // Auto-advance: one quarter every TICK_MS / speed, unless paused or a card is open.
  useEffect(() => {
    if (!state || !playing || paused || hasDecision || feedback) return;
    const id = window.setTimeout(() => setState((s) => (s ? step(s, content) : s)), TICK_MS / speed);
    return () => window.clearTimeout(id);
  }, [state, playing, paused, speed, hasDecision, feedback]);

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
  }, []);

  const choose = useCallback(
    (choiceId: string) => {
      if (!state || !decision || decision.kind === 'quiz') return;
      const choice = decision.choices.find((c) => c.id === choiceId);
      if (!choice) return;
      const before = computeScores(state, content);
      const next = applyAction(state, { type: 'choose', choiceId }, content);
      const after = computeScores(next, content);
      setState(next);
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
      setFeedback({ kind: 'quiz', question: q, order: answerOrder(q, state.seed), chosen: originalIndex, correct: originalIndex === q.correctIndex });
    },
    [state, decision],
  );

  const buy = useCallback((upgradeId: string) => setState((s) => (s ? applyAction(s, { type: 'buy', upgradeId }, content) : s)), []);
  const nextQuarter = useCallback(() => setState((s) => (s ? step(s, content) : s)), []);
  const quit = useCallback(() => {
    setState(null);
    setFeedback(null);
  }, []);

  const scores = useMemo(() => (state ? computeScores(state, content) : null), [state]);

  return { state, decision, scores, paused, setPaused, speed, setSpeed, feedback, setFeedback, start, choose, answer, buy, nextQuarter, quit };
}

export type GameController = ReturnType<typeof useGame>;
