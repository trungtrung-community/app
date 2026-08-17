/**
 * @fileoverview The shell shared by Checkbox and Radio.
 *
 * Not a design-system component and not in the manifest — it is the part those two are
 * identical in, which is nearly all of it: the row, the 26pt indicator box, the fill
 * rule, the alignment that changes when there is a description, and the label column.
 * What differs is the box's corner and what sits inside it.
 *
 * Keeping it here means the two cannot drift apart, which they would: the alignment rule
 * (`flex-start` only when a description makes the row two lines tall) is the sort of
 * detail that gets fixed in one file and forgotten in the other.
 */

import type {ReactNode} from 'react';
import {Pressable, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {interpolateColor, useAnimatedStyle} from 'react-native-reanimated';

import {clamp01} from '../core/motion';
import {useToggleProgress} from '../core/toggle-progress';
import {color, layout} from '../../theme/tokens.generated';

/** Both indicators are 26pt — big enough to read, small enough not to be the control. */
export const INDICATOR_SIZE = 26;

export type ChoiceShellProps = {
  /** Decides how assistive technology announces the whole row. */
  role: 'checkbox' | 'radio';
  /** What sits inside the box: a check mark, or a dot. */
  indicator: ReactNode;
  /** `radius.xs` for a checkbox, `radius.pill` for a radio. The shape carries the rule. */
  boxRadius: number;
  label: string;
  /** One sentence. It becomes the accessibility hint, not a second name. */
  description?: string;
  checked: boolean;
  disabled: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** The row: indicator, then label over description. */
export function ChoiceShell({
  role,
  indicator,
  boxRadius,
  label,
  description,
  checked,
  disabled,
  onPress,
  style,
  testID,
}: ChoiceShellProps) {
  const progress = useToggleProgress(checked);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: disabled
      ? color.ground200
      : interpolateColor(clamp01(progress.value), [0, 1], [color.surfaceSunken, color.teal600]),
  }));

  return (
    <Pressable
      accessibilityRole={role}
      aria-checked={checked}
      accessibilityLabel={label}
      accessibilityHint={description}
      disabled={disabled}
      onPress={onPress}
      className={`w-full flex-row gap-3 ${description ? 'items-start' : 'items-center'}`}
      style={[MIN_HEIGHT, style]}
      testID={testID}
    >
      <Animated.View
        aria-hidden
        style={[
          BOX,
          {borderRadius: boxRadius},
          // Nudged down when the row is two lines tall, so the box sits on the label's
          // optical centre rather than its ascender.
          description ? DESCRIBED_OFFSET : null,
          boxStyle,
        ]}
      >
        {indicator}
      </Animated.View>
      {/* Hidden: the Pressable already carries both strings as its name and hint. */}
      <View aria-hidden className="flex-1">
        <Text className={`type-body ${disabled ? 'text-fg-subtle' : 'text-fg-heading'}`}>
          {label}
        </Text>
        {description ? <Text className="type-caption text-fg-muted">{description}</Text> : null}
      </View>
    </Pressable>
  );
}

const MIN_HEIGHT: ViewStyle = {minHeight: layout.touchMin};

const BOX: ViewStyle = {
  // `flexShrink: 0`, never `flex: 0`. The web sources write `flex: "0 0 auto"`, and the
  // shorthand does not survive the crossing: `flex: 0` resolves to `flex-basis: 0%`, which
  // outranks `width` for a flex item, so the box collapses to nothing on web while Yoga
  // renders it at 26 on a device. An invisible checkbox that typechecks.
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  width: INDICATOR_SIZE,
  height: INDICATOR_SIZE,
};

const DESCRIBED_OFFSET: ViewStyle = {marginTop: 3};
