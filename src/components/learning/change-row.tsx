/**
 * @fileoverview ChangeRow — before and after, side by side.
 *
 * A bare syllable, what a letter in front does to it, and the result. The Read track's tips
 * used to narrate this in prose; a row shows it instead, and the learner can hear both forms.
 *
 * `change` names what happened in two or three words — "breath gone", "no change". It goes
 * through `mixedTibetan`, so a change written with a glyph in it ("the བ vanishes") still
 * sets the script correctly rather than in the caption's Latin face.
 *
 * **`rise` is the one case where position carries meaning.** A syllable that goes up in
 * pitch is drawn higher than the one it came from. Only pitch earns the offset — nothing
 * else on the row moves, or the rise stops meaning anything.
 *
 * Glyphs default to `lg` and never to hero: a tip may not out-shout the letter cards it
 * follows.
 */

import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {Icon} from '../core/icon';
import {color, fontFamily, fontSize, space} from '../../theme/tokens.generated';
import {AudioButton} from './audio-button';
import {TibetanText, mixedTibetan, type TibetanSize} from './tibetan-text';

/** How far a risen syllable lifts, in points. */
const RISE = 22;

/** The caption's own line height. Tighter than prose, because it is two or three words. */
const CAPTION_LEADING = 1.35;

/** Wide enough for "the བ vanishes" on two lines, narrow enough to stay a caption. */
const CAPTION_WIDTH = 104;

type FormProps = {
  glyph: string;
  roman?: string;
  size: TibetanSize;
  audio: boolean;
  lifted?: boolean;
};

function Form({glyph, roman, size, audio, lifted = false}: FormProps) {
  return (
    <View style={[FORM, lifted ? LIFTED : null]}>
      <TibetanText size={size} align="center" roman={roman}>
        {glyph}
      </TibetanText>
      {audio ? <AudioButton size="sm" label={roman ? `Play ${roman}` : undefined} /> : null}
    </View>
  );
}

export type ChangeRowProps = {
  /** The syllable on its own. */
  bare: string;
  bareRoman?: string;
  /** What it becomes. */
  to: string;
  toRoman?: string;
  /** What happened, in two or three words. */
  change: string;
  /** Draws the result higher, for a rise in pitch. Nothing else may use it. */
  rise?: boolean;
  size?: TibetanSize;
  audio?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * One sound change, shown rather than described.
 *
 * @example <ChangeRow bare="ཀུ" bareRoman="ku" to="དཀུ" toRoman="ku" change="no change" />
 * @example <ChangeRow bare="ངུ" bareRoman="ngu" to="དངུ" toRoman="nghu" change="higher pitch" rise />
 */
export function ChangeRow({
  bare,
  bareRoman,
  to,
  toRoman,
  change,
  rise = false,
  size = 'lg',
  audio = true,
  style,
  testID,
}: ChangeRowProps) {
  return (
    // The row reserves the lift as top padding, so a risen result stays inside the card
    // instead of climbing over whatever sits above it.
    <View style={[ROW, rise ? {paddingTop: RISE} : null, style]} testID={testID}>
      <View style={SIDE}>
        <Form glyph={bare} roman={bareRoman} size={size} audio={audio} />
      </View>
      <View style={MIDDLE}>
        <Icon name="arrow-right" size={24} color={color.ink400} />
        <Text style={CAPTION}>{mixedTibetan(change, 'xs')}</Text>
      </View>
      <View style={SIDE}>
        <Form glyph={to} roman={toRoman} size={size} audio={audio} lifted={rise} />
      </View>
    </View>
  );
}

const ROW: ViewStyle = {
  width: '100%',
  flexDirection: 'row',
  alignItems: 'center',
  gap: space['3'],
};

/** Both sides share the leftover width evenly, so the arrow stays on the row's centre. */
const SIDE: ViewStyle = {flex: 1, alignItems: 'center'};

const MIDDLE: ViewStyle = {
  flexShrink: 0,
  alignItems: 'center',
  gap: space['1h'],
  maxWidth: CAPTION_WIDTH,
};

const FORM: ViewStyle = {alignItems: 'center', gap: space['2']};

const LIFTED: ViewStyle = {transform: [{translateY: -RISE}]};

const CAPTION: TextStyle = {
  fontFamily: fontFamily.bodySemibold,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * CAPTION_LEADING,
  color: color.textMuted,
  textAlign: 'center',
};
