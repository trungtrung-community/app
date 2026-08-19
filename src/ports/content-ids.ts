/**
 * @fileoverview What content is addressed by: identifiers, kinds and tracks.
 *
 * Split out of the port so that the value types, the exercise union and the port
 * itself can each name an id without importing one another. Nothing here has
 * behaviour; it is the vocabulary the other three files are written in.
 *
 * Ids are branded strings rather than bare ones. A `StopId` and a `VocabId` are both
 * strings and are never interchangeable, and the brand is what makes passing one
 * where the other is meant a compile error instead of an empty result.
 *
 * The brands cost nothing at runtime. `'vocab.tashi-delek' as VocabId` is the whole
 * conversion, and it happens at the adapter boundary, which is the only place a raw
 * string arrives.
 */

import type {ItemId} from '../domain/item';

/**
 * Anything a learner can be taught, as an id.
 *
 * Deliberately open across the seven kinds, because the content is: a stop teaches
 * words, phrases, letters, stacks, syllables, read-words and marks, and one
 * `stop_item` list holds all of them. Each of the seven has its own branded type
 * below, because the port serves every one of them as a record.
 *
 * This is the same string that `ItemProgress.itemId` in `src/domain/item.ts` is keyed
 * on, and the types are joined in that direction: every `ContentItemId` is an
 * `ItemId`, so a content id flows into the progress functions with no cast, while
 * the domain stays ignorant of content.
 */
export type ContentItemId = ItemId & {readonly __item: true};

export type VocabId = ContentItemId & {readonly __brand: 'VocabId'};
export type PhraseId = ContentItemId & {readonly __brand: 'PhraseId'};
export type LetterId = ContentItemId & {readonly __brand: 'LetterId'};
export type StackId = ContentItemId & {readonly __brand: 'StackId'};
export type SyllableId = ContentItemId & {readonly __brand: 'SyllableId'};
export type ReadWordId = ContentItemId & {readonly __brand: 'ReadWordId'};
export type MarkId = ContentItemId & {readonly __brand: 'MarkId'};

export type SectionId = string & {readonly __brand: 'SectionId'};
export type DistrictId = string & {readonly __brand: 'DistrictId'};
export type StopId = string & {readonly __brand: 'StopId'};
export type ExerciseId = string & {readonly __brand: 'ExerciseId'};
export type ChunkId = string & {readonly __brand: 'ChunkId'};
export type CollectionId = string & {readonly __brand: 'CollectionId'};
export type ReadRuleId = string & {readonly __brand: 'ReadRuleId'};
export type AffixId = string & {readonly __brand: 'AffixId'};
export type CombinerId = string & {readonly __brand: 'CombinerId'};
export type ReadCueId = string & {readonly __brand: 'ReadCueId'};

/**
 * The two halves of the product: speaking Tibetan, and reading it.
 *
 * A learner walks them independently and the app never blends them, so almost
 * everything below carries which one it belongs to.
 */
export type Track = 'speak' | 'read';

/**
 * What kind of thing an id names.
 *
 * Carried alongside the id wherever a reference is polymorphic, because the id
 * alone cannot say. A `stop_item` naming `syllable.gci` and one naming
 * `vocab.tea` are the same column in storage and different screens in the app.
 *
 * Each member matches a generated column union, so a kind added to the content
 * fails the mapper's assignment rather than arriving as an unrecognised string.
 */
export type ItemKind = 'vocab' | 'phrase' | 'letter' | 'stack' | 'syllable' | 'word' | 'mark';

/** An id together with the kind that says how to resolve it. */
export type ItemRef = {
  readonly id: ContentItemId;
  readonly kind: ItemKind;
};

/**
 * A recording, as a planned path and whether the take exists.
 *
 * Two fields rather than a nullable path, because the two facts are genuinely
 * different and the app needs both. `path` is deterministic and is minted by the
 * content build from the item's own identity, so it is known long before anyone
 * records anything — the recording studio and the app agree on it exactly, which is
 * how a delivered take finds its item.
 *
 * `available` is generated from the audio manifest, which lists only takes whose
 * checksum verified against the delivered bundle. It is false on every item today.
 *
 * The listen control keys on `available`. A control that is hidden when there is no
 * recording is the design; one that is shown and fails is not.
 */
export type AudioRef = {
  readonly path: string;
  readonly available: boolean;
};
