/**
 * @fileoverview Radio — one of a set.
 *
 * Round corner, a dot rather than a mark. The shape is the affordance: a circle promises
 * that picking this un-picks the others, where a square promises nothing about its
 * neighbours. Speak-or-read at onboarding, a pace choice in settings.
 *
 * Ported from the bundle: `Radio` ships no `.jsx` in the export.
 */

import {type StyleProp, type ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';

import {easing} from '../core/motion';
import {useToggleProgress} from '../core/toggle-progress';
import {color, radius} from '../../theme/tokens.generated';
import {ChoiceShell} from './choice-shell';

const DOT_SIZE = 10;

export type RadioProps = {
  label: string;
  /** One sentence. It becomes the accessibility hint, not a second name. */
  description?: string;
  checked?: boolean;
  /**
   * Fires when this option is picked, with `value` when one was given.
   *
   * Only ever called to select, never to deselect — a radio cannot be un-picked by
   * pressing it again, which is the behaviour the shape promises. Selecting a different
   * one is what clears this one, and that is the parent's business.
   */
  onChange?: (value: string | undefined) => void;
  /** This option's identity, handed back on selection. */
  value?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A round, single-choice row.
 *
 * The web original also takes `name`, which is how a DOM form groups radios so the
 * browser can enforce exclusivity. There are no forms here and no browser to enforce
 * anything: the parent owns which one is checked, so `name` would be a prop nothing
 * reads.
 *
 * @example <Radio label="Speak first" value="speak" checked={mode === 'speak'} onChange={setMode} />
 */
export function Radio({
  label,
  description,
  checked = false,
  onChange,
  value,
  disabled = false,
  style,
  testID,
}: RadioProps) {
  // The dot's own progress, on the settling curve — it arrives with one soft overshoot
  // while the box's fill, which is a colour, uses the plain curve. Both start from the
  // same boolean, so they cannot fall out of step.
  const progress = useToggleProgress(checked, {curve: easing.settle});

  const dotStyle = useAnimatedStyle(() => ({transform: [{scale: progress.value}]}));

  return (
    <ChoiceShell
      role="radio"
      boxRadius={radius.pill}
      indicator={<Animated.View style={[DOT, dotStyle]} />}
      label={label}
      description={description}
      checked={checked}
      disabled={disabled}
      // Selects only. Pressing a checked radio is a no-op, not a toggle.
      onPress={onChange && !checked ? () => onChange(value) : undefined}
      style={style}
      testID={testID}
    />
  );
}

const DOT: ViewStyle = {
  width: DOT_SIZE,
  height: DOT_SIZE,
  borderRadius: radius.pill,
  backgroundColor: color.ground000,
};
