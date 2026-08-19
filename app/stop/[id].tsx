/**
 * @fileoverview The stop screen — the lesson loop's one route.
 *
 * Thin by design: the engine owns the queue and the verdicts, the use case owns
 * persistence, and this file only draws `queue[index]` by kind from components
 * that already exist. Full-screen at the stack root, so the tab bar stays out of
 * a lesson.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {useEffect, useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Badge} from '../../src/components/core/badge';
import {Button} from '../../src/components/core/button';
import {IconButton} from '../../src/components/core/icon-button';
import {Confetti} from '../../src/components/feedback/confetti';
import {MascotSpeech} from '../../src/components/feedback/mascot-speech';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {AnswerBand} from '../../src/components/learning/answer-band';
import {AnswerChoice} from '../../src/components/learning/answer-choice';
import {CapabilityList} from '../../src/components/learning/capability-list';
import {PairBoard, type PairSide} from '../../src/components/learning/pair-board';
import {ProgressBar} from '../../src/components/learning/progress-bar';
import {TibetanText} from '../../src/components/learning/tibetan-text';
import {WordCard} from '../../src/components/learning/word-card';
import type {ContentItemId, StopId} from '../../src/ports/content-ids';
import type {PhraseItem, VocabularyItem} from '../../src/ports/content-model';

import {useStopSession} from '../../src/store/session';
import type {SessionState} from '../../src/usecases/start-stop';

type Item = VocabularyItem | PhraseItem;
type Items = ReadonlyMap<ContentItemId, Item>;

/** The counts the closing screen words, one through ten. */
const WORDED = [
  'None',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
] as const;

