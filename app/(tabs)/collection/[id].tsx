/**
 * @fileoverview Collection detail (G2) — one shelf, card by card.
 *
 * Every card the collection holds, found or not — the same triple either way,
 * Tibetan and its romanization and the English name, per `ArtifactCard`. A found
 * card opens the cultural card (G3); an unfound one stays inert until it is.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {EmptyState} from '../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../src/components/feedback/skeleton';
import {ArtifactCard} from '../../../src/components/learning/artifact-card';
import {SectionHeader} from '../../../src/components/learning/section-header';
import type {CollectionId, PhraseId, VocabId} from '../../../src/ports/content-ids';
import type {CollectionCard} from '../../../src/ports/content-model';
import type {ContentSource} from '../../../src/ports';
import type {Progress} from '../../../src/ports/progress-store';

import {selectItemState, useProgress} from '../../../src/store/progress';
import {useContent} from '../../../src/store/use-content';

/** What a card shows, once its underlying item (where it has one) is resolved. */
type CardFace = {
  readonly card: CollectionCard;
  readonly name: string;
  readonly bo?: string;
  readonly roman?: string;
};

type Detail = {
  readonly title: string;
  readonly home: string;
  readonly faces: readonly CardFace[];
};

export default function CollectionDetail() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useProgress(state => state.progress);

  const load = useContent<Detail>(
    async source => {
      // A route param is a raw string; the brand is restored here, at the boundary.
      const collection = await source.getCollection(id as CollectionId);
      const faces = await Promise.all(collection.cards.map(card => resolveFace(source, card)));
      return {title: collection.title, home: collection.home, faces};
    },
    [id],
  );

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-4 px-5 pb-8" style={{paddingTop: insets.top}}>
        {load.status === 'loading' ? <DetailSkeleton /> : null}
        {load.status === 'error' ? (
          <EmptyState title="That shelf is off the map">Go back and try another one.</EmptyState>
        ) : null}
        {load.status === 'ready' ? (
          <>
            <SectionHeader eyebrow={load.data.home} align="start">
              {load.data.title}
            </SectionHeader>
            <View className="flex-row flex-wrap gap-3">
              {load.data.faces.map(face => {
                const found = cardFound(face.card, progress);
                return (
                  <ArtifactCard
                    key={face.card.key}
                    name={face.name}
                    bo={face.bo}
                    roman={face.roman}
                    found={found}
                    onPress={
                      found ? () => router.push(`/card/${id}/${face.card.ordinal}`) : undefined
                    }
                  />
                );
              })}
            </View>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function DetailSkeleton() {
  return (
    <View className="flex-row flex-wrap gap-3">
      <Skeleton shape="block" width={165} height={165} />
      <Skeleton shape="block" width={165} height={165} />
      <Skeleton shape="block" width={165} height={165} />
    </View>
  );
}

/**
 * The face a card shows on the grid.
 *
 * A vocab or phrase card carries a single item, fetched here for its Tibetan,
 * romanization and English name. A group card names a set the content itself
 * names — `groupName` — rather than a member, and carries no script of its own.
 */
async function resolveFace(source: ContentSource, card: CollectionCard): Promise<CardFace> {
  if (card.kind === 'vocab' && card.itemId !== null) {
    const item = await source.getVocabulary(card.itemId as VocabId);
    return {card, name: item.en, bo: item.bo, roman: item.roman};
  }
  if (card.kind === 'phrase' && card.itemId !== null) {
    const item = await source.getPhrase(card.itemId as PhraseId);
    return {card, name: item.en, bo: item.bo, roman: item.roman};
  }
  return {card, name: groupDisplayName(card.groupName)};
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

/** "prayer-flag-colours" -> "Prayer flag colours". No membership is invented here. */
function groupDisplayName(groupName: string | null): string {
  if (!groupName) {
    return '';
  }
  const words = groupName.split('-').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
