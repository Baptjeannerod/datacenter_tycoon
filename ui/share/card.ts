/**
 * Share card (DEV-8): the end-of-run result drawn on a 1080×1350 canvas (4:5, fits
 * Instagram and chat previews). Game look: paper background, ink borders, flat
 * lime / lavender / amber panels, Silkscreen headlines.
 * Colours mirror ui/tokens.css (canvas cannot read CSS variables reliably before paint).
 */
import { money } from '../format';

export interface CardData {
  archetypeTitle: string;
  archetypeLine: string;
  legacy: number;
  /** k€ */
  netWorth: number;
  /** 0..1.5 */
  profitNorm: number;
  /** 0..100 */
  impact: number;
  locationName: string;
  bankrupt: boolean;
  /** Challenge link (?seed=…&loc=…). */
  link: string;
}

export const CARD_W = 1080;
export const CARD_H = 1350;

export const C = {
  bg: '#f3f1e8',
  surface: '#fffdf6',
  surface2: '#ebe8dc',
  ink: '#1d2232',
  muted: '#5c6172',
  onInk: '#f3f1e8',
  lime: '#dcec8f',
  lavender: '#d7cff4',
  amber: '#f6d878',
  redSoft: '#f7c9c3',
  orange: '#ef8a3a',
};
export const PIXEL = 'Silkscreen, ui-monospace, monospace';
export const UI = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, shadow = false) {
  if (shadow) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(x + 10, y + 10, w, h);
  }
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 5;
  ctx.strokeStyle = C.ink;
  ctx.strokeRect(x, y, w, h);
}

/** Largest font size (down to `min`) at which `text` fits in `maxW`. */
export function fit(ctx: CanvasRenderingContext2D, text: string, family: string, weight: string, start: number, min: number, maxW: number): number {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > min && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Word-wrap into at most `maxLines` lines (last one gets an ellipsis if cut). */
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const tryLine = line ? `${line} ${w}` : w;
    if (ctx.measureText(tryLine).width <= maxW || !line) line = tryLine;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s+\S*$/, '')}…`;
    return kept;
  }
  return lines;
}

export function mark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  // The game's logo: two stacked server blocks.
  ctx.fillStyle = C.lime;
  ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(x + s * 0.2, y + s * 0.18, s * 0.6, s * 0.26);
  ctx.strokeRect(x + s * 0.2, y + s * 0.56, s * 0.6, s * 0.26);
}

export function frontier(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, profitNorm: number, impact: number, label = 'YOU') {
  const px = (p: number) => x + (Math.min(Math.max(p, 0), 1.5) / 1.5) * w;
  const py = (i: number) => y + h - (Math.min(Math.max(i, 0), 100) / 100) * h;
  const quads: [number, number, number, number, string, string][] = [
    [0, 0.6, 60, 100, C.lavender, 'MONK'],
    [0.6, 1.5, 60, 100, C.lime, 'TYCOON'],
    [0.6, 1.5, 0, 60, C.redSoft, 'BURNER'],
    [0, 0.6, 0, 60, C.surface2, 'FOG'],
  ];
  ctx.textAlign = 'center';
  ctx.font = `700 20px ${MONO}`;
  for (const [p0, p1, i0, i1, fill, label] of quads) {
    ctx.fillStyle = fill;
    ctx.fillRect(px(p0), py(i1), px(p1) - px(p0), py(i0) - py(i1));
    ctx.fillStyle = C.muted;
    ctx.fillText(label, (px(p0) + px(p1)) / 2, i0 === 60 ? py(i1) + 30 : py(i0) - 14);
  }
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  ctx.strokeRect(x, y, w, h);
  const cx = px(profitNorm);
  const cy = py(impact);
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = C.orange;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.font = `700 22px ${PIXEL}`;
  ctx.fillText(label, cx, cy < y + 50 ? cy + 50 : cy - 28);
  ctx.font = `700 20px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText('PROFIT →', x, y + h + 30);
  ctx.textAlign = 'right';
  ctx.fillText('↑ IMPACT', x + w, y - 12);
  ctx.textAlign = 'left';
}

