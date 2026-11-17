/**
 * Validates every file in /content:
 *   1. JSON Schema (content/schema/*.schema.json): shapes, ranges, required fields
 *   2. Cross-references: ids are unique, and every id mentioned somewhere exists
 *   3. Design rules that schemas cannot express (see docs/GAME_DESIGN.md)
 *
 *   npm run validate:content
 *
 * Errors are written for humans: file, item id, what is wrong, how to fix it.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import type { Badge, Choice, Condition, Content, DelayedEffect } from '../engine/types';
import type { Copy } from '../ui/copy';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const read = (p: string) => JSON.parse(readFileSync(join(contentDir, p), 'utf8')) as unknown;

const FILES = {
  balance: 'balance.json',
  locations: 'locations.json',
  buildings: 'buildings.json',
  upgrades: 'upgrades.json',
  events: 'events.json',
  clients: 'clients.json',
  quiz: 'quiz.json',
  copy: 'copy.json',
  badges: 'badges.json',
} as const;

const errors: string[] = [];
const warnings: string[] = [];

// ---- 1. JSON Schema -------------------------------------------------------
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addSchema(read('schema/common.schema.json') as object);
const data: Record<string, unknown> = {};
for (const [key, file] of Object.entries(FILES)) {
  let json: unknown;
  try {
    json = read(file);
  } catch (e) {
    errors.push(`${file}: not valid JSON (${(e as Error).message})`);
    continue;
  }
  data[key] = json;
  const validate = ajv.compile(read(`schema/${key}.schema.json`) as object);
  if (!validate(json)) {
    for (const err of validate.errors ?? []) {
      const path = err.instancePath || '(root)';
      const idx = /^\/(\d+)/.exec(path)?.[1];
      const itemId = idx !== undefined && Array.isArray(json) ? (json[Number(idx)] as { id?: string })?.id : undefined;
      const extra = err.params && 'additionalProperty' in err.params ? ` "${String(err.params.additionalProperty)}"` : '';
      errors.push(`${file}${itemId ? ` [${itemId}]` : ''} ${path}: ${err.message}${extra}`);
    }
  }
}

if (errors.length === 0) {
  // ---- 2. Cross-references --------------------------------------------------
  const c = data as unknown as Content;
  const ids = {
    locations: new Set(c.locations.map((l) => l.id)),
    buildings: new Set(c.buildings.map((b) => b.id)),
    upgrades: new Set(c.upgrades.map((u) => u.id)),
    events: new Set(c.events.map((e) => e.id)),
    clients: new Set(c.clients.map((x) => x.id)),
    quiz: new Set(c.quiz.map((q) => q.id)),
  };

  for (const [key, list] of Object.entries({
    locations: c.locations,
    buildings: c.buildings,
    upgrades: c.upgrades,
    events: c.events,
    clients: c.clients,
    quiz: c.quiz,
  })) {
    const seen = new Set<string>();
    for (const item of list) {
      if (seen.has(item.id)) errors.push(`${key}.json: duplicate id "${item.id}"`);
      seen.add(item.id);
    }
  }

  const checkCondition = (where: string, cond?: Condition) => {
    if (!cond) return;
    for (const id of cond.locations ?? []) if (!ids.locations.has(id)) errors.push(`${where}: unknown location "${id}"`);
    for (const id of [...(cond.hasUpgrades ?? []), ...(cond.lacksUpgrades ?? [])])
      if (!ids.upgrades.has(id)) errors.push(`${where}: unknown upgrade "${id}"`);
    if (cond.minTick !== undefined && cond.minTick >= c.balance.maxTicks)
      warnings.push(`${where}: minTick ${cond.minTick} is never reached (run is ${c.balance.maxTicks} ticks)`);
  };
  const checkDelayed = (where: string, list?: DelayedEffect[]) => {
    for (const d of list ?? []) {
      checkCondition(`${where} delayed.if`, d.if);
      if (d.triggerEvent && !ids.events.has(d.triggerEvent)) errors.push(`${where}: delayed.triggerEvent "${d.triggerEvent}" does not exist in events.json`);
    }
  };
  const checkChoices = (where: string, choices: Choice[]) => {
    const seen = new Set<string>();
    for (const ch of choices) {
      if (seen.has(ch.id)) errors.push(`${where}: duplicate choice id "${ch.id}"`);
      seen.add(ch.id);
      checkCondition(`${where} choice "${ch.id}" requires`, ch.requires);
      checkDelayed(`${where} choice "${ch.id}"`, ch.delayed);
      for (const id of ch.removeUpgrades ?? []) if (!ids.upgrades.has(id)) errors.push(`${where} choice "${ch.id}": unknown upgrade "${id}"`);
    }
    if (choices.every((ch) => ch.requires)) errors.push(`${where}: every choice has a "requires"; at least one must always be available`);
  };
  const checkQuiz = (where: string, quizId?: string) => {
    if (quizId && !ids.quiz.has(quizId)) errors.push(`${where}: quizId "${quizId}" does not exist in quiz.json`);
  };

  // Buildings and the starting campus
  for (const b of c.buildings) {
    const where = `buildings.json [${b.id}]`;
    if (b.kind === 'datacenter' && !b.itMW) errors.push(`${where}: a datacenter needs itMW`);
    if (b.kind === 'plant' && (!b.plantType || !b.nameplateMW || b.carbonPerMWh === undefined)) errors.push(`${where}: a plant needs plantType, nameplateMW and carbonPerMWh`);
    checkCondition(`${where} requires`, b.requires);
    checkDelayed(where, b.delayed);
  }
  if (!c.buildings.some((b) => b.kind === 'datacenter')) errors.push('buildings.json: needs at least one datacenter');
  for (const sb of c.balance.startBuildings) {
    const b = c.buildings.find((x) => x.id === sb.building);
    if (!b) errors.push(`balance.json startBuildings: unknown building "${sb.building}"`);
    else if ((sb.plot === c.balance.landPlots) !== (b.placement === 'river')) errors.push(`balance.json startBuildings: "${sb.building}" cannot stand on plot ${sb.plot}`);
    if (sb.plot > c.balance.landPlots) errors.push(`balance.json startBuildings: plot ${sb.plot} does not exist`);
  }

  for (const u of c.upgrades) {
    const where = `upgrades.json [${u.id}]`;
    if (u.scope === 'plant' && !u.plantTypes?.length) errors.push(`${where}: a plant upgrade needs plantTypes`);
    if (u.scope !== 'plant' && (u.plantTypes || u.plantEffects)) errors.push(`${where}: plantTypes / plantEffects only make sense with scope "plant"`);
    for (const t of u.plantTypes ?? []) if (!c.buildings.some((b) => b.plantType === t)) warnings.push(`${where}: no building has plantType "${t}"`);
    checkCondition(`${where} requires`, u.requires);
    checkDelayed(where, u.delayed);
    for (const loc of Object.keys(u.contextModifiers ?? {}))
      if (!ids.locations.has(loc)) errors.push(`${where}: contextModifiers key "${loc}" is not a location id`);
    // Design rule: a trap must be tempting (some short-term upside) and must carry a hidden cost.
    if (u.family === 'trap') {
      const e = u.effects;
      const pe = u.plantEffects ?? {};
      const upside = (e.cashPerTick ?? 0) > 0 || (e.growthRate ?? 0) > 0 || (e.pricePct ?? 0) > 0 || (e.pue ?? 0) < 0 || (e.energyPricePct ?? 0) < 0 || (e.itEfficiency ?? 0) > 0 || (pe.costPct ?? 0) < 0 || (pe.outputPct ?? 0) > 0;
      const hidden = Boolean(u.delayed?.length) || (e.envDebtPerTick ?? 0) > 0 || (e.failureRate ?? 0) > 0 || (e.wue ?? 0) > 0 || (e.hardwareLifespan ?? 0) < 0 || (e.carbonIntensity ?? 0) > 0 || (pe.carbonPct ?? 0) > 0 || (u.powerMW ?? 0) > 0;
      if (!upside) errors.push(`${where}: a trap needs a short-term upside (cash, growth, price, efficiency)`);
      if (!hidden) errors.push(`${where}: a trap needs a hidden cost (delayed effect, envDebtPerTick, failures, water, lifespan, carbon)`);
    }
    if (u.family === 'good' && u.cost === 0 && !u.effects.cashPerTick && !u.effects.growthRate && !u.effects.growthCap)
      warnings.push(`${where}: a free 'good' upgrade with no running cost or growth penalty is a no-brainer (no tension)`);
  }
  for (const e of c.events) {
    const where = `events.json [${e.id}]`;
    checkCondition(`${where} when`, e.when);
    checkChoices(where, e.choices);
    checkQuiz(where, e.quizId);
    if (e.kind !== 'random' && !e.when) {
      const triggered = [...c.upgrades.flatMap((u) => u.delayed ?? []), ...c.events.flatMap((x) => x.choices.flatMap((ch) => ch.delayed ?? []))].some(
        (d) => d.triggerEvent === e.id,
      );
      if (!triggered) warnings.push(`${where}: has no "when" and nothing triggers it, so it can never happen`);
    }
  }
  for (const cl of c.clients) {
    const where = `clients.json [${cl.id}]`;
    checkCondition(`${where} when`, cl.when);
    checkChoices(where, cl.choices);
    checkQuiz(where, cl.quizId);
  }
  for (const q of c.quiz) {
    if (q.correctIndex >= q.answers.length) errors.push(`quiz.json [${q.id}]: correctIndex ${q.correctIndex} but only ${q.answers.length} answers`);
  }
  if (!c.locations.some((l) => l.enabled)) errors.push('locations.json: at least one location must be enabled');

  // Player copy (GD-2) and location teaching cards (GD-4)
  const copy = (data as { copy: Copy }).copy;
  for (const id of Object.keys(copy.locations)) if (!ids.locations.has(id)) errors.push(`copy.json locations: "${id}" is not a location id`);
  for (const l of c.locations) if (l.enabled && !copy.locations[l.id]) errors.push(`copy.json locations: enabled location "${l.id}" needs a difficulty and a teaching card`);
  const ascending = (xs: number[]) => xs.every((x, i) => i === 0 || x > xs[i - 1]);
  if (!ascending(copy.debt.map((d) => d.min)) || copy.debt[0].min !== 0) errors.push('copy.json debt: levels must start at min 0 and be sorted by min, ascending');
  if (!ascending(copy.game.headlines.map((h) => h.maxHalls))) errors.push('copy.json game.headlines: sort by maxHalls, ascending');
  if (copy.game.headlines.at(-1)!.maxHalls < c.balance.landPlots) errors.push(`copy.json game.headlines: the last maxHalls must be >= ${c.balance.landPlots} (every hall count needs a headline)`);
  const words = (t: string) => t.split(/\s+/).length;
  for (const [id, l] of Object.entries(copy.locations)) if (words(l.answer) > 30) warnings.push(`copy.json locations [${id}]: answer is ${words(l.answer)} words (keep cards under ~25)`);

  // Badges (GD-5): every id a rule mentions must exist, or the badge can never be earned
  const badges = (data as { badges: Badge[] }).badges;
  const seenBadges = new Set<string>();
  const choiceIds = (list: { id: string; choices: Choice[] }[], id: string) => list.find((x) => x.id === id)?.choices.map((ch) => ch.id);
  const checkPattern = (where: string, pattern: string) => {
    const [kind, id, choice] = pattern.split(':');
    if (id === '*') return;
    const known = { client: ids.clients, event: ids.events, upgrade: ids.upgrades, build: ids.buildings, demolish: ids.buildings }[kind as 'client'];
    if (!known?.has(id)) return errors.push(`${where}: "${pattern}" names an unknown ${kind} "${id}"`);
    if ((kind === 'client' || kind === 'event') && choice && choice !== '*') {
      const choices = kind === 'client' ? choiceIds(c.clients, id) : choiceIds(c.events, id);
      if (!choices?.includes(choice)) errors.push(`${where}: "${pattern}": ${kind} "${id}" has no choice "${choice}"`);
    }
  };
  for (const b of badges) {
    const where = `badges.json [${b.id}]`;
    if (seenBadges.has(b.id)) errors.push(`badges.json: duplicate id "${b.id}"`);
    seenBadges.add(b.id);
    const r = b.rule;
    for (const p of [...(r.decisionsAny ?? []), ...(r.decisionsAll ?? []), ...(r.decisionsNone ?? []), ...Object.keys(r.countGte ?? {})]) checkPattern(where, p);
    for (const id of r.eventsFired ?? []) if (!ids.events.has(id)) errors.push(`${where}: eventsFired "${id}" does not exist in events.json`);
    for (const id of r.locations ?? []) if (!ids.locations.has(id)) errors.push(`${where}: unknown location "${id}"`);
    for (const p of r.decisionsAll ?? []) if (r.decisionsNone?.includes(p)) errors.push(`${where}: "${p}" is both required and forbidden`);
  }

  // ---- 3. Content coverage (the brief asks for these minimums) -------------
  const fam = (f: string) => c.upgrades.filter((u) => u.family === f).length;
  if (c.upgrades.length < 15) warnings.push(`only ${c.upgrades.length} upgrades (target 15+)`);
  if (fam('good') === 0 || fam('trap') === 0 || fam('tradeoff') === 0) errors.push('upgrades.json needs at least one good, one trap and one tradeoff');
  if (c.events.length < 10) warnings.push(`only ${c.events.length} events (target 10+)`);
  if (c.quiz.length < 8) warnings.push(`only ${c.quiz.length} quiz questions (target 8+)`);
  const unsourced = [...c.upgrades, ...c.events, ...c.quiz, ...c.locations, ...c.clients, ...c.buildings].filter((x) => x.confidence !== 'illustrative' && /^game design$/i.test(x.source));
  for (const x of unsourced) errors.push(`[${x.id}]: confidence "${x.confidence}" but source is just "game design" (cite a real source or mark it illustrative)`);

  const counts = `${c.locations.length} locations, ${c.buildings.length} buildings, ${c.upgrades.length} upgrades (${fam('good')} good / ${fam('trap')} trap / ${fam('tradeoff')} tradeoff), ${c.events.length} events, ${c.clients.length} clients, ${c.quiz.length} quiz questions, ${badges.length} badges, player copy`;
  if (errors.length === 0) console.log(`✓ Content valid: ${counts}`);
}

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} content error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\nFix the file(s) above, then run `npm run validate:content` again. Field reference: docs/GAME_DESIGN.md and engine/types.ts.');
  process.exit(1);
}
