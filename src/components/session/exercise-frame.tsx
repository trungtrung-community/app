/**
 * @fileoverview ExerciseFrame — one exercise entry, drawn by its commit mode.
 *
 * The frame owns the dispatch: `pairs` goes to the PairBoard, everything else
 * to the AnswerChoice list. Selection state lives here and only here — which
 * option was tapped, which tile is picked — because the engine records
 * verdicts, not fingers. The parent remounts the frame per entry (keyed on the
 * entry's key), which is what resets that selection between exercises.
 */

import {useState} from 'react';
import {Text, View} from 'react-native';

import {Badge} from '../core/badge';
import {AnswerChoice} from '../learning/answer-choice';
import {PairBoard, type PairSide} from '../learning/pair-board';
import {TibetanText} from '../learning/tibetan-text';
import type {ContentItemId} from '../../ports/content-ids';
import type {CommitInput} from '../../usecases/submit-answer';
import {SeeItSayIt} from './see-it-say-it';
import type {Items, SessionAnswered, SessionEntry} from './types';

export type ExerciseFrameProps = {
  entry: SessionEntry;
  answered: SessionAnswered;
  /** Item ids already cleared on the pair board. */
  matched: readonly string[];
  itemsById: Items;
  onCommit: (input: CommitInput) => void;
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

/** The exercise entry of a stop session. */
export function ExerciseFrame({entry, answered, matched, itemsById, onCommit}: ExerciseFrameProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  if (entry.position.kind !== 'exercise') {
    return null;
  }
  const exercise = entry.position.exercise;
  const target =
    exercise.itemId === null ? undefined : itemsById.get(exercise.itemId as ContentItemId);

  if (exercise.commitMode === 'pairs') {
    return <Pairs entry={entry} matched={matched} itemsById={itemsById} onCommit={onCommit} />;
  }

  // The glyph drill asks a different question and answers in romanisation, so
  // it has its own renderer rather than a headline case in the generic list.
  if (exercise.presentation === 'see-it-say-it') {
    return (
      <SeeItSayIt entry={entry} answered={answered} itemsById={itemsById} onCommit={onCommit} />
    );
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

type PairsProps = {
  entry: SessionEntry;
  matched: readonly string[];
  itemsById: Items;
  onCommit: (input: CommitInput) => void;
};

function Pairs({entry, matched, itemsById, onCommit}: PairsProps) {
  const [picked, setPicked] = useState<{side: PairSide; index: number} | null>(null);
  if (entry.position.kind !== 'exercise') {
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
    if (matched.includes(itemId)) {
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
          if (itemId === undefined || matched.includes(itemId)) {
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
