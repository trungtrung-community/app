/**
 * @fileoverview The stop screen — the lesson loop's one route.
 *
 * Thin by design: the engine owns the queue and the verdicts, the use case owns
 * persistence, and this file only dispatches `queue[index]` by kind to the
 * renderers in src/components/session. Full-screen at the stack root, so the
 * tab bar stays out of a lesson.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {useEffect} from 'react';
import {ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {IconButton} from '../../src/components/core/icon-button';
import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {AnswerBand} from '../../src/components/learning/answer-band';
import {ProgressBar} from '../../src/components/learning/progress-bar';
import {EndScreen} from '../../src/components/session/end-screen';
import {ExerciseFrame} from '../../src/components/session/exercise-frame';
import {IntroScreen} from '../../src/components/session/intro-screen';
import {ItemCard} from '../../src/components/session/item-card';
import {MomentScreen} from '../../src/components/session/moment-screen';
import {NoteCard} from '../../src/components/session/note-card';
import {SecondLookIntro} from '../../src/components/session/second-look-intro';
import type {Items} from '../../src/components/session/types';
import type {ContentItemId, StopId} from '../../src/ports/content-ids';

import {useStopSession} from '../../src/store/session';
import type {SessionState} from '../../src/usecases/start-stop';
import type {CommitInput} from '../../src/usecases/submit-answer';

export default function Stop() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slice = useStopSession();

  useEffect(() => {
    // A route param is a raw string; the brand is restored at the boundary.
    void useStopSession.getState().start(id as StopId);
    return () => useStopSession.getState().reset();
  }, [id]);

  const state = slice.state;
  const entry = state?.queue[state.index];

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      <View className="flex-row items-center gap-3 px-5 py-2">
        <IconButton icon="x" label="Leave the stop" onPress={() => router.back()} />
        <View className="flex-1">
          <ProgressBar
            testID="stop-progress"
            value={state?.index ?? 0}
            max={state?.queue.length ?? 1}
          />
        </View>
      </View>
      {slice.status === 'error' ? (
        <View className="px-5 pt-6">
          <EmptyState title="That stop is off the map">
            Head back to the district and pick the walk up from there.
          </EmptyState>
        </View>
      ) : slice.status !== 'ready' ||
        state === undefined ||
        state === null ||
        entry === undefined ? (
        <StopSkeleton />
      ) : (
        <ScrollView className="flex-1">
          <View className="gap-4 px-5 pb-32 pt-4">
            <Entry
              key={entry.key}
              state={state}
              itemsById={slice.itemsById}
              stopName={slice.stop?.name ?? ''}
              outcome={slice.stop?.outcome ?? ''}
              onCommit={input => void slice.commit(input)}
              onDone={() => {
                void slice.commit({kind: 'finish'}).then(() => router.back());
              }}
            />
          </View>
        </ScrollView>
      )}
      {state?.answered && state.answered.verdict !== 'partial' ? (
        <Band
          state={state}
          itemsById={slice.itemsById}
          onNext={() => void slice.commit({kind: 'continue'})}
        />
      ) : null}
    </View>
  );
}

type EntryProps = {
  state: SessionState;
  itemsById: Items;
  stopName: string;
  outcome: string;
  onCommit: (input: CommitInput) => void;
  onDone: () => void;
};

/** Dispatches the current queue entry to its renderer by position kind. */
function Entry({state, itemsById, stopName, outcome, onCommit, onDone}: EntryProps) {
  const entry = state.queue[state.index];
  if (entry === undefined) {
    return null;
  }
  const position = entry.position;
  const onContinue = () => onCommit({kind: 'continue'});

  switch (position.kind) {
    case 'intro':
      return (
        <IntroScreen
          text={position.text}
          outcome={position.outcome}
          capabilities={position.capabilities}
          onContinue={onContinue}
        />
      );
    case 'card':
      return (
        <ItemCard
          item={itemsById.get(position.itemId as ContentItemId)}
          card={position.card}
          onContinue={onContinue}
        />
      );
    case 'note':
      return <NoteCard text={position.text} onContinue={onContinue} />;
    case 'exercise':
      return (
        <ExerciseFrame
          entry={entry}
          answered={state.answered}
          matched={state.matched}
          itemsById={itemsById}
          onCommit={onCommit}
        />
      );
    case 'second-look-intro':
      return <SecondLookIntro count={position.count} onContinue={onContinue} />;
    case 'moment':
      return <MomentScreen stopName={stopName} outcome={outcome} onContinue={onContinue} />;
    case 'end':
      return (
        <EndScreen
          taught={state.taught}
          stillMissed={state.stillMissed}
          capabilities={position.capabilities}
          itemsById={itemsById}
          onDone={onDone}
        />
      );
    default:
      return null;
  }
}

type BandProps = {
  state: SessionState;
  itemsById: Items;
  onNext: () => void;
};

function Band({state, itemsById, onNext}: BandProps) {
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
      audio={false}
      pinned
      onAction={onNext}
    >
      {item?.bo ?? ''}
    </AnswerBand>
  );
}

function StopSkeleton() {
  return (
    <View className="gap-4 px-5 pt-8">
      <Skeleton shape="text" width="60%" />
      <Skeleton shape="block" height={180} />
      <Skeleton shape="text" />
      <Skeleton shape="text" />
    </View>
  );
}
