/**
 * @fileoverview SeeItSayIt — the glyph asks how it sounds (R5 / RB7).
 *
 * A tap-select over four romanised sounds, exactly as the board draws it: the
 * glyph large and centred, "How does this sound?" above it, and the letter
 * names as the options. Tap commits — the Check was removed by §5.2, and the
 * mic is RB13's job, not this drill's. Selection state lives here as it does
 * in the generic frame; the parent remounts per entry, which resets it.
 */

import {useState} from 'react';
import {Text, View} from 'react-native';

import {Badge} from '../core/badge';
import {AnswerChoice} from '../learning/answer-choice';
import {TibetanText} from '../learning/tibetan-text';
import type {ContentItemId} from '../../ports/content-ids';
import type {CommitInput} from '../../usecases/submit-answer';
import type {Items, SessionAnswered, SessionEntry} from './types';

export type SeeItSayItProps = {
  entry: SessionEntry;
  answered: SessionAnswered;
  itemsById: Items;
  onCommit: (input: CommitInput) => void;
};

/** The see-it-say-it entry of a stop session. */
export function SeeItSayIt({entry, answered, itemsById, onCommit}: SeeItSayItProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  if (entry.position.kind !== 'exercise') {
    return null;
  }
  const exercise = entry.position.exercise;
  const target =
    exercise.itemId === null ? undefined : itemsById.get(exercise.itemId as ContentItemId);
  const options = entry.options ?? exercise.options;

  return (
    <View className="gap-5 py-4">
      {entry.ask === 'second-look' ? <Badge tone="neutral">Second look</Badge> : null}
      <Text className="type-heading text-fg-heading text-center">How does this sound?</Text>
      {target !== undefined ? (
        <TibetanText size="xl" align="center">
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
              {item?.roman ?? option.itemId}
            </AnswerChoice>
          );
        })}
      </View>
    </View>
  );
}
