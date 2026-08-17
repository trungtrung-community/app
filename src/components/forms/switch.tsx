/**
 * @fileoverview Switch — a setting that takes effect immediately.
 *
 * The label sits left, the track right, pushed apart. That asymmetry is the tell: a
 * Switch acts the moment it moves, where a `Checkbox` is a choice that waits for a
 * button. Reminders, haptics, autoplay.
 *
 * Ported from the bundle: `Switch` ships no `.jsx` in the export.
 *
 * React Native's own `Switch` is not used. It renders the platform control, whose size is
 * fixed by the OS and whose shape is a UISwitch on iOS and a Material track on Android —
 * three different pictures for one drawn component. The design system draws a specific
 * 54x32 track with a 26pt thumb, so it is built rather than borrowed.
 */

import {Pressable, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {interpolateColor, useAnimatedStyle} from 'react-native-reanimated';

import {clamp01, duration, easing} from '../core/motion';
import {useToggleProgress} from '../core/toggle-progress';
import {color, layout, radius} from '../../theme/tokens.generated';

const TRACK_WIDTH = 54;
const TRACK_HEIGHT = 32;
const TRACK_PADDING = 3;
const THUMB = 26;

/** How far the thumb slides: the track's inside, less the thumb. Derived, never typed. */
const TRAVEL = TRACK_WIDTH - TRACK_PADDING * 2 - THUMB;

export type SwitchProps = {
  label: string;
  /** One sentence saying what turning it on does. */
  description?: string;
  checked?: boolean;
  /**
   * Receives the new state, not an event.
   *
   * The web original takes a DOM change event and reads `e.target.checked`. There is no
   * event to read here, so every ported form control reports its value directly.
   */
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A setting toggle.
 *
 * @example
 * <Switch label="Daily reminder" description="A nudge at 19:00" checked={on} onChange={setOn} />
 */
export function Switch({
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  style,
  testID,
}: SwitchProps) {
  // The longer duration and the settling curve are the design system's own: a Switch is
  // the one form control whose movement is the feedback.
  const progress = useToggleProgress(checked, {
    durationMs: duration.base,
    curve: easing.settle,
  });

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: disabled
      ? color.ground200
      : interpolateColor(clamp01(progress.value), [0, 1], [color.ground300, color.teal600]),
  }));

  // The thumb keeps the overshoot — it is the thing arriving at rest, which is what the
  // curve is for. At its peak it travels about 24 of 22, and still stops inside the track.
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{translateX: progress.value * TRAVEL}],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      aria-checked={checked}
      accessibilityLabel={label}
      accessibilityHint={description}
      disabled={disabled}
      onPress={onChange ? () => onChange(!checked) : undefined}
      className="w-full flex-row items-center justify-between gap-4"
      style={[MIN_HEIGHT, style]}
      testID={testID}
    >
      {/* Hidden from assistive tech: the Pressable already carries both strings as its
          name and its hint, so announcing the text again would repeat them. */}
      <View aria-hidden className="flex-1">
        <Text className={`type-body ${disabled ? 'text-fg-subtle' : 'text-fg-heading'}`}>
          {label}
        </Text>
        {description ? <Text className="type-caption text-fg-muted">{description}</Text> : null}
      </View>
      <Animated.View aria-hidden style={[TRACK, trackStyle]}>
        <Animated.View style={[THUMB_STYLE, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const MIN_HEIGHT: ViewStyle = {minHeight: layout.touchMin};

const TRACK: ViewStyle = {
  // `flexShrink: 0` rather than `flex: 0` — see the note on ChoiceShell's BOX. The
  // shorthand collapses a fixed-width flex item on web.
  flexShrink: 0,
  width: TRACK_WIDTH,
  height: TRACK_HEIGHT,
  padding: TRACK_PADDING,
  borderRadius: radius.pill,
};

const THUMB_STYLE: ViewStyle = {
  width: THUMB,
  height: THUMB,
  borderRadius: radius.pill,
  backgroundColor: color.ground000,
};
