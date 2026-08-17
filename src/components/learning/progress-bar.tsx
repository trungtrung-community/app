/**
 * @fileoverview ProgressBar — a straight run through a stop.
 *
 * The journey's own progress is a `CircuitRing`, because a walk round is the metaphor the
 * product is built on. This is the plain bar, for the things that genuinely are linear: how
 * far through a stop's exercises, how much of a download has arrived.
 *
 * Ported from the bundle: `ProgressBar` ships no `.jsx` in the export.
 */

import {useEffect} from 'react';
import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {duration, easing} from '../core/motion';
import {color, fontFamily, fontSize, radius, space} from '../../theme/tokens.generated';

/** The four meanings a bar can carry. Never a fifth — a bar is not a palette. */
const TONES = {
  accent: color.teal600,
  reward: color.beak600,
  correct: color.grass600,
  alert: color.crown600,
} as const;

export type ProgressTone = keyof typeof TONES;

const DEFAULT_HEIGHT = 12;

export type ProgressBarProps = {
  value?: number;
  max?: number;
  tone?: ProgressTone;
  height?: number;
  /** Turns on the row above the bar: the label left, `value/max` right. */
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A linear progress bar.
 *
 * @example <ProgressBar value={4} max={7} label="This stop" />
 */
export function ProgressBar({
  value = 0,
  max = 100,
  tone = 'accent',
  height = DEFAULT_HEIGHT,
  label,
  style,
  testID,
}: ProgressBarProps) {
  // Clamped so a bad value cannot draw outside the track, and guarded against a zero max
  // rather than dividing by it.
  const fraction = Math.max(0, Math.min(1, value / (max || 1)));
  const progress = useSharedValue(fraction);

  useEffect(() => {
    progress.value = withTiming(fraction, {duration: duration.slow, easing: easing.out});
  }, [fraction, progress]);

  const fillStyle = useAnimatedStyle(() => ({width: `${progress.value * 100}%`}));

  return (
    <View className="w-full" style={style} testID={testID}>
      {label ? (
        <View className="w-full flex-row justify-between" style={LABEL_ROW}>
          <Text className="type-caption text-fg-muted">{label}</Text>
          <Text style={COUNT}>{`${value}/${max}`}</Text>
        </View>
      ) : null}
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{min: 0, max, now: value}}
        style={[TRACK, {height}]}
      >
        <Animated.View style={[FILL, {backgroundColor: TONES[tone]}, fillStyle]} />
      </View>
    </View>
  );
}

const LABEL_ROW: ViewStyle = {marginBottom: space['1h']};

const COUNT: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize.sm,
  color: color.textHeading,
};

const TRACK: ViewStyle = {
  width: '100%',
  borderRadius: radius.pill,
  backgroundColor: color.ground300,
  overflow: 'hidden',
};

const FILL: ViewStyle = {height: '100%', borderRadius: radius.pill};
