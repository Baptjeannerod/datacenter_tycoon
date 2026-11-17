/**
 * Sustainability tax (eco-tax) display.
 *
 * Contract (engine, session 1): when last quarter's Sustainability is below
 * `balance.sustainabilityTaxThreshold`, the quarter pays
 *   tax = revenue × sustainabilityTaxMaxPct × (threshold − score) / threshold.
 * Paid amounts are in `TickReport.sustainabilityTax` and `GameState.totals.sustainabilityTax`.
 *
 * Every field is read with a fallback so the UI works with or without those engine fields.
 */
import type { Balance, GameState, TickReport } from '../../engine';

/** Fallbacks match the contract's example values, used only if content lacks the fields. */
const DEFAULT_THRESHOLD = 50;
const DEFAULT_MAX_PCT = 0.4;

type TaxBalance = Partial<{ sustainabilityTaxThreshold: number; sustainabilityTaxMaxPct: number }>;

export function taxRules(balance: Balance): { threshold: number; maxPct: number } {
  const b = balance as Balance & TaxBalance;
  return { threshold: b.sustainabilityTaxThreshold ?? DEFAULT_THRESHOLD, maxPct: b.sustainabilityTaxMaxPct ?? DEFAULT_MAX_PCT };
}

/** Share of revenue (0..maxPct) taxed next quarter for a given Sustainability score. */
export function taxRate(score: number, balance: Balance): number {
  const { threshold, maxPct } = taxRules(balance);
  if (threshold <= 0 || score >= threshold) return 0;
  return (maxPct * (threshold - Math.max(0, score))) / threshold;
}

/**
 * The score the engine taxes next quarter: last quarter's recorded Sustainability
 * (decisions taken since then count from the following quarter), else the live score.
 */
export const taxBasis = (state: GameState, liveScore: number): number => state.history.at(-1)?.sustainability ?? liveScore;

/** k€ of sustainability tax paid in a quarter report (0 if the engine does not report it). */
export const reportTax = (h: TickReport | undefined): number => (h as { sustainabilityTax?: number } | undefined)?.sustainabilityTax ?? 0;

/** k€ of sustainability tax paid over the whole run. */
export const totalTax = (state: GameState): number => (state.totals as { sustainabilityTax?: number }).sustainabilityTax ?? 0;

const base = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  justifySelf: 'start',
  padding: '2px 8px',
  border: '2px solid var(--c-ink)',
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: 'var(--fs-xs, 0.75rem)',
  fontWeight: 700,
  lineHeight: 1.4,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

/**
 * Small badge under the Sustainability KPI.
 * Above the threshold: a reminder ("Eco-tax below 50").
 * Below it: red "−X% revenue", the share of revenue taxed next quarter.
 */
export function TaxBadge({ state, score, balance }: { state: GameState; score: number; balance: Balance }) {
  const { threshold } = taxRules(balance);
  const rate = taxRate(taxBasis(state, score), balance);
  const explain = `Sustainability below ${threshold} triggers an eco-tax on revenue: the lower the score, the higher the tax.`;
  if (rate <= 0) {
    return (
      <span style={{ ...base, background: 'transparent', borderStyle: 'dashed' }} title={explain}>
        <span aria-hidden="true">⚠</span> Eco-tax below {threshold}
      </span>
    );
  }
  const pct = Math.max(1, Math.round(rate * 100));
  return (
    <span style={{ ...base, background: 'var(--c-red)', color: '#fff' }} role="status" title={explain}>
      <span aria-hidden="true">⚠</span> Eco-tax −{pct}% revenue
    </span>
  );
}
