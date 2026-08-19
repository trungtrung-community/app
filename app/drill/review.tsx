/**
 * @fileoverview Q2 — mixed review: everything due today, words and phrases
 * interleaved in the scheduler's order, closed by the Q3 summary.
 *
 * The provenance line rides the answer band — "you met it at The Monastery" —
 * so review says why an item came back. A counter, never a bar; the x leaves
 * immediately, ratings kept. The Q3 summary marks what got firmer with the
 * filled check and the come-back list with the hollow ring, and *Back to
 * practice* closes the loop on Q1.
 */

import {useRouter} from 'expo-router';
import {useEffect} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Badge} from '../../src/components/core/badge';
import {Button} from '../../src/components/core/button';
import {IconButton} from '../../src/components/core/icon-button';
import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {AnswerBand} from '../../src/components/learning/answer-band';
import {CapabilityList, type Capability} from '../../src/components/learning/capability-list';
import {ExerciseFrame} from '../../src/components/session/exercise-frame';
import type {Items} from '../../src/components/session/types';
import type {ContentItemId} from '../../src/ports/content-ids';

import {selectWorthAnotherLook, useDrillSession} from '../../src/store/drill';
import type {SessionState} from '../../src/usecases/drill-plan';

export default function Review() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slice = useDrillSession();

  useEffect(() => {
    void useDrillSession.getState().startReview();
    return () => useDrillSession.getState().reset();
  }, []);

  const state = slice.state;
  const itemsById = (slice.pool?.itemsById ?? new Map()) as Items;
  const entry = state?.queue[state.index];
  const ended = state?.phase === 'ended' || entry?.position.kind === 'end';
  const total = state?.queue.filter(e => e.position.kind === 'exercise').length ?? 0;

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      <View className="flex-row items-center gap-3 px-5 py-2">
        {/* The x leaves immediately — no dialog, ratings kept (docs/03 §4). */}
        <IconButton icon="x" label="Leave the review" onPress={() => router.back()} />
        <Badge tone="soft">Review</Badge>
        <View className="flex-1" />
        {!ended && total > 0 && state !== null ? (
          <Text className="type-body-strong text-fg-muted" testID="review-counter">
            {`${Math.min(state.index + 1, total)} of ${total}`}
          </Text>
        ) : null}
      </View>
      {slice.status === 'error' ? (
        <View className="px-5 pt-6">
          <EmptyState title="Try opening the review again" />
        </View>
      ) : slice.status !== 'ready' || state === null ? (
        <View className="gap-4 px-5 pt-8">
          <Skeleton shape="text" width="60%" />
          <Skeleton shape="block" height={180} />
          <Skeleton shape="text" />
        </View>
      ) : (
        <>
          <ScrollView className="flex-1">
            <View className="gap-4 px-5 pb-32 pt-4">
              {ended || entry === undefined ? (
                <ReviewSummary
                  itemIds={slice.set?.itemIds ?? []}
                  worthAnotherLook={selectWorthAnotherLook(state, null)}
                  itemsById={itemsById}
                  onDone={() => {
                    void useDrillSession
                      .getState()
                      .commit({kind: 'finish'})
                      .then(() => router.replace('/practice'));
                  }}
                />
              ) : entry.position.kind === 'exercise' ? (
                <ExerciseFrame
                  key={entry.key}
                  entry={entry}
                  answered={state.answered}
                  matched={state.matched}
                  itemsById={itemsById}
                  onCommit={input => void useDrillSession.getState().commit(input)}
                />
              ) : null}
            </View>
          </ScrollView>
          {state.answered !== null && state.answered.verdict !== 'partial' ? (
            <ReviewBand
              state={state}
              itemsById={itemsById}
              provenance={provenanceLine(state)}
              onNext={() => void useDrillSession.getState().commit({kind: 'continue'})}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

/** "you met it at The Monastery" — why this item came back (board Q2). */
function provenanceLine(state: SessionState): string | undefined {
  const itemId = state.answered?.answerItemId;
  if (itemId == null) {
    return undefined;
  }
  const district = useDrillSession.getState().pool?.districtNameByItem.get(itemId);
  return district === undefined ? undefined : `you met it at ${district}`;
}

type ReviewBandProps = {
  state: SessionState;
  itemsById: Items;
  provenance?: string;
  onNext: () => void;
};

function ReviewBand({state, itemsById, provenance, onNext}: ReviewBandProps) {
  const answered = state.answered;
  if (answered === null) {
    return null;
  }
  const item =
    answered.answerItemId === null
      ? undefined
      : itemsById.get(answered.answerItemId as ContentItemId);
  return (
    <AnswerBand
      tone={answered.verdict === 'correct' ? 'correct' : 'wrong'}
      roman={item?.roman}
      reason={provenance}
      audio={false}
      pinned
      onAction={onNext}
    >
      {item?.bo ?? ''}
    </AnswerBand>
  );
}

type ReviewSummaryProps = {
  itemIds: readonly string[];
  worthAnotherLook: readonly string[];
  itemsById: Items;
  onDone: () => void;
};

/** Q3 — what got firmer, what to come back to. Never a score. */
function ReviewSummary({itemIds, worthAnotherLook, itemsById, onDone}: ReviewSummaryProps) {
  const missed = new Set(worthAnotherLook);
  const toCapability = (itemId: string): Capability | null => {
    const item = itemsById.get(itemId as ContentItemId);
    return item === undefined
      ? null
      : {
          capability: item.en ?? '',
          example: [item.bo, item.roman].filter(Boolean).join(' '),
        };
  };
  const firmer = itemIds
    .filter(itemId => !missed.has(itemId))
    .map(toCapability)
    .filter(capability => capability !== null);
  const comeBack = worthAnotherLook.map(toCapability).filter(capability => capability !== null);

  return (
    <View className="gap-6 py-6">
      <Text accessibilityRole="header" className="type-title text-fg-heading">
        That&apos;s the review
      </Text>
      {firmer.length > 0 ? (
        <View className="gap-2">
          <Text className="type-body-strong text-fg-heading">Firmer now</Text>
          <CapabilityList items={firmer} />
        </View>
      ) : null}
      {comeBack.length > 0 ? (
        <View className="gap-2">
          <Text className="type-body-strong text-fg-heading">Come back to these</Text>
          <CapabilityList items={comeBack} marker="ring" />
        </View>
      ) : null}
      <Button size="lg" fullWidth onPress={onDone}>
        Back to practice
      </Button>
    </View>
  );
}
