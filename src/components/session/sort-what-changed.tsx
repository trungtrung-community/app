/**
 * @fileoverview SortWhatChanged — the stop's whole set, sorted by ear (RB17).
 *
 * Every item the stop taught, each beside its bare form — without the bare
 * form the learner is recalling an earlier section, not hearing the change.
 * Multi-select committing on Check, RB10's interaction. The rows carry no
 * verdict caption before or after: naming the behaviours is R11's job, one
 * screen later, and the readings beside each form already carry the contrast
 * while no takes ship.
 *
 * Right picks fill and stay; a wrong pick is simply not kept, so after an
 * incomplete Check the selection is re-read from the engine's `filled`.
 */

import {useState} from 'react';
import {Pressable, Text, View, type ViewStyle} from 'react-native';

import {Badge} from '../core/badge';
import {ChangeRow} from '../learning/change-row';
import {mixedTibetan} from '../learning/tibetan-text';
import {color, radius, space} from '../../theme/tokens.generated';
import type {CommitInput} from '../../usecases/submit-answer';
import {CheckBar} from './check-bar';
import type {SessionAnswered, SessionEntry} from './types';

/**
 * A fill, not a border: the system draws selection with surfaces (docs/04's
 * fill-based rule), the same way a chip turns teal when picked.
 */
const ROW: ViewStyle = {
  borderRadius: radius.lg,
  paddingVertical: space['2'],
  paddingHorizontal: space['3'],
};

export type SortWhatChangedProps = {
  entry: SessionEntry;
  answered: SessionAnswered;
  /** The engine's kept picks — `state.filled`. */
  filled: readonly string[];
  onCommit: (input: CommitInput) => void;
};

/** The sort-what-changed entry of a stop session. */
export function SortWhatChanged({entry, answered, filled, onCommit}: SortWhatChangedProps) {
  const [picked, setPicked] = useState<readonly string[]>([]);
  const [attempted, setAttempted] = useState(false);

  // A grown `filled` is the engine answering an incomplete Check: right picks
  // stay, wrong picks return. Adjusting state during render is React's
  // documented pattern for reacting to a changed prop.
  const [seenFilled, setSeenFilled] = useState(filled);
  if (seenFilled !== filled) {
    setSeenFilled(filled);
    if (attempted) {
      setPicked(filled);
    }
  }

  if (entry.position.kind !== 'exercise') {
    return null;
  }
  const exercise = entry.position.exercise;
  const pairs = exercise.pairs ?? [];
  const answers = exercise.answers ?? [];

  const toggle = (itemId: string) => {
    setPicked(current =>
      current.includes(itemId) ? current.filter(id => id !== itemId) : [...current, itemId],
    );
  };

  return (
    <View className="gap-5 py-4">
      {entry.ask === 'second-look' ? <Badge tone="neutral">Second look</Badge> : null}
      <Text className="type-heading text-fg-heading">{mixedTibetan(exercise.question ?? '')}</Text>
      <Text className="type-body text-fg-muted">Pick every one that sounds different.</Text>
      <View className="gap-2">
        {pairs.map(pair => {
          const selected = picked.includes(pair.itemId);
          return (
            <Pressable
              key={pair.itemId}
              accessibilityRole="checkbox"
              accessibilityState={{checked: selected}}
              aria-checked={selected}
              accessibilityLabel={`${pair.bareRoman} to ${pair.roman}`}
              disabled={answered !== null}
              onPress={() => toggle(pair.itemId)}
              style={[
                ROW,
                {backgroundColor: selected ? color.surfaceAccentSoft : color.surfaceCard},
              ]}
            >
              <ChangeRow
                bare={pair.bareBo}
                bareRoman={pair.bareRoman}
                to={pair.bo}
                toRoman={pair.roman}
                change=""
                size="md"
                audio={false}
              />
            </Pressable>
          );
        })}
      </View>
      {answered === null ? (
        <CheckBar
          picked={picked}
          filled={filled}
          answers={answers}
          attempted={attempted}
          onCommit={input => {
            setAttempted(true);
            onCommit(input);
          }}
        />
      ) : null}
    </View>
  );
}
