/**
 * @fileoverview WordCard — the teach card.
 *
 * The first meeting with a word inside a stop, shown before every vocabulary item in batches
 * of two or three. It is the most-seen surface in the product, which is why it is a
 * component rather than a layout repeated per screen.
 *
 * Tibetan large through `TibetanText`, romanization and English beneath, the illustration
 * when one exists, audio played once on arrival and replayable with the slow take one tap
 * away. **The learner decides nothing here** — the one button, Continue, lives on the screen
 * rather than in the card, so the card is only ever a thing to read.
 *
 * `noScript` draws the honest card for a record whose Lhasa form is not found yet (78 of
 * them). No padlock and no skeleton: the English carries the card and the gap is stated in
 * words, using `WordRow`'s wording so the two surfaces cannot drift.
 *
 * `variantBo` carries a second attested form (146 records have one). `registerMark` renders
 * proposal (a) of the open register question — leaving it off everywhere is proposal (b),
 * so it is a prop rather than a rule.
 */

import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {
  color,
  fontFamily,
  fontSize,
  leading,
  radius,
  space,
  tracking,
} from '../../theme/tokens.generated';
import {AudioButton} from './audio-button';
import {TibetanText} from './tibetan-text';
import {NOT_FOUND_YET} from './word-row';

/** `--tracking-caps` in points at the micro-label's size. */
const CAPS_TRACKING = parseFloat(tracking.caps) * fontSize['2xs'];

/** `--tracking-display` at the no-script card's answer size, which is a drawn 30. */
const NO_SCRIPT_ANSWER = 30;
const DISPLAY_TRACKING = parseFloat(tracking.display) * NO_SCRIPT_ANSWER;

const ILLUSTRATION_HEIGHT = 148;

/** What the register marker says when the caller gives no words of its own. */
const DEFAULT_REGISTER_NOTE = 'said of the other person';

