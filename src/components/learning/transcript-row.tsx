/**
 * @fileoverview TranscriptRow — a phrase broken into syllables, romanization under each.
 *
 * What a slow take gives you by ear, in text: the shape of the utterance is visible without
 * hearing it. `active` marks the syllable currently playing.
 *
 * Syllables here, not chunks — this is the one surface where the tsheg's own division is
 * the point, because the learner is being shown where the phrase comes apart when it is
 * read slowly. `ChipTray` cuts the same phrase at chunk boundaries instead, for the
 * opposite reason.
 *
 * It is a reading aid on surfaces that already show the answer — the phrase card, the
 * correct band, E8 and E9's transcript — and never on an unanswered exercise.
 */

import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {color, fontFamily, fontSize, leading, radius, space} from '../../theme/tokens.generated';
import {TibetanText, type TibetanSize} from './tibetan-text';

/** Nothing is playing. Not `undefined`, so a caller can clear the mark without a cast. */
const NONE = -1;

export type TranscriptSyllable = {
  /** The Tibetan syllable, tsheg included as the content stores it. */
  bo: string;
  /** Its Trungtrung romanization. */
  roman: string;
};

export type TranscriptRowProps = {
  syllables?: readonly TranscriptSyllable[];
  /** Index of the syllable currently playing, or -1. */
  active?: number;
  size?: TibetanSize;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A phrase, syllable by syllable.
 *
 * @example <TranscriptRow syllables={syllables} active={playingIndex} />
 */
export function TranscriptRow({
  syllables = [],
  active = NONE,
  size = 'md',
  style,
  testID,
}: TranscriptRowProps) {
  return (
    <View style={[ROW, style]} testID={testID}>
      {syllables.map((syllable, index) => {
        const on = index === active;
        const ink = on ? color.textAccent : color.textTibetan;
        return (
          <View key={index} style={[CELL, on ? PLAYING : null]}>
            {/* `roman` names the syllable for a screen reader without drawing a second
                copy — inline TibetanText takes it as the label only. */}
            <TibetanText inline roman={syllable.roman} size={size} textStyle={{color: ink}}>
              {syllable.bo}
            </TibetanText>
            {/* Hidden: the romanization is already the syllable's accessible name. */}
            <Text aria-hidden style={[ROMAN, {color: on ? color.textAccent : color.textMuted}]}>
              {syllable.roman}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const ROW: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  gap: space['1'],
};

const CELL: ViewStyle = {
  alignItems: 'center',
  paddingHorizontal: space['2'],
  paddingBottom: space['1'],
  borderRadius: radius.sm,
};

const PLAYING: ViewStyle = {backgroundColor: color.surfaceAccentSoft};

const ROMAN: TextStyle = {
  fontFamily: fontFamily.bodyMediumItalic,
  fontSize: fontSize.xs,
  lineHeight: fontSize.xs * leading.tight,
  // Tibetan's 2.1 leading leaves air under the glyph; the romanization closes it.
  marginTop: -6,
};
