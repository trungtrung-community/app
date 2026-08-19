/**
 * @fileoverview Q5 — worth another look, the only count of failures anywhere,
 * framed as information.
 *
 * Inbound from Q1's row 0: pool everything, selection still getting. The rows
 * are the set the drill machine resolves, so the list and the practice run can
 * never disagree about what "still getting" holds. One docked action hands the
 * same set to the flashcard runner. Re-reads on focus, because coming back
 * from the drill is exactly when the list should have changed.
 */

import {useFocusEffect, useRouter} from 'expo-router';
import {useCallback} from 'react';
import {ScrollView, Text, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../../src/components/core/button';
import {IconButton} from '../../../src/components/core/icon-button';
import {EmptyState} from '../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../src/components/feedback/skeleton';
import {WordRow} from '../../../src/components/learning/word-row';

import {useProgress} from '../../../src/store/progress';
import {useDrillSession} from '../../../src/store/drill';

export default function StillGetting() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const slice = useDrillSession();
  const progress = useProgress(state => state.progress);

  useFocusEffect(
    useCallback(() => {
      void useDrillSession.getState().start({kind: 'everything'}, 'still-getting', null);
    }, []),
  );

  const itemIds = slice.set?.itemIds ?? [];

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      <View className="flex-row items-center gap-3 px-5 py-2">
        {/* The design system has no chevron-left; the down one rotates, as ListRow's does. */}
        <IconButton
          icon="chevron-down"
          label="Back"
          style={BACK_ROTATION}
          onPress={() => router.back()}
        />
        <Text accessibilityRole="header" className="type-title text-fg-heading">
          Worth another look
        </Text>
      </View>
      {slice.status === 'ready' && itemIds.length > 0 ? (
        <Text className="type-body text-fg-muted px-5 pb-2">{acrossLine(slice)}</Text>
      ) : null}
      {slice.status === 'error' ? (
        <View className="px-5 pt-6">
          <EmptyState title="Try opening this list again" />
        </View>
      ) : slice.status !== 'ready' ? (
        <View className="gap-2 px-5 pt-4">
          <Skeleton shape="text" />
          <Skeleton shape="text" />
          <Skeleton shape="text" />
        </View>
      ) : (
        <>
          <ScrollView className="flex-1">
            <View className="gap-2 px-5 pb-32 pt-2">
              {itemIds.map(itemId => {
                const item = slice.pool?.itemsById.get(itemId);
                const misses = progress?.items[itemId]?.missedOn.length ?? 0;
                return item === undefined ? null : (
                  <WordRow
                    key={itemId}
                    bo={item.bo}
                    roman={item.roman}
                    en={item.en}
                    status="met"
                    audio={item.audio.available}
                    missed={`Met ${misses} ${misses === 1 ? 'time' : 'times'}, not yet yours`}
                  />
                );
              })}
            </View>
          </ScrollView>
          {itemIds.length > 0 ? (
            <View className="px-5 pb-4">
              <Button
                fullWidth
                size="lg"
                onPress={() =>
                  router.push(
                    '/drill/flashcards?pool=everything&selection=still-getting&entry=still-getting',
                  )
                }
              >
                {`Practise these ${itemIds.length}`}
              </Button>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const BACK_ROTATION: ViewStyle = {transform: [{rotate: '90deg'}]};

/** The board's scope line — "6 words, across 3 districts." — with real counts. */
function acrossLine(slice: ReturnType<typeof useDrillSession.getState>): string {
  const itemIds = slice.set?.itemIds ?? [];
  const words = itemIds.filter(itemId => slice.pool?.itemKinds.get(itemId) === 'vocab').length;
  const phrases = itemIds.length - words;
  const districts = new Set(
    itemIds
      .map(itemId => slice.pool?.districtNameByItem.get(itemId))
      .filter(name => name !== undefined),
  ).size;
  const material = [
    words > 0 ? `${words} ${words === 1 ? 'word' : 'words'}` : null,
    phrases > 0 ? `${phrases} ${phrases === 1 ? 'phrase' : 'phrases'}` : null,
  ]
    .filter(part => part !== null)
    .join(' and ');
  return `${material}, across ${districts} ${districts === 1 ? 'district' : 'districts'}.`;
}
