/**
 * @fileoverview ReadAWord — a word read off the page (B2).
 *
 * The crossing's drill: a word in uchen, four English options, commits on
 * tap. Silent by design — the prompt is the page, so audio-free mode changes
 * nothing here. Options fall back to their content label where the id
 * resolves to no record.
 */

import {useState} from 'react';
import {Text, View} from 'react-native';

import {Badge} from '../core/badge';
import {AnswerChoice} from '../learning/answer-choice';
import {TibetanText} from '../learning/tibetan-text';
import type {ContentItemId} from '../../ports/content-ids';
import type {CommitInput} from '../../usecases/submit-answer';
import type {Items, SessionAnswered, SessionEntry} from './types';

export type ReadAWordProps = {
  entry: SessionEntry;
  answered: SessionAnswered;
  itemsById: Items;
  onCommit: (input: CommitInput) => void;
};

/** The read-a-word entry of a stop session. */
export function ReadAWord({entry, answered, itemsById, onCommit}: ReadAWordProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  if (entry.position.kind !== 'exercise') {
    return null;
  }
  const exercise = entry.position.exercise;
  const options = entry.options ?? exercise.options;

  return (
    <View className="gap-5 py-4">
      {entry.ask === 'second-look' ? <Badge tone="neutral">Second look</Badge> : null}
      {exercise.glyph !== undefined ? (
        <TibetanText size="xl" align="center">
          {exercise.glyph}
        </TibetanText>
      ) : null}
      <Text className="type-heading text-fg-heading text-center">What does it say?</Text>
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
              {item?.en ?? option.label ?? option.itemId}
            </AnswerChoice>
          );
        })}
      </View>
    </View>
  );
}
