/**
 * @fileoverview HearItFindIt — a sound finds its shape (RB6 / R3).
 *
 * The Read track's opener, ear before eye: an audio prompt and four glyph
 * tiles, exactly as the board draws it — "Which letter is this?" above the
 * play button, the glyphs bare (no romanization: the reading is the answer),
 * and the tap commits (Check removed, §5.2). Same-row distractors are the
 * generator's concern; this renderer draws whatever options arrive.
 *
 * The prompt plays through `playClip` with the target's ref where the item
 * carries one. A letter arrives reduced to a `DisplayItem` without its
 * recording today, so the control stands and plays silence — the drill only
 * surfaces once the build ships takes, and wiring the letter's ref through is
 * that day's one-line change.
 */

import {useEffect, useState} from 'react';
import {Text, View} from 'react-native';

import {playClip, stopClip} from '../../composition/play';
import {Badge} from '../core/badge';
import {AudioButton} from '../learning/audio-button';
import {LetterTile, type LetterTileState} from '../learning/letter-tile';
import type {ContentItemId} from '../../ports/content-ids';
import type {CommitInput} from '../../usecases/submit-answer';
import type {Items, SessionAnswered, SessionEntry} from './types';

export type HearItFindItProps = {
  entry: SessionEntry;
  answered: SessionAnswered;
  itemsById: Items;
  onCommit: (input: CommitInput) => void;
};

/** The hear-it-find-it entry of a stop session. */
export function HearItFindIt({entry, answered, itemsById, onCommit}: HearItFindItProps) {
  const [chosen, setChosen] = useState<string | null>(null);

  const exercise = entry.position.kind === 'exercise' ? entry.position.exercise : null;
  const target =
    exercise === null || exercise.itemId === null
      ? undefined
      : itemsById.get(exercise.itemId as ContentItemId);
  const prompt = target !== undefined && 'audio' in target ? target.audio : null;

  // The prompt plays as the drill arrives — the sound is the question.
  useEffect(() => {
    if (prompt !== null) {
      void playClip(prompt);
    }
    return () => {
      void stopClip();
    };
  }, [prompt]);

  if (exercise === null) {
    return null;
  }
  const options = entry.options ?? exercise.options;

  const tileState = (itemId: string, isAnswer: boolean): LetterTileState => {
    if (answered === null) {
      return 'learned';
    }
    if (isAnswer) {
      return 'correct';
    }
    return itemId === chosen ? 'wrong' : 'notYet';
  };

  return (
    <View className="gap-5 py-4">
      {entry.ask === 'second-look' ? <Badge tone="neutral">Second look</Badge> : null}
      <Text className="type-heading text-fg-heading text-center">Which letter is this?</Text>
      <View className="items-center">
        <AudioButton
          size="lg"
          onPress={() => {
            if (prompt !== null) {
              void playClip(prompt);
            }
          }}
        />
      </View>
      <View className="flex-row flex-wrap justify-center gap-3">
        {options.map(option => {
          const item = itemsById.get(option.itemId as ContentItemId);
          return (
            // Glyph only — the board draws no romanization here, because the
            // reading is the answer and printing it would hand it over.
            <LetterTile
              key={option.itemId}
              glyph={item?.bo ?? ''}
              size="xl"
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
