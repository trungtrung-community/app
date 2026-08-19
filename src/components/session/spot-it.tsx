/**
 * @fileoverview SpotIt — name a glyph by what it does (RB18).
 *
 * The one drill whose prompt is a question rather than a stimulus, because a
 * tsheg has no sound to hear. RB6's anatomy with text in place of audio: the
 * written question above, four glyph tiles below, commits on tap. Selection
 * state lives here as in every tap renderer; the parent remounts per entry.
 *
 * Tiles fall back to the option's own label where the id resolves to no
 * record — marks and Sanskrit letters have no port to load them yet.
 */

import {useState} from 'react';
import {Text, View} from 'react-native';

import {Badge} from '../core/badge';
import {LetterTile, type LetterTileState} from '../learning/letter-tile';
import type {ContentItemId} from '../../ports/content-ids';
import type {CommitInput} from '../../usecases/submit-answer';
import type {Items, SessionAnswered, SessionEntry} from './types';

export type SpotItProps = {
  entry: SessionEntry;
  answered: SessionAnswered;
  itemsById: Items;
  onCommit: (input: CommitInput) => void;
};

/** The spot-it entry of a stop session. */
export function SpotIt({entry, answered, itemsById, onCommit}: SpotItProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  if (entry.position.kind !== 'exercise') {
    return null;
  }
  const exercise = entry.position.exercise;
  const options = entry.options ?? exercise.options;

  const tileState = (itemId: string, isAnswer: boolean): LetterTileState => {
    if (answered === null) {
      return itemId === chosen ? 'selected' : 'learned';
    }
    if (isAnswer) {
      return 'correct';
    }
    return itemId === chosen ? 'wrong' : 'learned';
  };

  return (
    <View className="gap-5 py-4">
      {entry.ask === 'second-look' ? <Badge tone="neutral">Second look</Badge> : null}
      <Text className="type-heading text-fg-heading text-center">{exercise.question ?? ''}</Text>
      <View className="flex-row flex-wrap justify-center gap-3">
        {options.map(option => {
          const item = itemsById.get(option.itemId as ContentItemId);
          return (
            <LetterTile
              key={option.itemId}
              glyph={item?.bo ?? option.label ?? ''}
              roman={item?.roman}
              size="lg"
              state={tileState(option.itemId, option.isAnswer)}
              onPress={
                answered === null
                  ? () => {
                      setChosen(option.itemId);
                      onCommit({kind: 'tap', itemId: option.itemId});
                    }
                  : undefined
              }
            />
          );
        })}
      </View>
    </View>
  );
}
