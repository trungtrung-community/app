/**
 * @fileoverview The cultural card (G3) — one artifact, full screen.
 *
 * A stack-root route rather than a tab: opening a card leaves the shelves behind
 * for a single full-screen surface, with no tab bar under it. Paged "1 of n"
 * chrome belongs to the stop-ending flow and is not part of this screen.
 */

import {useLocalSearchParams} from 'expo-router';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {EmptyState} from '../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../src/components/feedback/skeleton';
import {TibetanText} from '../../../src/components/learning/tibetan-text';
import type {CollectionId, PhraseId, VocabId} from '../../../src/ports/content-ids';

import {useContent} from '../../../src/store/use-content';

/** What the card face needs, once its collection card and item are resolved. */
type CardWhole = {
  readonly illustrated: boolean;
  readonly name: string;
  readonly bo: string | null;
  readonly roman: string | null;
  readonly culturalNote: string | null;
  readonly foundAt: string | null;
};

export default function Card() {
  const {collectionId, ordinal} = useLocalSearchParams<{
    collectionId: string;
    ordinal: string;
  }>();
  const insets = useSafeAreaInsets();

  const load = useContent<CardWhole>(
    async source => {
      // Route params are raw strings; the brand is restored here, at the boundary.
      const collection = await source.getCollection(collectionId as CollectionId);
      const n = Number(ordinal);
      const card = collection.cards.find(candidate => candidate.ordinal === n);
      if (!card) {
        throw new Error(`no card at ordinal ${ordinal} in ${collectionId}`);
      }
      if (card.kind === 'group' || card.itemId === null) {
        return {
          illustrated: card.illustration,
          name: groupDisplayName(card.groupName),
          bo: null,
          roman: null,
          culturalNote: null,
          foundAt: null,
        };
      }
      const item =
        card.kind === 'vocab'
          ? await source.getVocabulary(card.itemId as VocabId)
          : await source.getPhrase(card.itemId as PhraseId);
      const district = await source.getDistrict(item.district);
      return {
        illustrated: card.illustration,
        name: item.en,
        bo: item.bo,
        roman: item.roman,
        culturalNote: item.culturalNote,
        foundAt: district.name,
      };
    },
    [collectionId, ordinal],
  );

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="items-center gap-4 px-5 pb-8" style={{paddingTop: insets.top}}>
        {load.status === 'loading' ? <CardSkeleton /> : null}
        {load.status === 'error' ? (
          <EmptyState title="That card is off the shelf">Go back and try another one.</EmptyState>
        ) : null}
        {load.status === 'ready' ? (
          <>
            {load.data.illustrated ? (
              <View
                testID="card-illustration"
                className="h-40 w-40 items-center justify-center rounded-lg bg-surface-accent-soft"
              >
                <View className="h-16 w-16 rounded-lg bg-ink-900" />
              </View>
            ) : null}
            {load.data.bo ? (
              <TibetanText
                size="xl"
                align="center"
                unit="word"
                roman={load.data.roman ?? undefined}
                gloss={load.data.name}
              >
                {load.data.bo}
              </TibetanText>
            ) : (
              <Text className="type-heading text-fg-heading text-center">{load.data.name}</Text>
            )}
            {load.data.culturalNote ? (
              <Text className="type-body text-fg-body">{load.data.culturalNote}</Text>
            ) : null}
            {load.data.foundAt ? (
              <Text className="type-caption text-fg-muted">{`Found at ${load.data.foundAt}`}</Text>
            ) : null}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function CardSkeleton() {
  return (
    <View className="items-center gap-4">
      <Skeleton shape="block" width={160} height={160} />
      <Skeleton shape="text" width={180} />
      <Skeleton shape="text" width={220} />
    </View>
  );
}

/** "prayer-flag-colours" -> "Prayer flag colours". No membership is invented here. */
function groupDisplayName(groupName: string | null): string {
  if (!groupName) {
    return '';
  }
  const words = groupName.split('-').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
