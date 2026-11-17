/**
 * The card the player must answer (client, event, quiz) and the short feedback
 * that follows. Rule: never style one choice as "the right one".
 */
import type { PendingDecision } from '../../engine';
import { money } from '../format';
import { answerOrder, type Feedback } from '../useGame';
import { Icon } from './Icons';

interface Props {
  decision: PendingDecision | null;
  feedback: Feedback | null;
  seed: number;
  onChoose: (id: string) => void;
  onAnswer: (originalIndex: number) => void;
  onDismiss: () => void;
}

const Delta = ({ label, v, fmt }: { label: string; v: number; fmt?: (n: number) => string }) => {
  if (Math.abs(v) < 0.5) return null;
  return (
    <span className={`delta ${v > 0 ? 'up' : 'down'}`}>
      {label} {fmt ? fmt(v) : `${v > 0 ? '+' : '−'}${Math.abs(Math.round(v))}`}
    </span>
  );
};

export function DecisionPanel({ decision, feedback, seed, onChoose, onAnswer, onDismiss }: Props) {
  if (feedback?.kind === 'quiz') {
    const q = feedback.question;
    return (
      <section className="panel decision" aria-live="polite">
        <div className="eyebrow">
          <span className={`dot ${feedback.correct ? 'ok' : 'bad'}`} /> {feedback.correct ? 'Correct' : 'Not quite'}
        </div>
        <h3 className="pixel">{q.question}</h3>
        <p className="answer-line">
          <strong>{q.answers[q.correctIndex]}</strong>
        </p>
        <p className="muted">{q.explanation}</p>
        <p className="source">
          Source: {q.source} · {q.confidence}
        </p>
        <button className="btn primary wide" onClick={onDismiss}>
          Continue <Icon.arrow />
        </button>
      </section>
    );
  }

  if (!decision && feedback?.kind === 'outcome') {
    return (
      <section className={`panel decision outcome ${feedback.stance}`} aria-live="polite">
        <div className="eyebrow">{feedback.title}</div>
        <h3 className="pixel">{feedback.label}</h3>
        <p>{feedback.text}</p>
        <div className="deltas">
          <Delta label="Cash" v={feedback.delta.cash} fmt={(n) => money(n, true)} />
          <Delta label="Sustainability" v={feedback.delta.s} />
          <Delta label="Responsibility" v={feedback.delta.r} />
        </div>
        <button className="btn wide" onClick={onDismiss}>
          Continue <Icon.arrow />
        </button>
      </section>
    );
  }

  if (!decision) return null;

  if (decision.kind === 'quiz') {
    const q = decision.question;
    return (
      <section className="panel decision quiz" aria-live="polite">
        <div className="eyebrow">
          <span className="dot quiz" /> Quick question
        </div>
        <h3 className="pixel">{q.question}</h3>
        <div className="choices">
          {answerOrder(q, seed).map((i) => (
            <button key={i} className="btn choice" onClick={() => onAnswer(i)}>
              {q.answers[i]}
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (decision.kind === 'client') {
    const { client, choices } = decision;
    const alt = choices.find((c) => c.id === 'alternative');
    const rest = choices.filter((c) => c.id !== 'alternative');
    return (
      <section className="panel decision" aria-live="polite">
        <div className="eyebrow">
          <span className="dot workload" /> New workload · {client.name}
        </div>
        <h3 className="pixel">{client.aiNeed === 'not-ai' ? 'Is this worth the power?' : 'Does this really need AI?'}</h3>
        <p>{client.request}</p>
        <div className={`choice-row n${rest.length}`}>
          {rest.map((c) => (
            <button key={c.id} className="btn choice" onClick={() => onChoose(c.id)}>
              <strong>{c.label}</strong>
              {c.hint && <small>{c.hint}</small>}
            </button>
          ))}
        </div>
        {alt && (
          <button className="btn choice wide" onClick={() => onChoose(alt.id)}>
            <strong>{alt.label}</strong>
            {alt.hint && <small>{alt.hint}</small>}
          </button>
        )}
        <p className="why">
          <span className="eyebrow">Why it matters</span> Question the need before scaling the solution.
        </p>
      </section>
    );
  }

  const { event, choices } = decision;
  return (
    <section className={`panel decision ${event.kind}`} aria-live="polite">
      <div className="eyebrow">
        <span className={`dot ${event.kind}`} /> {event.kind === 'consequence' ? 'The bill arrives' : event.kind === 'milestone' ? 'Milestone' : 'Event'}
      </div>
      <h3 className="pixel">{event.title}</h3>
      <p>{event.body}</p>
      <div className="choices">
        {choices.map((c) => (
          <button key={c.id} className="btn choice" onClick={() => onChoose(c.id)}>
            <strong>{c.label}</strong>
            {c.hint && <small>{c.hint}</small>}
          </button>
        ))}
      </div>
    </section>
  );
}
