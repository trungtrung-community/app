/**
 * @fileoverview DisplayItem — what a session renderer needs to draw any item.
 *
 * The dictionary kinds carry their full records into `itemsById`, but a letter's
 * record answers reference questions a drill never asks. This type is the
 * narrow shape every renderer actually reads — glyph, romanisation, gloss — so
 * a letter can sit in the same map as a word without dragging the whole
 * `Letter` vocabulary into the components.
 */

import type {ContentItemId, ItemKind} from '../ports/content-ids';
import type {Letter} from '../ports/content-model';

/** One resolvable item, reduced to what a screen draws. */
export type DisplayItem = {
  readonly id: ContentItemId;
  readonly kind: ItemKind;
  /** The item in Tibetan script. For a vowel this is the mark on its carrier. */
  readonly bo: string;
  /** The romanised reading — for a letter, its spoken name. */
  readonly roman: string;
  /** The English gloss, or the best available stand-in. */
  readonly en: string;
};

/**
 * A letter as the session displays it.
 *
 * The name is preferred for both readings: the see-it-say-it options are the
 * letter names ("dreng bu", "na ro"), which is what the content's own option
 * labels carry.
 */
export function letterDisplayItem(letter: Letter): DisplayItem {
  const name = letter.name ?? letter.romanization ?? letter.wylie ?? '';
  return {
    id: letter.id as string as ContentItemId,
    kind: 'letter',
    bo: letter.bo,
    roman: name,
    en: name,
  };
}
