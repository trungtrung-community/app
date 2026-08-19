/**
 * @fileoverview The H1 share actions — the whole call site, for the card screen.
 *
 * Sharing is three native modules deep (view-shot, the file system, the system share
 * sheet), and `app/**` may name none of them. This is the door, the way `cue.ts` is the
 * door for sound: the screen holds a ref to its own off-stage composition and says
 * which format leaves; everything platform-shaped happens behind this file.
 *
 * On web there is nothing to open — `expo-sharing` has no web implementation worth
 * shipping — so `canShareCard` is false and the screen renders no share entry at all.
 * Absent, never disabled: the repo's platform idiom is that web gets the honest answer
 * through the seam (the silent cue player, the silent scheduler), and for a whole entry
 * point the honest answer is that it is not there.
 */

import {Platform} from 'react-native';

import type {CardExportFormat, CardShot} from '../infra/share/card-image-exporter';

export type {CardExportFormat, CardShot} from '../infra/share/card-image-exporter';

/** Whether this platform can share a card at all. False hides H1's entry, it never disables it. */
export const canShareCard = Platform.OS !== 'web';

/**
 * Capture the off-stage card and open the system share sheet — H2 (square) and H3 (story).
 *
 * Fire and forget, `cue.ts`'s trade: a share that cannot start is a system sheet that
 * never opened, and interrupting the card screen over it helps nobody. The native
 * modules arrive by dynamic import so no test or web bundle pays for them.
 *
 * @example void shareCardImage(squareShot, 'square', card.name);
 */
export async function shareCardImage(
  shot: CardShot,
  format: CardExportFormat,
  name: string,
): Promise<void> {
  if (!canShareCard) {
    return;
  }
  try {
    const {exportCardImage} = await import('../infra/share/card-image-exporter');
    await exportCardImage(shot, format, name);
  } catch {
    // Cancelling the system sheet resolves; only a real failure lands here, and it
    // is silence for the same reason a missing cue is.
  }
}

/**
 * Put the Tibetan on the clipboard — H1's third row, the one a learner actually wants.
 *
 * Awaitable and allowed to reject, unlike the image path: the screen shows the
 * "Copied" toast only once the write has actually happened.
 */
export async function copyTibetan(text: string): Promise<void> {
  const clipboard = await import('expo-clipboard');
  await clipboard.setStringAsync(text);
}