/** Draw the card. Waits for the pixel font so headlines don't fall back to monospace. */
export async function drawShareCard(d: CardData): Promise<HTMLCanvasElement> {
  try {
    await Promise.all([document.fonts.load(`700 64px Silkscreen`), document.fonts.load(`400 64px Silkscreen`)]);
  } catch {
    /* offline: fall back to monospace */
  }
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.textBaseline = 'alphabetic';

  // Paper, with the template's dot grid.
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = 'rgba(29, 34, 50, 0.08)';
  for (let gx = 18; gx < CARD_W; gx += 36) for (let gy = 18; gy < CARD_H; gy += 36) ctx.fillRect(gx, gy, 3, 3);

  const M = 60;
  const W = CARD_W - 2 * M;

  // Header band.
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, CARD_W, 140);
  mark(ctx, M, 34, 72);
  ctx.fillStyle = C.onInk;
  ctx.font = `700 52px ${PIXEL}`;
  ctx.fillText('DATACENTER', M + 96, 82);
  ctx.font = `700 24px ${MONO}`;
  ctx.fillStyle = C.lime;
  ctx.fillText('T Y C O O N', M + 98, 114);
  ctx.textAlign = 'right';
  ctx.fillStyle = C.onInk;
  ctx.font = `700 24px ${MONO}`;
  ctx.fillText('PROFIT OR PLANET?', CARD_W - M, 82);
  ctx.textAlign = 'left';

  // Who you became.
  ctx.fillStyle = C.muted;
  ctx.font = `700 28px ${MONO}`;
  ctx.fillText((d.bankrupt ? `BANKRUPT IN ${d.locationName}` : `TEN YEARS IN ${d.locationName}`).toUpperCase(), M, 214);
  ctx.fillStyle = C.ink;
  fit(ctx, d.archetypeTitle.toUpperCase(), PIXEL, '700', 104, 56, W);
  ctx.fillText(d.archetypeTitle.toUpperCase(), M, 320);
  ctx.font = `500 34px ${UI}`;
  wrap(ctx, d.archetypeLine, W, 2).forEach((l, i) => ctx.fillText(l, M, 384 + i * 46));

  // Legacy score.
  const top = 490;
  const legW = 470;
  box(ctx, M, top, legW, 300, C.amber, true);
  ctx.fillStyle = C.ink;
  ctx.font = `700 28px ${MONO}`;
  ctx.fillText('LEGACY SCORE', M + 32, top + 56);
  fit(ctx, String(d.legacy), PIXEL, '700', 170, 90, legW - 64);
  ctx.fillText(String(d.legacy), M + 32, top + 220);
  ctx.font = `500 24px ${UI}`;
  ctx.fillText('= 1000 × √(profit × impact)', M + 32, top + 268);

  // Frontier.
  const fx = M + legW + 40;
  const fw = CARD_W - M - fx;
  box(ctx, fx, top, fw, 300, C.surface, true);
  frontier(ctx, fx + 30, top + 50, fw - 60, 190, d.profitNorm, d.impact);

  // Profit and impact.
  const sTop = 850;
  const sw = (W - 30) / 2;
  const stat = (x: number, fill: string, label: string, value: string, sub: string) => {
    box(ctx, x, sTop, sw, 190, fill);
    ctx.fillStyle = C.ink;
    ctx.font = `700 26px ${MONO}`;
    ctx.fillText(label, x + 28, sTop + 50);
    fit(ctx, value, PIXEL, '700', 72, 40, sw - 56);
    ctx.fillText(value, x + 28, sTop + 128);
    ctx.font = `500 24px ${UI}`;
    ctx.fillText(sub, x + 28, sTop + 168);
  };
  stat(M, C.lime, 'PROFIT', money(d.netWorth), `net worth after ${d.bankrupt ? 'the crash' : '5 years'}`);
  stat(M + sw + 30, C.lavender, 'IMPACT', `${Math.round(d.impact)}/100`, 'planet + responsibility');

  // Challenge band.
  const cTop = 1090;
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, cTop, CARD_W, CARD_H - cTop);
  ctx.fillStyle = C.lime;
  fit(ctx, `CAN YOU BEAT ${d.legacy}?`, PIXEL, '700', 60, 36, W);
  ctx.fillText(`CAN YOU BEAT ${d.legacy}?`, M, cTop + 82);
  ctx.fillStyle = C.onInk;
  ctx.font = `500 30px ${UI}`;
  ctx.fillText('Same campus, same luck. Play the same run:', M, cTop + 134);
  const url = d.link.replace(/^https?:\/\//, '');
  ctx.fillStyle = C.amber;
  fit(ctx, url, MONO, '700', 30, 18, W);
  ctx.fillText(url, M, cTop + 186);
  ctx.fillStyle = '#b8bdcc';
  ctx.font = `700 20px ${MONO}`;
  ctx.fillText('THE SMIC DAY · CENTRALESUPÉLEC', M, CARD_H - 30);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}