export type WordCardProps = {
  bo?: string;
  /** The Trungtrung romanization. */
  roman?: string;
  en?: string;
  /** A line about using the word. On a no-script card it carries the meaning. */
  note?: string;
  /** "New word · Offerings". */
  eyebrow?: string;
  illustration?: boolean;
  /** What is known about the missing Lhasa form. Replaces the script block. */
  noScript?: string;
  /** A second attested form. */
  variantBo?: string;
  variantRoman?: string;
  /** `true`, or the words explaining who the honorific honours. */
  registerMark?: boolean | string;
  footnote?: string;
  audio?: boolean;
  playing?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The card a word is taught on.
 *
 * @example <WordCard eyebrow="New word · First Words" bo="ཏོག་ཙམ་" roman="toktsam" en="a little" />
 * @example <WordCard en="hello (casual)" noScript="Lhasa has no everyday hello apart from trashi delek." />
 */
export function WordCard({
  bo,
  roman,
  en,
  note,
  eyebrow,
  illustration = false,
  noScript,
  variantBo,
  variantRoman,
  registerMark,
  footnote,
  audio = true,
  playing = false,
  style,
  testID,
}: WordCardProps) {
  return (
    <View style={[CARD, style]} testID={testID}>
      {eyebrow ? <Text style={[MICRO, CENTRED_SELF]}>{eyebrow}</Text> : null}
      {illustration ? (
        <View aria-hidden style={ILLUSTRATION}>
          <View style={SILHOUETTE} />
        </View>
      ) : null}
      {noScript ? (
        <View style={GAP_BLOCK}>
          <Text style={NO_SCRIPT_HEAD}>{en}</Text>
          {note ? <Text style={NO_SCRIPT_NOTE}>{note}</Text> : null}
          <View style={GAP_PANEL}>
            <Text style={MICRO}>{NOT_FOUND_YET}</Text>
            <Text style={GAP_WORDS}>{noScript}</Text>
          </View>
        </View>
      ) : (
        <TibetanText unit="word" size="xl" align="center" roman={roman} gloss={en}>
          {bo ?? ''}
        </TibetanText>
      )}
      {!noScript && note ? <Text style={NOTE}>{note}</Text> : null}
      {registerMark ? (
        <View style={REGISTER}>
          <Text style={[MICRO, ACCENT]}>Honorific</Text>
          <Text style={REGISTER_NOTE}>
            {typeof registerMark === 'string' ? registerMark : DEFAULT_REGISTER_NOTE}
          </Text>
        </View>
      ) : null}
      {variantBo ? (
        <View style={VARIANT}>
          <Text style={MICRO}>Also heard</Text>
          <TibetanText inline unit="word" size="xs" roman={variantRoman}>
            {variantBo}
          </TibetanText>
          {variantRoman ? (
            // Hidden: it is already the variant's accessible name.
            <Text aria-hidden style={VARIANT_ROMAN}>
              {variantRoman}
            </Text>
          ) : null}
        </View>
      ) : null}
      {audio && !noScript ? (
        <View style={CONTROLS}>
          <AudioButton size="lg" playing={playing} />
          <AudioButton size="sm" speed="slow" />
        </View>
      ) : null}
      {footnote ? <Text style={FOOTNOTE}>{footnote}</Text> : null}
    </View>
  );
}

const CARD: ViewStyle = {
  width: '100%',
  backgroundColor: color.surfaceCard,
  borderRadius: radius.lg,
  paddingVertical: space['6'],
  paddingHorizontal: space['5'],
  gap: space['4'],
};

const CENTRED_SELF: ViewStyle = {alignSelf: 'center'};

const ILLUSTRATION: ViewStyle = {
  height: ILLUSTRATION_HEIGHT,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radius.md,
  backgroundColor: color.surfaceAccentSoft,
};

/** The placeholder shape. No illustrations exist in this repo yet — `docs/10`. */
const SILHOUETTE: ViewStyle = {
  width: 44,
  height: 66,
  opacity: 0.6,
  backgroundColor: color.ink900,
  borderTopLeftRadius: 8,
  borderTopRightRadius: 8,
  borderBottomLeftRadius: 16,
  borderBottomRightRadius: 16,
};

const GAP_BLOCK: ViewStyle = {alignItems: 'center', gap: space['3']};

const GAP_PANEL: ViewStyle = {
  alignSelf: 'stretch',
  gap: 4,
  padding: space['4'],
  borderRadius: radius.md,
  backgroundColor: color.surfaceSunken,
};

const REGISTER: ViewStyle = {
  alignSelf: 'center',
  flexDirection: 'row',
  alignItems: 'center',
  gap: space['2'],
  paddingVertical: 7,
  paddingHorizontal: space['3h'],
  borderRadius: radius.pill,
  backgroundColor: color.surfaceAccentSoft,
};

const VARIANT: ViewStyle = {
  alignSelf: 'center',
  flexDirection: 'row',
  alignItems: 'center',
  gap: space['2'],
};

const CONTROLS: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: space['4'],
};

const MICRO: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize['2xs'],
  lineHeight: fontSize['2xs'] * leading.tight,
  letterSpacing: CAPS_TRACKING,
  textTransform: 'uppercase',
  color: color.textMuted,
};

const ACCENT: TextStyle = {color: color.textAccent};

const NO_SCRIPT_HEAD: TextStyle = {
  fontFamily: fontFamily.displayExtrabold,
  fontSize: NO_SCRIPT_ANSWER,
  lineHeight: NO_SCRIPT_ANSWER * 1.15,
  letterSpacing: DISPLAY_TRACKING,
  color: color.textHeading,
  textAlign: 'center',
};

const NO_SCRIPT_NOTE: TextStyle = {
  fontFamily: fontFamily.bodyRegular,
  fontSize: fontSize.md,
  lineHeight: fontSize.md * leading.latin,
  color: color.textBody,
  textAlign: 'center',
};

const GAP_WORDS: TextStyle = {
  fontFamily: fontFamily.bodyRegular,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * leading.latin,
  color: color.textMuted,
};

const NOTE: TextStyle = {
  alignSelf: 'center',
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * leading.latin,
  color: color.textSubtle,
  textAlign: 'center',
};

const REGISTER_NOTE: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.xs,
  lineHeight: fontSize.xs * 1.3,
  color: color.textMuted,
};

const VARIANT_ROMAN: TextStyle = {
  fontFamily: fontFamily.bodyMediumItalic,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * 1.3,
  color: color.textAccent,
};

const FOOTNOTE: TextStyle = {
  alignSelf: 'center',
  fontFamily: fontFamily.bodyRegular,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * leading.latin,
  color: color.textSubtle,
  textAlign: 'center',
};
