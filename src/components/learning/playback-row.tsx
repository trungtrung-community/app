/**
 * @fileoverview PlaybackRow — record-and-compare, one take per row.
 *
 * The native speaker's take above the learner's own. **The waveform is a fixed set of bars,
 * not a live analyser.** This product never scores a recording; it only lets you hear the
 * two side by side, and a bar chart that appeared to measure something would promise a
 * judgement the app deliberately does not make.
 *
 * The learner's row is teal and the native row is ink, which is the only thing separating
 * them at a glance — the two rows are otherwise identical, because neither is the standard
 * the other is marked against.
 */

import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {IconButton} from '../core/icon-button';
import {
  color,
  fontFamily,
  fontSize,
  leading,
  radius,
  space,
  tracking,
} from '../../theme/tokens.generated';

/**
 * The drawn bars, in points.
 *
 * Two fixed sets rather than one, so the two rows do not read as the same recording twice.
 * They are decoration with a shape, not data: nothing in the app derives them from audio.
 */
const WAVE = {
  native: [
    4, 8, 13, 18, 22, 19, 14, 9, 6, 11, 17, 21, 16, 10, 7, 12, 18, 15, 9, 5, 8, 14, 19, 13, 8, 5, 7,
    4,
  ],
  you: [
    5, 9, 14, 20, 17, 11, 7, 13, 19, 22, 16, 9, 6, 12, 18, 14, 8, 5, 10, 16, 20, 13, 7, 4, 9, 15,
    11, 6,
  ],
} as const;

const WAVE_HEIGHT = 22;
const BAR_RADIUS = 2;

/** `--tracking-caps` in points at the label's size. */
const CAPS_TRACKING = parseFloat(tracking.caps) * fontSize['2xs'];

export type PlaybackSource = keyof typeof WAVE;

export type PlaybackRowProps = {
  source?: PlaybackSource;
  /** Overrides the source's own name — "Slowly", for the reduced-rate take. */
  label?: string;
  /** As the product writes it: "0:02". */
  duration?: string;
  playing?: boolean;
  onPlay?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * One take, with its play control.
 *
 * @example <PlaybackRow source="native" />
 * @example <PlaybackRow source="you" playing duration="0:03" onPlay={toggle} />
 */
export function PlaybackRow({
  source = 'native',
  label,
  duration = '0:02',
  playing = false,
  onPlay,
  style,
  testID,
}: PlaybackRowProps) {
  const you = source === 'you';
  const title = label ?? (you ? 'You' : 'Native speaker');
  const bars = WAVE[source];
  const barColor = you ? color.teal500 : color.ink400;

  return (
    <View style={[ROW, style]} testID={testID}>
      <IconButton
        icon={playing ? 'pause' : 'play'}
        label={title}
        variant={you ? 'soft' : 'card'}
        size="sm"
        onPress={onPlay}
      />
      <View style={BODY}>
        <Text style={LABEL}>{title}</Text>
        <View aria-hidden style={WAVE_ROW}>
          {bars.map((height, index) => (
            <View key={index} style={[BAR, {height, backgroundColor: barColor}]} />
          ))}
        </View>
      </View>
      <Text style={DURATION}>{duration}</Text>
    </View>
  );
}

const ROW: ViewStyle = {
  width: '100%',
  flexDirection: 'row',
  alignItems: 'center',
  gap: space['3h'],
  paddingVertical: space['3'],
  paddingHorizontal: space['4'],
  borderRadius: radius.lg,
  backgroundColor: color.surfaceCard,
};

const BODY: ViewStyle = {flex: 1, minWidth: 0, gap: 7};

const WAVE_ROW: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 3,
  height: WAVE_HEIGHT,
};

/** Each bar takes an equal share of the row, so the wave fits any width. */
const BAR: ViewStyle = {flex: 1, borderRadius: BAR_RADIUS};

const LABEL: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize['2xs'],
  lineHeight: fontSize['2xs'] * leading.tight,
  letterSpacing: CAPS_TRACKING,
  textTransform: 'uppercase',
  color: color.textMuted,
};

const DURATION: TextStyle = {
  flexShrink: 0,
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.xs,
  lineHeight: fontSize.xs * leading.tight,
  color: color.textSubtle,
};
