/**
 * @fileoverview Collection — the shelves (G1).
 *
 * One row per collection: its name, how many of its cards have been found, and a
 * strip of what is on it. A shelf with nothing found yet names its home ground
 * instead of a row of grey placeholders. A row opens its own shelf (G2).
 */

import {useRouter} from 'expo-router';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {EmptyState} from '../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../src/components/feedback/skeleton';
import {ArtifactCard} from '../../../src/components/learning/artifact-card';
import type {
  Collection as CollectionRecord,
  CollectionCard,
} from '../../../src/ports/content-model';
import type {Progress} from '../../../src/ports/progress-store';

import {selectItemState, useProgress} from '../../../src/store/progress';
import {useContent} from '../../../src/store/use-content';

export default function Collection() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useProgress(state => state.progress);
  const load = useContent(source => source.listCollections(), []);

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-3 px-5 pb-8" style={{paddingTop: insets.top}}>
        {load.status === 'loading' ? <ShelvesSkeleton /> : null}
        {load.status === 'error' ? (
          <EmptyState title="The shelves open again in a moment">
            Try coming back to this tab.
          </EmptyState>
        ) : null}
        {load.status === 'ready' && load.data.length === 0 ? (
          <EmptyState title="Artifacts wait along the walk">
            What you find in the districts is kept here.
          </EmptyState>
        ) : null}
        {load.status === 'ready'
          ? load.data.map(collection => (
              <CollectionRow
                key={collection.id}
                collection={collection}
                progress={progress}
                onPress={() => router.push(`/collection/${collection.id}`)}
              />
            ))
          : null}
      </View>
    </ScrollView>
  );
}

function CollectionRow({
  collection,
  progress,
  onPress,
}: {
  collection: CollectionRecord;
  progress: Progress | null;
  onPress: () => void;
}) {
  const total = collection.cards.length;
  const found = collection.cards.filter(card => cardFound(card, progress)).length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={collection.title}
      onPress={onPress}
      className="w-full gap-3 rounded-lg bg-surface-card p-4"
    >
      <View className="gap-[2px]">
        <Text className="type-body-strong text-fg-heading">{collection.title}</Text>
        <Text className="type-caption text-fg-muted">{`${found} of ${total} found`}</Text>
      </View>
      {found > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {collection.cards.map(card => (
              <ArtifactCard key={card.key} variant="thumb" found={cardFound(card, progress)} />
            ))}
          </View>
        </ScrollView>
      ) : (
        <Text className="type-caption text-fg-muted">
          {`Found while walking through ${collection.home}.`}
        </Text>
      )}
    </Pressable>
  );
}

function ShelvesSkeleton() {
  return (
    <>
      <Skeleton shape="block" height={112} />
      <Skeleton shape="block" height={112} />
      <Skeleton shape="block" height={112} />
    </>
  );
}

/**
 * Whether a card counts as found.
 *
 * A group card stands for a set rather than a single item, so it has nothing to
 * check progress against. Earning it is deferred by decision — it never reads as
 * found here.
 */
function cardFound(card: CollectionCard, progress: Progress | null): boolean {
  if (card.kind === 'group' || card.itemId === null) {
    return false;
  }
  return selectItemState(progress, card.itemId) !== 'new';
}
