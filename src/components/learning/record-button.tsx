/**
 * @fileoverview RecordButton — record, play back, done.
 *
 * The same visual family as `AudioButton`, and deliberately no more than that:
 * **no scoring, no waveform matching, no "82% accurate".** The product lets a learner hear
 * their own take beside a native one and draws no conclusion, because a pronunciation score
 * a beginner cannot interpret is a number that only discourages.
 *
 * idle (mic) → recording (stop, with the accent ring pulsing) → playback (play/pause of the
 * learner's own take). `PlaybackRow` is what the third state feeds.
 *
 * Ported from the bundle: `RecordButton` ships no `.jsx` in the export.
 *
 * The ring's weight is `--record-ring-width`, added to the design system on 2026-08-17 when
 * this component was ported — it was the last raw line weight in the elevation group, and
 * sharing `--focus-ring-width` would have tied a decorative pulse to a focus indicator that
 * happens to be the same 3px today.
 */

import {useEffect} from 'react';
import {Pressable, View, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {Icon, type IconName} from '../core/icon';
import {easing} from '../core/motion';
import {color, elevation, radius} from '../../theme/tokens.generated';

const SIZES = {sm: 44, md: 56, lg: 72} as const;

export type RecordButtonSize = keyof typeof SIZES;
export type RecordButtonState = 'idle' | 'recording' | 'playback';

/** The pulse: a full cycle, so each half runs for half of it. */
const PULSE_CYCLE = 1200;
const PULSE_FLOOR = 0.35;

/** How far outside the button the ring sits. */
const RING_INSET = -5;

/** The names each state answers to, when the caller does not override them. */
const LABELS: Record<RecordButtonState, string> = {
  idle: 'Record yourself',
  recording: 'Stop recording',
  playback: 'Play your recording',
};

const PLAYBACK_PAUSE_LABEL = 'Pause your recording';

export type RecordButtonProps = {
  state?: RecordButtonState;
  /** Only meaningful in `playback`. */
  playing?: boolean;
  size?: RecordButtonSize;
  /** Overrides the state's own name. */
  label?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The record control.
 *
 * @example <RecordButton state="idle" onPress={start} />
 * @example <RecordButton state="playback" playing={playing} onPress={toggle} />
 */
export function RecordButton({
  state = 'idle',
  playing = false,
  size = 'md',
  label,
  onPress,
  style,
  testID,
}: RecordButtonProps) {
  const box = SIZES[size];
  const recording = state === 'recording';
  const icon: IconName = recording
    ? 'square'
    : state === 'playback'
      ? playing
        ? 'pause'
        : 'play'
      : 'mic';
  const name = label ?? (state === 'playback' && playing ? PLAYBACK_PAUSE_LABEL : LABELS[state]);

  return (
    <View style={[WRAP, style]} testID={testID}>
      {recording ? <Pulse box={box} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
        onPress={onPress}
        style={[
          BUTTON,
          {
            width: box,
            height: box,
            backgroundColor: state === 'playback' ? color.surfaceAccent : color.surfaceInk,
          },
        ]}
      >
        <Icon
          name={icon}
          size={box >= SIZES.lg ? 28 : box >= SIZES.md ? 24 : 20}
          color={color.textOnAccent}
        />
      </Pressable>
    </View>
  );
}

/**
 * The ring that says a recording is running.
 *
 * Opacity rather than scale: a ring that grew would read as a level meter, and this
 * component measures nothing. `ReduceMotion.System` stops it where the setting asks, which
 * leaves the ring drawn and still — the state stays legible without the movement.
 */
function Pulse({box}: {box: number}) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(PULSE_FLOOR, {
        duration: PULSE_CYCLE / 2,
        easing: easing.inOut,
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    );
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({opacity: opacity.value}));

  return (
    <Animated.View
      aria-hidden
      style={[
        RING,
        {
          width: box - RING_INSET * 2,
          height: box - RING_INSET * 2,
        },
        animated,
      ]}
    />
  );
}

const WRAP: ViewStyle = {alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center'};

const BUTTON: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radius.pill,
};

const RING: ViewStyle = {
  position: 'absolute',
  borderRadius: radius.pill,
  borderWidth: elevation.recordRingWidth,
  borderColor: color.teal500,
};
