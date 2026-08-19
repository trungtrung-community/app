/**
 * @fileoverview The H2/H3 export pipeline: capture a mounted card, hand it to the system.
 *
 * Three native modules meet here and nowhere else — `react-native-view-shot` takes the
 * picture, `expo-file-system` gives it a name worth sending, `expo-sharing` opens the
 * system sheet. The screen renders the `ShareCard` off-stage at design width and passes
 * a ref; this file never decides what the card looks like, only how it leaves.
 *
 * The capture is taken from the design-width view and resized to the export pixels,
 * rather than from a view laid out at 1080. `ShareCard`'s type does not scale with its
 * width — the tokens are fixed points — so a 1080-wide layout would be a different,
 * emptier composition, not a larger one.
 */

import {File, Paths} from 'expo-file-system';
import {captureRef} from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import type {RefObject} from 'react';
import type {View} from 'react-native';

/** A ref to the mounted, off-stage card composition the screen holds. */
export type CardShot = RefObject<View | null>;

/** The two board compositions. Mirrors `ShareCardFormat`, stated here so this layer owns its own contract. */
export type CardExportFormat = 'square' | 'story';

/** H2 and H3's pixel sizes: 1:1 and 9:16 at 1080 wide. */
export const EXPORT_PIXELS = {
  square: {width: 1080, height: 1080},
  story: {width: 1080, height: 1920},
} as const satisfies Record<CardExportFormat, {width: number; height: number}>;

/**
 * Capture the card and open the system share sheet on the result.
 *
 * `name` is prose — usually the item's English — and becomes the file name the
 * receiver sees. Resolves when the system sheet closes, shared or not.
 *
 * @example await exportCardImage(squareShot, 'square', 'the tea churn');
 */
export async function exportCardImage(
  shot: CardShot,
  format: CardExportFormat,
  name: string,
): Promise<void> {
  const {width, height} = EXPORT_PIXELS[format];
  const captured = await captureRef(shot, {format: 'png', result: 'tmpfile', width, height});
  // view-shot's tmpfile carries a generated name; the file the learner sends on
  // should say what it is, so it moves to the cache under its own.
  const target = new File(Paths.cache, `${fileSlug(name)}-${format}.png`);
  await new File(captured).move(target, {overwrite: true});
  await Sharing.shareAsync(target.uri, {mimeType: 'image/png', UTI: 'public.png'});
}

/** "the tea churn" -> "trungtrung-the-tea-churn". Never empty: a blank name still gets a file. */
function fileSlug(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return words === '' ? 'trungtrung-card' : `trungtrung-${words}`;
}
