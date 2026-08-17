/**
 * @fileoverview Checkbox — a choice that waits.
 *
 * Square corner, check mark, and nothing happens until a button is pressed. That is the
 * whole difference from `Switch`, which acts on the touch. Onboarding preferences, the
 * multi-select exercise's own tiles are `AnswerChoice` rather than this.
 *
 * Ported from the bundle: `Checkbox` ships no `.jsx` in the export.
 */

import type {StyleProp, ViewStyle} from 'react-native';

import {Icon} from '../core/icon';
import {color, radius} from '../../theme/tokens.generated';
import {ChoiceShell} from './choice-shell';

/** Heavier than the icon set's own weight: a 16pt mark inside a filled box needs it. */
const CHECK_STROKE = 3;

export type CheckboxProps = {
  label: string;
  /** One sentence. It becomes the accessibility hint, not a second name. */
  description?: string;
  checked?: boolean;
  /** Receives the new state, not an event. */
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A square, checkable row.
 *
 * @example <Checkbox label="Show Wylie spelling" checked={on} onChange={setOn} />
 */
export function Checkbox({
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  style,
  testID,
}: CheckboxProps) {
  return (
    <ChoiceShell
      role="checkbox"
      boxRadius={radius.xs}
      // Instant rather than animated, matching the board: the fill fades in over
      // --dur-fast and the mark is simply there once there is something to sit on.
      indicator={
        checked ? (
          <Icon name="check" size={16} strokeWidth={CHECK_STROKE} color={ON_ACCENT} />
        ) : null
      }
      label={label}
      description={description}
      checked={checked}
      disabled={disabled}
      onPress={onChange ? () => onChange(!checked) : undefined}
      style={style}
      testID={testID}
    />
  );
}

const ON_ACCENT = color.textOnAccent;
