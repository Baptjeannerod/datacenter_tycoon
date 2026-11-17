/**
 * Share a run (DEV-8): native share sheet with the card image when the browser can
 * share files (most phones), otherwise download the image and copy the challenge link.
 */
import { canvasToBlob, drawShareCard, type CardData } from './card';

/** shared: native sheet · downloaded: image saved + link copied · copied: link only (no image) */
export type ShareResult = 'shared' | 'downloaded' | 'copied' | 'cancelled' | 'failed';

export async function shareResultCard(data: CardData, text: string): Promise<ShareResult> {
  let blob: Blob;
  try {
    blob = await canvasToBlob(await drawShareCard(data));
  } catch {
    return copyOnly(text, data.link);
  }
  const file = new File([blob], `datacenter-tycoon-${data.legacy}.png`, { type: 'image/png' });
  const message = `${text} ${data.link}`;

  if (navigator.canShare?.({ files: [file] })) {
    try {
      // The link goes in the text: some targets drop `url` when files are attached.
      await navigator.share({ files: [file], title: 'Datacenter Tycoon', text: message });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // NotAllowedError (gesture expired) and others: fall through to download.
    }
  }

  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
  await copy(message);
  return 'downloaded';
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function copyOnly(text: string, link: string): Promise<ShareResult> {
  return (await copy(`${text} ${link}`)) ? 'copied' : 'failed';
}

export type { CardData } from './card';
