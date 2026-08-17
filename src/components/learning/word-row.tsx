/**
 * @fileoverview WordRow — one entry in a word or phrase list.
 *
 * Tibetan first, its romanization second, English third, always through `TibetanText` so the
 * 2.1 leading and the accessible name cannot drift row to row.
 *
 * The status dot is the whole vocabulary of knowing, and it matches the progression model
 * exactly: `known` solid teal, `met` solid grey — seen but not yet reliable — `new` hollow,
 * and `coming` hollow and faint, where the row itself sits on ground and audio is off.
 *
 * `register` marks a word that is honorific, and appears only when the word is one, so it
 * reads as information about that word rather than chrome on every row. `romanNote` carries
 * tone guidance for the words where an English speaker's instinct is wrong. `wylie` is the
 * spelling line, shown only when the learner has turned the advanced setting on and never as
 * an alternative to the romanization.
 *
 * `noScript` is the row for a record with no Lhasa form found yet. It was drawn by hand on
 * three frames before it lived here: the gap is stated in words, the English carries the row,
 * and there is nothing to play.
 */

import {Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {Badge} from '../core/badge';
import {Icon} from '../core/icon';
import {
  color,
  elevation,
  fontFamily,
  fontSize,
  leading,
  radius,
  space,
  tracking,
} from '../../theme/tokens.generated';
import {AudioButton} from './audio-button';
import {TibetanText, type TibetanSize} from './tibetan-text';

/**
 * The dot per status.
 *
 * `new` and `coming` are hollow — an inset ring rather than a fill, which is how a
 * fill-based system draws an outline without a border.
 */
const DOTS = {
  known: {fill: color.teal600, ring: null},
  met: {fill: color.ground400, ring: null},
  new: {fill: 'transparent', ring: elevation.ringRowMet},
  coming: {fill: 'transparent', ring: elevation.ringRowComing},
} as const;

export type WordStatus = keyof typeof DOTS;

/** The words the product uses for a record whose Lhasa form has not been found. */
export const NOT_FOUND_YET = 'Tibetan · not found yet';

const DOT_SIZE = 6;

/** `--tracking-caps` in points at the eyebrow's size. */
const CAPS_TRACKING = parseFloat(tracking.caps) * fontSize['2xs'];

export type WordRowProps = {
  bo?: string;
  /** The Trungtrung romanization. */
  roman?: string;
  en?: string;
  status?: WordStatus;
  size?: TibetanSize;
  /** Marks a word that is also a collectible. */
  artifact?: boolean;
  audio?: boolean;
  /** Adds the reduced-rate control beside the natural one. Same clip, slower. */
  slow?: boolean;
  /** `honorific` draws the register marker. Anything else draws nothing. */
  register?: string | null;
  /** Tone guidance, where an English speaker's instinct is wrong. */
  romanNote?: string;
  /** The spelling line. Advanced setting only. */
  wylie?: string;
  /** `true`, or a sentence saying what is known about the gap. */
  noScript?: boolean | string;
  /** "Literally: …" for an idiom whose parts do not add up. */
  literal?: string;
  /** What the learner did last time, in the product's own words. */
  missed?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A word or phrase list row.
 *
 * @example <WordRow bo="ཐུགས་" roman="thuk" en="mind" status="known" />
 * @example <WordRow en="prayer wheel" noScript="Recorded in Amdo, not yet in Lhasa." />
 */
export function WordRow({
  bo,
  roman,
  en,
  status = 'met',
  size = 'md',
  artifact = false,
  audio = true,
  slow = false,
  register,
  romanNote,
  wylie,
  noScript,
  literal,
  missed,
  onPress,
  style,
  testID,
}: WordRowProps) {
  const coming = status === 'coming';
  const {fill, ring} = DOTS[status];
  const playable = audio && !coming && !noScript;

  const body = (
    <>
      <View aria-hidden style={[DOT, {backgroundColor: fill}, ring ? {boxShadow: ring} : null]} />
      <View className="flex-1" style={COLUMN}>
        {noScript ? (
          <View style={GAP_BLOCK}>
            <Text style={EYEBROW}>{NOT_FOUND_YET}</Text>
            <Text style={ENGLISH}>{en}</Text>
            {typeof noScript === 'string' ? <Text style={ASIDE}>{noScript}</Text> : null}
          </View>
        ) : (
          <TibetanText
            unit="word"
            roman={roman}
            wylie={wylie}
            gloss={en}
            size={size}
            style={coming ? FAINT : undefined}
          >
            {bo ?? ''}
          </TibetanText>
        )}
        {romanNote ? <Text style={ASIDE}>{romanNote}</Text> : null}
        {register === 'honorific' ? (
          <View style={BADGE_ROW}>
            <Badge tone="neutral">honorific</Badge>
          </View>
        ) : null}
        {literal ? <Text style={LITERAL}>{`Literally: ${literal}`}</Text> : null}
        {missed ? <Text style={ASIDE}>{missed}</Text> : null}
      </View>
      <View className="flex-row items-center gap-2" style={CONTROLS}>
        {artifact ? <Icon name="sparkles" size={16} color={color.beak600} /> : null}
        {playable ? <AudioButton size="sm" /> : null}
        {playable && slow ? <AudioButton size="sm" speed="slow" /> : null}
      </View>
    </>
  );

  const rowStyle: ViewStyle = {
    ...ROW,
    backgroundColor: coming ? color.ground050 : color.surfaceCard,
  };

  if (!onPress) {
    return (
      <View style={[rowStyle, style]} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={roman ?? en}
      onPress={onPress}
      style={[rowStyle, style]}
      testID={testID}
    >
      {body}
    </Pressable>
  );
}

const ROW: ViewStyle = {
  width: '100%',
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: space['3h'],
  paddingVertical: space['3'],
  paddingHorizontal: space['4'],
  borderRadius: radius.lg,
};

/** Nudged down to sit on the Tibetan line's optical centre rather than its ascender. */
const DOT: ViewStyle = {
  flexShrink: 0,
  width: DOT_SIZE,
  height: DOT_SIZE,
  borderRadius: radius.pill,
  marginTop: space['4'],
};

const COLUMN: ViewStyle = {minWidth: 0, gap: 1};
const CONTROLS: ViewStyle = {flexShrink: 0};
const GAP_BLOCK: ViewStyle = {gap: 2};
const BADGE_ROW: ViewStyle = {marginTop: space['1'], alignSelf: 'flex-start'};

/** A row for a word not yet reachable reads back, without disappearing. */
const FAINT: ViewStyle = {opacity: 0.55};

const EYEBROW: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize['2xs'],
  letterSpacing: CAPS_TRACKING,
  textTransform: 'uppercase',
  color: color.textMuted,
};

const ENGLISH: TextStyle = {
  fontFamily: fontFamily.bodySemibold,
  fontSize: fontSize.md,
  lineHeight: fontSize.md * leading.latin,
  color: color.textHeading,
};

const ASIDE: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * leading.latin,
  color: color.textSubtle,
};

const LITERAL: TextStyle = {
  ...ASIDE,
  fontFamily: fontFamily.bodyMediumItalic,
};
