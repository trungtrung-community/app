/**
 * @fileoverview An item id resolves to its shelf address, and only items with a
 * card resolve at all. The double mirrors the fixture's `collection.land`, where
 * stop.meeting.c1.5's artifact — vocab.tibet — sits at ordinal 8. Phases per
 * docs/11.
 */

import {describe, expect, it} from 'vitest';

import type {CollectionId, ContentItemId} from '../ports/content-ids';
import type {Collection, CollectionCard} from '../ports/content-model';

import {findArtifactCard, findArtifactCards, type FindArtifactCardDeps} from './find-artifact-card';

function card(ordinal: number, itemId: string | null): CollectionCard {
  return {
    ordinal,
    key: itemId ?? `group.${ordinal}`,
    kind: itemId === null ? 'group' : 'vocab',
    itemId: itemId === null ? null : (itemId as ContentItemId),
    groupName: itemId === null ? 'the-twelve-animals' : null,
    illustration: false,
  };
}

const LAND: Collection = {
  id: 'collection.land' as CollectionId,
  title: 'The land',
  home: 'The Pass',
  completeWhen: 'all',
  cards: [card(0, 'phrase.pass.victory-to-the-gods'), card(1, null), card(8, 'vocab.tibet')],
};

function deps(): FindArtifactCardDeps {
  return {
    collections: {
      listCollections: async () => [LAND],
      getCollection: async id => {
        throw new Error(`unused: ${id}`);
      },
    },
  };
}

describe('findArtifactCard', () => {
  it("finds the shelf address of stop.meeting.c1.5's artifact", async () => {
    // When
    const found = await findArtifactCard(deps(), 'vocab.tibet');

    // Then
    expect(found?.collection.id).toBe('collection.land');
    expect(found?.ordinal).toBe(8);
    expect(found?.card.itemId).toBe('vocab.tibet');
  });

  it('answers null for an item no shelf holds', async () => {
    // When
    const found = await findArtifactCard(deps(), 'vocab.girl');

    // Then
    expect(found).toBeNull();
  });
});

describe('findArtifactCards', () => {
  it('keeps the given order and drops the cardless', async () => {
    // When
    const found = await findArtifactCards(deps(), [
      'vocab.tibet',
      'vocab.girl',
      'phrase.pass.victory-to-the-gods',
    ]);

    // Then
    expect(found.map(page => page.ordinal)).toEqual([8, 0]);
  });
});
