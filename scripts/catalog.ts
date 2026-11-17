/**
 * Generates docs/CONTENT_CATALOG.md from /content so the docs never drift from the data.
 *
 *   npm run docs:catalog          # regenerate
 *   npm run docs:catalog -- --check   # CI: fail if the committed file is stale
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from '../engine/content';
import type { Choice, Effects } from '../engine/types';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'CONTENT_CATALOG.md');
const c = loadContent();

const fx = (e?: Effects) =>
  Object.entries(e ?? {})
    .map(([k, v]) => `${k} ${typeof v === 'number' && v > 0 ? '+' : ''}${v}`)
    .join(', ') || '—';
const esc = (s: string) => s.replace(/\|/g, '\\|');
const choiceLine = (ch: Choice) => {
  const parts = [fx(ch.effects)];
  if (ch.temporary) parts.push(`for ${ch.temporary.durationTicks} ticks: ${fx(ch.temporary.effects)}`);
  if (ch.scoreDelta) parts.push(`S ${ch.scoreDelta.sustainability ?? 0} / R ${ch.scoreDelta.responsibility ?? 0}`);
  if (ch.delayed?.length) parts.push(`later: ${ch.delayed.map((d) => `${d.chance !== undefined ? `${d.chance * 100}% ` : ''}+${d.afterTicks}t ${d.triggerEvent ?? fx(d.effects)}`).join('; ')}`);
  return `\`${ch.id}\` (${ch.stance}): ${esc(parts.filter((p) => p !== '—').join(' · ') || 'no effect')}`;
};

const lines: string[] = [
  '# Content catalog',
  '',
  '> **Generated** by `npm run docs:catalog` from `/content`. Do not edit by hand: edit the JSON, then regenerate.',
  '> Units: money in k€, 1 tick = 1 quarter. S = sustainability, R = responsibility. Field meanings: `engine/types.ts`.',
  '',
  `**${c.locations.length} locations · ${c.upgrades.length} upgrades · ${c.events.length} events · ${c.clients.length} clients · ${c.quiz.length} quiz questions**`,
  '',
  '## Locations',
  '',
  '| id | name | PUE | WUE | gCO2e/kWh | water stress | €/MWh | k€/MW/tick | growth | market MW | enabled |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  ...c.locations.map(
    (l) => `| \`${l.id}\` | ${l.name} | ${l.basePue} | ${l.baseWue} | ${l.gridCarbon} | ${l.waterStress} | ${l.energyPrice} | ${l.pricePerMW} | ${l.baseGrowth} | ${l.marketMW} | ${l.enabled ? 'yes' : 'no'} |`,
  ),
  '',
  '## Upgrades',
  '',
  'Family is **hidden from players** until the end screen. Slice = part of the first playable.',
  '',
  '| id | family | cost | effects | S / R | delayed | location overrides | slice | confidence |',
  '|---|---|---|---|---|---|---|---|---|',
  ...c.upgrades.map(
    (u) =>
      `| \`${u.id}\` | ${u.family} | ${u.cost} | ${esc(fx(u.effects))} | ${u.scoreDelta.sustainability ?? 0} / ${u.scoreDelta.responsibility ?? 0} | ${esc(
        (u.delayed ?? []).map((d) => `${d.chance !== undefined ? `${d.chance * 100}% ` : ''}+${d.afterTicks}t → ${d.triggerEvent ?? fx(d.effects)}`).join('; ') || '—',
      )} | ${Object.keys(u.contextModifiers ?? {}).join(', ') || '—'} | ${u.slice ? '✓' : ''} | ${u.confidence} |`,
  ),
  '',
  '## Events',
  '',
  '| id | kind | when | choices | quiz | slice |',
  '|---|---|---|---|---|---|',
  ...c.events.map(
    (e) => `| \`${e.id}\` | ${e.kind} | ${esc(e.when ? JSON.stringify(e.when) : 'triggered by a delayed effect')} | ${e.choices.map(choiceLine).join('<br>')} | ${e.quizId ?? '—'} | ${e.slice ? '✓' : ''} |`,
  ),
  '',
  '## Clients (workload intake)',
  '',
  '| id | AI needed? | choices | quiz | slice |',
  '|---|---|---|---|---|',
  ...c.clients.map((cl) => `| \`${cl.id}\` | ${cl.aiNeed} | ${cl.choices.map(choiceLine).join('<br>')} | ${cl.quizId ?? '—'} | ${cl.slice ? '✓' : ''} |`),
  '',
  '## Quiz',
  '',
  '| id | question | answer | confidence | source |',
  '|---|---|---|---|---|',
  ...c.quiz.map((q) => `| \`${q.id}\` | ${esc(q.question)} | ${esc(q.answers[q.correctIndex])} | ${q.confidence} | ${esc(q.source)} |`),
  '',
];

const text = lines.join('\n');
if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(out, 'utf8');
  } catch {
    /* missing */
  }
  if (current !== text) {
    console.error('✗ docs/CONTENT_CATALOG.md is stale. Run `npm run docs:catalog` and commit the result.');
    process.exit(1);
  }
  console.log('✓ docs/CONTENT_CATALOG.md is up to date.');
} else {
  writeFileSync(out, text);
  console.log(`✓ Wrote ${out}`);
}
