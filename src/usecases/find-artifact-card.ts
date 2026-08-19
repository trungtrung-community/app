/**
 * @fileoverview Where an artifact item's keepsake card lives on the shelves.
 *
 * A stop that holds an artifact ends on that artifact's card (G4 → G3), but the
 * stop's items name content records, not shelf positions. This use case turns an
 * item id into the collection and ordinal the card route addresses —
 * `/card/{collection.id}/{ordinal}` — so the ending flow can push the same
 * screen the shelves open.
 *
 * The scan reads every collection. The whole shelf set is ten collections and
 * ~110 cards, so an index would be speculation.
 */

import type {Collection, CollectionCard} from '../ports/content-model';
import type {CollectionSource} from '../ports/content-source';

/**
 * One found card, addressed the way the card route wants it.
 *
 * `ordinal` duplicates `card.ordinal` so a caller can build the route without
 * knowing which field the addressing runs on.
 */
export type ArtifactCard = {
  readonly collection: Collection;
  readonly card: CollectionCard;
  readonly ordinal: number;
};

export type FindArtifactCardDeps = {
  readonly collections: CollectionSource;
};

/**
 * The shelf card holding the given item, or null when no collection holds it.
 *
 * Null is an answer, not an error: 112 of 185 stops hold no artifact, and a
 * word can be an artifact record without a card on any shelf.
 */
export async function findArtifactCard(
  deps: FindArtifactCardDeps,
  itemId: string,
): Promise<ArtifactCard | null> {
  const found = await findArtifactCards(deps, [itemId]);
  return found[0] ?? null;
}

/**
 * The shelf cards for a stop's artifact items, in the given order.
 *
 * Items without a card are dropped rather than reported, so the result is
 * exactly the pages the G4 sheet turns — `1 of n` over what was actually found.
 */
export async function findArtifactCards(
  deps: FindArtifactCardDeps,
  itemIds: readonly string[],
): Promise<readonly ArtifactCard[]> {
  const collections = await deps.collections.listCollections();
  const byItem = new Map<string, ArtifactCard>();
  for (const collection of collections) {
    for (const card of collection.cards) {
      if (card.itemId !== null && !byItem.has(card.itemId)) {
        byItem.set(card.itemId, {collection, card, ordinal: card.ordinal});
      }
    }
  }
  return itemIds
    .map(itemId => byItem.get(itemId))
    .filter((found): found is ArtifactCard => found !== undefined);
}
