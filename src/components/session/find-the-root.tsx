/**
 * @fileoverview FindTheRoot — tap the མིང་གཞི inside a stack (RB9 / R8).
 *
 * The options are positions inside the one syllable, `{index, bo}` in writing
 * order, encoded by the planner as `index:bo` option ids — never shuffled on
 * screen, whatever order the entry's options arrived in. A combining part is
 * drawn on its ◌ carrier, because a bare mark is not a token (read spec §2.4).
 *
 * Answered, the stack is redrawn with everything but the root dimmed —
 * highlight by dimming, never decorating — and because dimming is colour
 * only, a caption names the root in text (docs/04, Teaching surfaces). The
 * band's sentence is the payload's `reason`, the cue-ladder rung that settles
 * this stack; the route's band renders it as the headline.
 */

import {useState} from 'react';
import {Text, View} from 'react-native';

import {Badge} from '../core/badge';
import {SyllableChip, type SyllableChipTone} from '../learning/syllable-chip';
import {mixedTibetan, TibetanText} from '../learning/tibetan-text';
import {lettersOf} from '../../domain/tibetan';
import type {CommitInput} from '../../usecases/submit-answer';
import type {SessionAnswered, SessionEntry} from './types';

/**
 * A combining mark or subjoined letter — invisible without a carrier. Written
 * as escapes, per the warning in `src/domain/tibetan.ts`: combining marks in a
 * literal character class cannot be reviewed.
 */
const COMBINING = /^[\u0F71-\u0FBC]/;

/** The dotted-circle carrier a combining part is drawn on (U+25CC). */
const CARRIER = '◌';

type Position = {readonly itemId: string; readonly index: number; readonly bo: string};

/** Decode the planner's `index:bo` option ids, back into writing order. */
function toPositions(options: readonly {readonly itemId: string}[]): Position[] {
  return options
    .map(option => {
      const at = option.itemId.indexOf(':');
      return {
        itemId: option.itemId,
        index: Number(option.itemId.slice(0, at)),
        bo: option.itemId.slice(at + 1),
      };
    })
    .sort((a, b) => a.index - b.index);
}

export type FindTheRootProps = {
  entry: SessionEntry;
  answered: SessionAnswered;
  onCommit: (input: CommitInput) => void;
};

/** The find-the-root entry of a stop session. */
export function FindTheRoot({entry, answered, onCommit}: FindTheRootProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  if (entry.position.kind !== 'exercise') {
    return null;
  }
  const exercise = entry.position.exercise;
  const glyph = exercise.glyph ?? '';
  const positions = toPositions(exercise.options);
  const answer = exercise.options.find(option => option.isAnswer);
  const answerPosition = positions.find(position => position.itemId === answer?.itemId);
  // The base letter the tapped part writes: ྲ is a form of ར.
  const answerBo =
    answerPosition === undefined ? '' : (lettersOf(answerPosition.bo)[0] ?? answerPosition.bo);
  const rootLabel = `root ${answerBo}`;

  const chipTone = (position: Position): SyllableChipTone => {
    if (answered === null) {
      return position.itemId === chosen ? 'selected' : 'idle';
    }
    if (position.itemId === answer?.itemId) {
      return 'correct';
    }
    return position.itemId === chosen ? 'wrong' : 'muted';
  };

  return (
    <View className="gap-5 py-4">
      {entry.ask === 'second-look' ? <Badge tone="neutral">Second look</Badge> : null}
      <Text className="type-heading text-fg-heading text-center">Which letter is the root?</Text>
      <Text className="type-body text-fg-muted text-center">Everything else attaches to it.</Text>
      {answered === null ? (
        <TibetanText size="xl" align="center">
          {glyph}
        </TibetanText>
      ) : (
        <View className="items-center gap-2">
          <TibetanText
            size="xl"
            align="center"
            highlight={answerPosition?.index ?? 0}
            highlightUnit="char"
            highlightLabel={rootLabel}
          >
            {glyph}
          </TibetanText>
          {/* Dimming is colour-only, so the caption says it in text. */}
          <Text className="type-caption text-fg-muted">{mixedTibetan(rootLabel)}</Text>
        </View>
      )}
      <View className="flex-row flex-wrap justify-center gap-3">
        {positions.map(position => (
          <SyllableChip
            key={position.itemId}
            glyph={COMBINING.test(position.bo) ? CARRIER + position.bo : position.bo}
            size="lg"
            tone={chipTone(position)}
            onPress={
              answered === null
                ? () => {
                    setChosen(position.itemId);
                    onCommit({kind: 'tap', itemId: position.itemId});
                  }
                : undefined
            }
          />
        ))}
      </View>
    </View>
  );
}
