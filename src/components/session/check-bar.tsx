/**
 * @fileoverview CheckBar — the commit bar of every multi-part exercise.
 *
 * docs/03 §2's Check rule in one place: a multi-part drill commits on Check,
 * never on a tap, and the button stays disabled until at least one pick is
 * made — the instruction line above it is the reason the dead control is
 * allowed to be dead (docs/04). After an incomplete Check the partial band
 * names what is still missing, neutrally; it never counts what was found,
 * because partial correctness is information and not a score.
 */

import {Text, View} from 'react-native';

import {Button} from '../core/button';
import {mixedTibetan} from '../learning/tibetan-text';
import type {CommitInput} from '../../usecases/submit-answer';

/** The counts a Check button may speak. Beyond twelve nothing multi-part exists. */
const COUNT_WORDS = [
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
] as const;

/** A small count as the board words it — "these five", never "these 5". */
function countWord(count: number): string {
  return COUNT_WORDS[count - 1] ?? String(count);
}

/**
 * The default partial sentence: how many are still missing, without naming
 * them — RB10·½'s register.
 */
export function stillMissing(count: number): string {
  if (count === 1) {
    return 'One is still missing.';
  }
  const word = countWord(count);
  return `${word.charAt(0).toUpperCase()}${word.slice(1)} are still missing.`;
}

export type CheckBarProps = {
  /** The current picks. Empty disables the button. */
  picked: readonly string[];
  /** The engine's kept picks — `state.filled`. */
  filled: readonly string[];
  /** The full answer set, for naming how many are still missing. */
  answers: readonly string[];
  /** True once a Check came back incomplete; shows the partial band. */
  attempted: boolean;
  /** Overrides the partial sentence — RB12·✗'s placement register. */
  partial?: string;
  /** `counted` draws "Check these five"; `plain` draws "Check". */
  label?: 'counted' | 'plain';
  onCommit: (input: CommitInput) => void;
};

/** The pinned Check commit bar shared by the multi-part renderers. */
export function CheckBar({
  picked,
  filled,
  answers,
  attempted,
  partial,
  label = 'counted',
  onCommit,
}: CheckBarProps) {
  const missing = answers.length - filled.length;
  const partialText = partial ?? (missing > 0 ? stillMissing(missing) : null);
  const buttonLabel =
    label === 'plain' || picked.length === 0
      ? 'Check'
      : picked.length === 1
        ? 'Check this one'
        : `Check these ${countWord(picked.length)}`;

  return (
    <View className="gap-3 pt-2">
      {attempted && partialText !== null ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          className="type-body text-fg-body"
        >
          {mixedTibetan(partialText)}
        </Text>
      ) : null}
      <Button
        fullWidth
        disabled={picked.length === 0}
        onPress={() => onCommit({kind: 'check', picked: [...picked]})}
      >
        {buttonLabel}
      </Button>
    </View>
  );
}
