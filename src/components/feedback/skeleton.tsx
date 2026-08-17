/**
 * @fileoverview Skeleton — the shape of what is loading.
 *
 * Fill-based like everything else: a sunken ground shape with a slow sheen passing over
 * it. Compose several to sketch the screen being loaded rather than showing a spinner,
 * which says only that something is happening.
 *
 * Ported from the bundle: `Skeleton` ships no `.jsx` in the export.
 *
 * The web original draws the sheen as a `linear-gradient` background whose
 * `background-position` animates. React Native has neither, so the gradient becomes a
 * band that travels: a highlight view wider than nothing and narrower than the shape,
 * translated across a clipped container. The gradient itself is static — only the
 * transform moves, which is what Reanimated does natively.
 *
 * `docs/04` requires it to hold steady under reduced motion, which is why the repeat
 * declares ReduceMotion.System rather than trusting a default.
 */

import {useEffect} from 'react';
import {View, type DimensionValue, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';

import {easing} from '../core/motion';
import {color, radius} from '../../theme/tokens.generated';

const SWEEP_MS = 1600;

/** How wide the travelling highlight is, against the shape it crosses. */
const BAND_FRACTION = 0.6;

const DEFAULT_HEIGHT = 16;

export type SkeletonShape = 'block' | 'text' | 'circle';

/** Each shape's corner. A circle is round, a text line barely, a block properly. */
const SHAPE_RADIUS: Record<SkeletonShape, number> = {
  block: radius.md,
  text: radius.xs,
  circle: radius.pill,
};

export type SkeletonProps = {
  shape?: SkeletonShape;
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A loading placeholder.
 *
 * @example <Skeleton shape="text" width="70%" />
 * @example <Skeleton shape="circle" width={68} />
 */
export function Skeleton({
  shape = 'block',
  width = '100%',
  height = DEFAULT_HEIGHT,
  radius: cornerRadius,
  style,
  testID,
}: SkeletonProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: SWEEP_MS,
        easing: easing.inOut,
        // Holds the sheen still when the reader has asked the system for less motion.
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      false,
    );
  }, [progress]);

  // A circle is as tall as it is wide, so `width` governs both.
  const box: ViewStyle = {
    width,
    height: shape === 'circle' ? (typeof width === 'number' ? width : height) : height,
    borderRadius: cornerRadius ?? SHAPE_RADIUS[shape],
    backgroundColor: color.ground200,
    overflow: 'hidden',
  };

  const bandStyle = useAnimatedStyle(() => ({
    // Travels from fully before the shape to fully past it, expressed in multiples of
    // its own width so it does not need to measure the container.
    transform: [{translateX: `${-100 + progress.value * (100 / BAND_FRACTION + 100)}%`}],
  }));

  return (
    <View aria-hidden style={[box, style]} testID={testID}>
      <Animated.View style={[BAND, bandStyle] as StyleProp<AnimatedStyle<ViewStyle>>} />
    </View>
  );
}

/**
 * The highlight: a solid band, hard-edged.
 *
 * The soft edges of the original's gradient are dropped, and the first attempt at keeping
 * them is worth recording. React Native does ship gradients as
 * `experimental_backgroundImage`, and using it for a static value looked safe. It is not
 * supported by react-native-web — and because the gradient was the band's only paint, the
 * sheen rendered as *nothing at all* on web rather than degrading to a hard edge. A
 * component that is invisible on the platform the e2e suite runs on is worse than one with
 * blunter edges.
 *
 * The portable alternative would be a `react-native-svg` gradient, which is real work and
 * an extra SVG per placeholder. Not worth it for a loading shimmer.
 */
const BAND: ViewStyle = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  width: `${BAND_FRACTION * 100}%`,
  backgroundColor: color.ground050,
};
