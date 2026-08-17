/**
 * @fileoverview AudioButton — the circular play control.
 *
 * All audio in this product is human-recorded and already on the device, which is what
 * shapes the states: ready, playing, downloading, and unavailable. `docs/01` commits to no
 * in-app downloads ever, so `downloading` and `unavailable` describe the install-time
 * delivery of an audio pack rather than anything a learner waits on mid-lesson.
 *
 * Ported from the bundle: `AudioButton` ships no `.jsx` in the export.
 */

import {useEffect} from 'react';
import {Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Circle, G} from 'react-native-svg';

import {type IconName, Icon} from '../core/icon';
import {easing} from '../core/motion';
import {pressScale} from '../core/press';
import {color, fontFamily, fontSize, radius, space} from '../../theme/tokens.generated';

const SIZES = {sm: 44, md: 56, lg: 72} as const;

export type AudioButtonSize = keyof typeof SIZES;
export type AudioButtonState = 'ready' | 'downloading' | 'unavailable';

const PULSE_MS = 1400;
const PULSE_SCALE = 1.65;
const PULSE_OPACITY = 0.55;

/** The download ring's stroke, and its inset from the button's edge. */
const RING = {stroke: 3, inset: 3};

export type AudioButtonProps = {
  playing?: boolean;
  state?: AudioButtonState;
  /** 0–1, shown as the ring while `downloading`. */
  progress?: number;
  /** `slow` adds the half-speed badge. Never changes the icon. */
  speed?: 'natural' | 'slow';
  size?: AudioButtonSize;
  /** Overrides the state's own name. */
  label?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The play button.
 *
 * @example <AudioButton playing={playing} onPress={toggle} size="lg" />
 * @example <AudioButton state="unavailable" />
 */
export function AudioButton({
  playing = false,
  state = 'ready',
  progress = 0,
  speed = 'natural',
  size = 'md',
  label,
  onPress,
  style,
  testID,
}: AudioButtonProps) {
  const px = SIZES[size];
  const unavailable = state === 'unavailable';
  const downloading = state === 'downloading';
  const inert = unavailable || downloading;

  const fill = unavailable ? color.ground200 : downloading ? color.surfaceCard : color.surfaceInk;
  const ink = unavailable ? color.textSubtle : downloading ? color.textAccent : color.textOnInk;

  const icon: IconName = unavailable
    ? 'volume-x'
    : downloading
      ? 'download'
      : playing
        ? 'pause'
        : 'volume-2';

  const name =
    label ?? (unavailable ? 'Audio unavailable offline' : playing ? 'Pause' : 'Play audio');

  // The pulse runs only while sound is actually coming out — a paused button that keeps
  // pulsing says the wrong thing.
  const pulsing = playing && state === 'ready';
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!pulsing) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, {duration: PULSE_MS, easing: easing.out, reduceMotion: ReduceMotion.System}),
      -1,
      false,
    );
  }, [pulsing, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{scale: 1 + pulse.value * (PULSE_SCALE - 1)}],
    opacity: (1 - pulse.value) * PULSE_OPACITY,
  }));

  const glyphSize = px >= SIZES.lg ? 28 : px >= SIZES.md ? 24 : 20;

  return (
    <View style={[CONTAINER, style]} testID={testID}>
      {pulsing ? (
        <Animated.View
          aria-hidden
          style={[RING_PULSE, {width: px, height: px, borderRadius: radius.pill}, pulseStyle]}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
        aria-disabled={inert}
        disabled={inert || !onPress}
        onPress={onPress}
        style={({pressed}) => [
          BUTTON,
          {width: px, height: px, backgroundColor: fill},
          pressed && !inert ? pressScale : null,
        ]}
      >
        <Icon name={icon} size={glyphSize} color={ink} />
        {downloading ? <DownloadRing px={px} progress={progress} /> : null}
      </Pressable>
      {speed === 'slow' && !inert ? (
        <View aria-hidden style={BADGE}>
          <Text style={BADGE_TEXT}>½×</Text>
        </View>
      ) : null}
    </View>
  );
}

/** The install progress arc, drawn only while a pack is arriving. */
function DownloadRing({px, progress}: {px: number; progress: number}) {
  const centre = px / 2;
  const r = centre - RING.inset;
  const c = 2 * Math.PI * r;
  const fraction = Math.min(Math.max(progress, 0), 1);

  return (
    <Svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} style={ABSOLUTE}>
      <G transform={`rotate(-90, ${centre}, ${centre})`}>
        <Circle
          cx={centre}
          cy={centre}
          r={r}
          stroke={color.teal200}
          strokeWidth={RING.stroke}
          fill="none"
        />
        <Circle
          cx={centre}
          cy={centre}
          r={r}
          stroke={color.teal600}
          strokeWidth={RING.stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          fill="none"
        />
      </G>
    </Svg>
  );
}

const CONTAINER: ViewStyle = {
  alignSelf: 'flex-start',
  alignItems: 'center',
  justifyContent: 'center',
};

const RING_PULSE: ViewStyle = {position: 'absolute', backgroundColor: color.teal300};

const BUTTON: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radius.pill,
};

const ABSOLUTE: ViewStyle = {position: 'absolute', top: 0, left: 0};

const BADGE: ViewStyle = {
  position: 'absolute',
  bottom: -4,
  right: -4,
  minWidth: 22,
  height: 22,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: space['1'],
  borderRadius: radius.pill,
  backgroundColor: color.surfaceAccentSoft,
};

/**
 * The board sets this at a raw 10px, one below `--text-3xs`.
 *
 * Using the token instead: a 1pt difference inside a 22pt badge is invisible, and a raw px
 * where a token nearly fits is how a scale stops being a scale.
 */
const BADGE_TEXT: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize['3xs'],
  color: color.textAccent,
};
