/**
 * @fileoverview ShareCard — the export composition for a collected card.
 *
 * Two formats, one rule: **no call to action, no URL, no border.** The wordmark sits small
 * in a corner and nothing else asks anything of whoever receives it — which is the only
 * reason a card like this gets sent on. A card that recruited would be an advert someone
 * sent to their friend by mistake.
 *
 * On the app ground, never on white: this is a picture, and the pale ground is what makes
 * it read as one when it lands in a message thread beside photographs.
 *
 * **The box is fixed, so the art gives way rather than the copy.** An export format is a
 * size before it is a layout — 320 square has to stay 320 square — and at that size the
 * design system's own numbers do not fit: a 141pt art band plus the word, its romanization
 * and its gloss come to 336, before any `note` at all. Drawn on the web it overflows,
 * centres and slides under the wordmark.
 *
 * The one deviation from the board is here: the art band shrinks under pressure instead.
 * The composition then always fills the format exactly, the copy is never clipped, and a
 * long note costs picture rather than legibility. Logged in `docs/07-decisions`.
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
import {TibetanText} from './tibetan-text';

/** Width, aspect and how much of the width the art takes. */
const FORMATS = {
  square: {width: 320, ratio: 1, art: 0.44},
  story: {width: 260, ratio: 16 / 9, art: 0.52},
} as const;

export type ShareCardFormat = keyof typeof FORMATS;

/** `--tracking-display` in points at the wordmark's size. Negative: display type tightens. */
const DISPLAY_TRACKING = parseFloat(tracking.display) * fontSize.sm;

export type ShareCardProps = {
  format?: ShareCardFormat;
  bo?: string;
  /** The Trungtrung romanization. */
  roman?: string;
  en?: string;
  /** A line about the thing, not about the app. */
  note?: string;
  wordmark?: string;
  /** Overrides the format's width. The height follows the aspect. */
  width?: number;
  /** What the illustration will be. No illustrations exist in this repo yet. */
  children?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A card made to be sent on.
 *
 * @example <ShareCard bo="བོད་ཇ།" roman="phööcha" en="butter tea">Butter tea, a wooden churn</ShareCard>
 * @example <ShareCard format="story" bo="བོད་ཇ།" roman="phööcha" en="butter tea" />
 */
export function ShareCard({
  format = 'square',
  bo,
  roman,
  en,
  note,
  wordmark = 'Trungtrung',
  width,
  children,
  style,
  testID,
}: ShareCardProps) {
  const shape = FORMATS[format];
  const boxWidth = width ?? shape.width;
  const boxHeight = Math.round(boxWidth * shape.ratio);
  const artSize = Math.round(boxWidth * shape.art);
  const story = format === 'story';

  return (
    <View
      style={[
        CARD,
        {
          width: boxWidth,
          height: boxHeight,
          paddingVertical: story ? space['20'] : space['8'],
        },
        style,
      ]}
      testID={testID}
    >
      <View aria-hidden style={[ART, {width: artSize, height: artSize}]}>
        <Text style={ART_TEXT}>{children ?? 'Card illustration'}</Text>
      </View>
      <View style={COPY}>
        {bo ? (
          <TibetanText unit="word" size="lg" align="center" roman={roman} gloss={en}>
            {bo}
          </TibetanText>
        ) : null}
        {note ? <Text style={NOTE}>{note}</Text> : null}
      </View>
      {/* Small, in a corner, and the only mark of where the card came from. */}
      <Text style={WORDMARK}>{wordmark}</Text>
    </View>
  );
}

const CARD: ViewStyle = {
  position: 'relative',
  alignItems: 'center',
  justifyContent: 'center',
  gap: space['6'],
  paddingHorizontal: space['6'],
  borderRadius: radius['2xl'],
  backgroundColor: color.surfaceApp,
  overflow: 'hidden',
};

/**
 * The picture.
 *
 * `flexShrink: 1` is the whole deviation: the art is the only element on the card that can
 * lose height without losing meaning, so it is the one that yields when the copy needs the
 * room. Everything else is set to hold its size.
 */
const ART: ViewStyle = {
  flexShrink: 1,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
  padding: space['3'],
  borderRadius: radius.xl,
  backgroundColor: color.ground200,
};

const COPY: ViewStyle = {flexShrink: 0, alignItems: 'center', gap: 2};

const ART_TEXT: TextStyle = {
  fontFamily: fontFamily.bodySemibold,
  fontSize: fontSize['2xs'],
  lineHeight: fontSize['2xs'] * 1.35,
  color: color.textSubtle,
  textAlign: 'center',
};

const NOTE: TextStyle = {
  fontFamily: fontFamily.bodyRegular,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * leading.latin,
  color: color.textMuted,
  textAlign: 'center',
  marginTop: 6,
};

const WORDMARK: TextStyle = {
  position: 'absolute',
  left: space['5'],
  bottom: space['4'],
  fontFamily: fontFamily.displayExtrabold,
  fontSize: fontSize.sm,
  letterSpacing: DISPLAY_TRACKING,
  color: color.textSubtle,
};