function worded(count: number): string {
  return WORDED[count] ?? `${count}`;
}

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
      {slice.status !== 'ready' || state === undefined || state === null || entry === undefined ? (
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
  onCommit: (input: Parameters<ReturnType<typeof useStopSession.getState>['commit']>[0]) => void;
  onDone: () => void;
};

function Entry({state, itemsById, stopName, outcome, onCommit, onDone}: EntryProps) {
  const entry = state.queue[state.index];
  if (entry === undefined) {
    return null;
  }
  const position = entry.position;

  switch (position.kind) {
    case 'intro':
      return (
        <View className="gap-6 py-6">
          <Text accessibilityRole="header" className="type-title text-fg-heading">
            {position.text}
          </Text>
          {position.outcome ? (
            <Text className="type-body text-fg-body">{position.outcome}</Text>
          ) : null}
          <CapabilityList
            marker="ring"
            items={position.capabilities.map(capability => ({capability}))}
          />
          <Button onPress={() => onCommit({kind: 'continue'})}>Step inside</Button>
        </View>
      );
    case 'card': {
      const item = itemsById.get(position.itemId as ContentItemId);
      return (
        <View className="gap-6 py-4">
          <WordCard
            bo={item?.bo}
            roman={item?.roman}
            en={item?.en}
            eyebrow={position.card === 'phrase' ? 'New phrase' : 'New word'}
            note={
              item !== undefined && 'usageNote' in item ? (item.usageNote ?? undefined) : undefined
            }
            registerMark={item?.register === 'honorific'}
            audio={item?.audio.available ?? false}
          />
          <Button onPress={() => onCommit({kind: 'continue'})}>Continue</Button>
        </View>
      );
    }
    case 'note':
      return (
        <View className="gap-6 py-6">
          <Text className="type-body text-fg-body">{position.text}</Text>
          <Button onPress={() => onCommit({kind: 'continue'})}>Continue</Button>
        </View>
      );
    case 'exercise':
      return <Exercise state={state} itemsById={itemsById} onCommit={onCommit} />;
    case 'second-look-intro':
      return (
        <View className="gap-6 py-6">
          <MascotSpeech>{`${worded(position.count)} worth another look.`}</MascotSpeech>
          <Button onPress={() => onCommit({kind: 'continue'})}>Carry on</Button>
        </View>
      );
    case 'moment':
      return (
        <View className="items-center gap-6 py-10">
          <Confetti />
          <Text accessibilityRole="header" className="type-title text-fg-heading text-center">
            {stopName}
          </Text>
          {outcome ? <Text className="type-body text-fg-body text-center">{outcome}</Text> : null}
          <Button onPress={() => onCommit({kind: 'continue'})}>Continue</Button>
        </View>
      );
    case 'end':
      return (
        <EndScreen
          state={state}
          capabilities={position.capabilities}
          itemsById={itemsById}
          onDone={onDone}
        />
      );
    default:
      return null;
  }
}

type ExerciseProps = {
  state: SessionState;
  itemsById: Items;
  onCommit: EntryProps['onCommit'];
};

/** The headline per presentation. Recognition drills ask; nothing explains. */
function headline(presentation: string): string {
  switch (presentation) {
    case 'meaning-pick':
    case 'meaning-pick-substitute':
      return 'Which one means';
    case 'phrase-recognise-script':
    case 'phrase-recognise':
      return 'Which one is it';
    case 'pair-match':
      return 'Match the pairs';
    default:
      return 'Which one is it';
  }
}

function Exercise({state, itemsById, onCommit}: ExerciseProps) {
  const entry = state.queue[state.index];
  const [chosen, setChosen] = useState<string | null>(null);
  if (entry === undefined || entry.position.kind !== 'exercise') {
    return null;
  }
  const exercise = entry.position.exercise;
  const target =
    exercise.itemId === null ? undefined : itemsById.get(exercise.itemId as ContentItemId);
  const answered = state.answered;

  if (exercise.commitMode === 'pairs') {
    return <Pairs state={state} itemsById={itemsById} onCommit={onCommit} />;
  }

  const options = entry.options ?? exercise.options;
  return (
    <View className="gap-5 py-4">
      {entry.ask === 'second-look' ? <Badge tone="neutral">Second look</Badge> : null}
      <Text className="type-heading text-fg-heading">{headline(exercise.presentation)}</Text>
      {target !== undefined ? (
        <TibetanText size="lg" roman={target.roman}>
          {target.bo}
        </TibetanText>
      ) : null}
      <View className="gap-2">
        {options.map((option, i) => {
          const item = itemsById.get(option.itemId as ContentItemId);
          const optionState =
            answered === null
              ? 'idle'
              : option.isAnswer
                ? 'correct'
                : option.itemId === chosen
                  ? 'wrong'
                  : 'idle';
          return (
            <AnswerChoice
              key={option.itemId}
              index={i + 1}
              state={optionState}
              onPress={
                answered === null
                  ? () => {
                      setChosen(option.itemId);
                      onCommit({kind: 'tap', itemId: option.itemId});
                    }
                  : undefined
              }
            >
              {item?.en ?? option.itemId}
            </AnswerChoice>
          );
        })}
      </View>
    </View>
  );
}

function Pairs({state, itemsById, onCommit}: ExerciseProps) {
  const entry = state.queue[state.index];
  const [picked, setPicked] = useState<{side: PairSide; index: number} | null>(null);
  if (entry === undefined || entry.position.kind !== 'exercise') {
    return null;
  }
  const options = entry.options ?? entry.position.exercise.options;
  const items = options.map(option => itemsById.get(option.itemId as ContentItemId));
  // The right column re-sorts so the two sides never share an order.
  const rightOrder = [...options].sort((a, b) => {
    const ea = itemsById.get(a.itemId as ContentItemId)?.en ?? '';
    const eb = itemsById.get(b.itemId as ContentItemId)?.en ?? '';
    return ea.localeCompare(eb);
  });

  const tileState = (itemId: string, at: {side: PairSide; index: number}) => {
    if (state.matched.includes(itemId)) {
      return 'cleared';
    }
    if (picked !== null && picked.side === at.side && picked.index === at.index) {
      return 'selected';
    }
    return 'idle';
  };

  return (
    <View className="gap-5 py-4">
      <Text className="type-heading text-fg-heading">Match the pairs</Text>
      <PairBoard
        left={options.map((option, index) => ({
          bo: items[index]?.bo ?? '',
          roman: items[index]?.roman,
          state: tileState(option.itemId, {side: 'left', index}),
        }))}
        right={rightOrder.map((option, index) => ({
          en: itemsById.get(option.itemId as ContentItemId)?.en ?? '',
          state: tileState(option.itemId, {side: 'right', index}),
        }))}
        onPick={(side, index) => {
          const itemId = side === 'left' ? options[index]?.itemId : rightOrder[index]?.itemId;
          if (itemId === undefined || state.matched.includes(itemId)) {
            return;
          }
          if (picked === null || picked.side === side) {
            setPicked({side, index});
            return;
          }
          const otherId =
            picked.side === 'left'
              ? options[picked.index]?.itemId
              : rightOrder[picked.index]?.itemId;
          setPicked(null);
          if (otherId !== undefined) {
            onCommit({kind: 'pair', a: otherId, b: itemId});
          }
        }}
      />
    </View>
  );
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

type EndProps = {
  state: SessionState;
  capabilities: readonly string[];
  itemsById: Items;
  onDone: () => void;
};

function EndScreen({state, capabilities, itemsById, onDone}: EndProps) {
  const words = state.taught.filter(id => {
    const item = itemsById.get(id as ContentItemId);
    return item !== undefined && 'wordId' in item;
  }).length;
  const phrases = state.taught.length - words;
  const still = state.stillMissed;

  const counts = [
    words > 0 ? `${words} ${words === 1 ? 'word' : 'words'} met` : null,
    phrases > 0 ? `${phrases} ${phrases === 1 ? 'phrase' : 'phrases'} met` : null,
    still.length > 0 ? `${still.length} worth another look` : null,
  ]
    .filter(part => part !== null)
    .join(' · ');

  return (
    <View className="gap-6 py-6">
      <Text accessibilityRole="header" className="type-title text-fg-heading">
        Stop complete
      </Text>
      <CapabilityList marker="check" items={capabilities.map(capability => ({capability}))} />
      {counts ? <Text className="type-body text-fg-body">{counts}</Text> : null}
      {still.length > 0 ? (
        <View className="gap-1">
          {still.map(id => {
            const item = itemsById.get(id as ContentItemId);
            return item !== undefined ? (
              <TibetanText key={id} size="sm" roman={item.roman} gloss={item.en}>
                {item.bo}
              </TibetanText>
            ) : null;
          })}
        </View>
      ) : null}
      <Button onPress={onDone}>Done</Button>
    </View>
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
