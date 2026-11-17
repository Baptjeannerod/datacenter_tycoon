/**
 * Static link-preview image (og:image, 1200×630) for DEV-8. Not imported by the app:
 * it is generated once and committed as public/og.png. To regenerate, run the dev
 * server and paste in the browser console:
 *   (await import('/ui/share/og.ts')).downloadOgImage()
 */
import { box, C, canvasToBlob, fit, frontier, mark, MONO, PIXEL, UI, wrap } from './card';

export async function drawOgImage(): Promise<HTMLCanvasElement> {
  await Promise.all([document.fonts.load('700 64px Silkscreen'), document.fonts.load('400 64px Silkscreen')]).catch(() => undefined);
  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(29, 34, 50, 0.08)';
  for (let gx = 18; gx < W; gx += 36) for (let gy = 18; gy < H; gy += 36) ctx.fillRect(gx, gy, 3, 3);

  const M = 56;
  // Header band.
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, 118);
  mark(ctx, M, 26, 66);
  ctx.fillStyle = C.onInk;
  ctx.font = `700 48px ${PIXEL}`;
  ctx.fillText('DATACENTER', M + 90, 70);
  ctx.fillStyle = C.lime;
  ctx.font = `700 22px ${MONO}`;
  ctx.fillText('T Y C O O N', M + 92, 100);
  ctx.textAlign = 'right';
  ctx.fillStyle = C.onInk;
  ctx.fillText('A 4-MINUTE BROWSER GAME', W - M, 70);
  ctx.textAlign = 'left';

  // Pitch.
  const leftW = 620;
  ctx.fillStyle = C.ink;
  fit(ctx, 'PROFIT OR PLANET?', PIXEL, '700', 76, 40, leftW);
  ctx.fillText('PROFIT OR PLANET?', M, 220);
  ctx.font = `500 30px ${UI}`;
  wrap(ctx, 'Run a datacenter for 10 years. Get rich. Stay responsible. You can’t max both.', leftW, 3).forEach((l, i) => ctx.fillText(l, M, 280 + i * 42));

  // Tags.
  let x = M;
  for (const [text, fill] of [
    ['NO GRID', C.lime],
    ['NO SIGN-UP', C.lavender],
    ['BEAT MY SCORE', C.amber],
  ] as const) {
    ctx.font = `700 22px ${MONO}`;
    const w = ctx.measureText(text).width + 36;
    box(ctx, x, 404, w, 54, fill);
    ctx.fillStyle = C.ink;
    ctx.fillText(text, x + 18, 439);
    x += w + 18;
  }

  // Frontier.
  const fx = 740;
  const fw = W - M - fx;
  box(ctx, fx, 160, fw, 320, C.surface, true);
  frontier(ctx, fx + 30, 210, fw - 60, 210, 0.75, 58, 'YOU?');

  // Footer band.
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, H - 96, W, 96);
  ctx.fillStyle = C.amber;
  ctx.font = `700 28px ${MONO}`;
  ctx.fillText('datacenter-tycoon-plum.vercel.app', M, H - 38);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#b8bdcc';
  ctx.font = `700 20px ${MONO}`;
  ctx.fillText('THE SMIC DAY · CENTRALESUPÉLEC', W - M, H - 40);
  ctx.textAlign = 'left';
  return canvas;
}

/** Dev helper: download og.png. */
export async function downloadOgImage() {
  const blob = await canvasToBlob(await drawOgImage());
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'og.png';
  a.click();
}
