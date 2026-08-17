/**
 * @fileoverview TibetanText — the only component allowed to set a Tibetan face.
 *
 * Ported from the design system's `components/learning/TibetanText.jsx`. Every element
 * containing a character in the Tibetan block goes through here; `docs/04` forbids any
 * other component from hand-setting the Tibetan family or marking the language, and the
 * adherence contract enforces it.
 *
 * The script rules themselves live in `src/domain/tibetan.ts`, not here. What counts as
 * one line letter is a fact about uchen that the glyph drills need too, and a second
 * copy inside a component would be a second opinion about the script.
 *
 * What this file owns is the typography, and these are rules rather than defaults:
 * Tibetan sets at 2.1 leading, is never letter-spaced, and always offers its
 * romanization as the accessible name because screen readers mangle the script.
 *
 * React Native differences from the web original, all measured in
 * docs/spikes/2026-08-17-tibetan-rendering.md:
 *
 * - `lineHeight` is absolute, not a ratio, so it is computed per size.
 * - `fontWeight` does nothing on a bundled family, so weight is a family name.
 * - The font's own line box is ~2.8x the size, making 2.1 leading a compression: ink
 *   overflows by ~0.35x. Verified safe on iOS and web, and the reason anything placed
 *   directly under Tibetan needs headroom.
 * - `--measure-tibetan` is 34ch, which has no point equivalent and on a phone is always
 *   wider than the screen. Omitted rather than guessed at.
 */

import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {lineLetters, tshegBreaks, withTsheg, type TibetanUnit} from '../../domain/tibetan';
import {color, fontFamily, fontSize, leading} from '../../theme/tokens.generated';

/** The Tibetan size ramp. Tibetan runs optically small, so it is stepped up a notch. */
const TIB_SIZES = {
  xs: fontSize.tibXs,
  sm: fontSize.tibSm,
  md: fontSize.tibMd,
  lg: fontSize.tibLg,
  xl: fontSize.tibXl,
  hero: fontSize.tibHero,
} as const;

export type TibetanSize = keyof typeof TIB_SIZES;

export type TibetanTextProps = {
  children: string;
  /** The Trungtrung romanization. Becomes the accessible name — never the THL. */
  roman?: string;
  /**
   * The older THL spelling, for a learner who has met it in a book.
   *
   * Renders only as the word sheet's "also written" row. Never an accessible name and
   * never inside an exercise.
   */
  thl?: string;
  /** Wylie, labelled "Spelled". Off by default; never an alternative pronunciation. */
  wylie?: string;
  gloss?: string;
  size?: TibetanSize;
  align?: 'start' | 'center';
  /** The editorial weight. Both Tibetan tokens are the same family — see below. */
  serif?: boolean;
  /** A Tibetan word inside a Latin sentence: inherits colour, drops the stack of rows. */
  inline?: boolean;
  unit?: TibetanUnit;
  /**
   * Indices of the line letters to hold at full ink, draining the rest to muted.
   *
   * Highlight by dimming, never by decorating: same font, size, weight and baseline,
   * with no box, arrow or second colour. It reads instantly and survives small type.
   * Because that is colour-only, `highlightLabel` is what makes it accessible.
   */
  highlight?: number | number[] | null;
  /** `char` only where the thing being named sits INSIDE a stack. */
  highlightUnit?: 'letter' | 'char';
  /** Names what is highlighted, for the caption and the accessible name. */
  highlightLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
};

/**
 * Tibetan, set to the system's rules.
 *
 * @example
 * <TibetanText roman="trashi delek" gloss="hello">བཀྲ་ཤིས་བདེ་ལེགས</TibetanText>
 *
 * @example
 * // One line letter named, the rest dimmed. Colour-only, so the label is required.
 * <TibetanText highlight={1} highlightLabel="root ག" unit="letter">བསྒྲིབས</TibetanText>
 */
export function TibetanText({
  children,
  roman,
  thl,
  wylie,
  gloss,
  size = 'md',
  align = 'start',
  serif = false,
  inline = false,
  unit = 'auto',
  highlight = null,
  highlightUnit = 'letter',
  highlightLabel,
  style,
  textStyle,
  testID,
}: TibetanTextProps) {
  const glyphSize = TIB_SIZES[size];
  const value = withTsheg(children, unit);

  const glyphStyle: TextStyle = {
    // `serif` selects a heavier face rather than a second family: Google Fonts does
    // not publish Noto Sans Tibetan, so both Tibetan tokens are the serif face.
    fontFamily: serif ? fontFamily.tibetanMedium : fontFamily.tibetanRegular,
    fontSize: glyphSize,
    // Absolute, because React Native takes points where CSS takes a ratio.
    lineHeight: glyphSize * leading.tibetan,
    // Never letter-space Tibetan: it pulls stacks apart.
    letterSpacing: 0,
  };

  const body = renderRuns(value, highlight, highlightUnit);

  if (inline) {
    return (
      <Text
        accessibilityLanguage="bo"
        accessibilityLabel={highlightLabel ?? roman}
        style={[glyphStyle, textStyle]}
        testID={testID}
      >
        {body}
      </Text>
    );
  }

  return (
    <View style={[align === 'center' && styles.centered, style]} testID={testID}>
      <Text
        accessibilityLanguage="bo"
        accessibilityLabel={highlightLabel ?? roman}
        style={[glyphStyle, styles.ink, align === 'center' && styles.centerText, textStyle]}
      >
        {body}
      </Text>
      {roman ? (
        // Hidden from assistive tech: the romanization is already the glyph's
        // accessible name, so announcing it twice is noise.
        <Text aria-hidden style={styles.roman}>
          {roman}
        </Text>
      ) : null}
      {thl ? <Text style={styles.thl}>{`also written · ${thl}`}</Text> : null}
      {wylie ? <Text style={styles.wylie}>{wylie}</Text> : null}
      {gloss ? <Text style={styles.gloss}>{gloss}</Text> : null}
    </View>
  );
}

/**
 * The glyph run, dimmed around the highlight when there is one.
 *
 * With nothing highlighted the whole string stays one string, so the text engine can
 * break it at the tsheg opportunities. Splitting for dimming is done by line letter,
 * never by character — a character split would dim half of a stack.
 */
function renderRuns(
  value: string,
  highlight: number | number[] | null | undefined,
  highlightUnit: 'letter' | 'char',
) {
  if (highlight === null || highlight === undefined) {
    return tshegBreaks(value);
  }
  const keep = Array.isArray(highlight) ? highlight : [highlight];
  const units = highlightUnit === 'char' ? Array.from(value) : lineLetters(value);
  return units.map((part, index) => (
    <Text key={index} style={keep.includes(index) ? undefined : styles.muted}>
      {part}
    </Text>
  ));
}

// Hoisted so each object is created once rather than per render. Values come from the
// generated tokens, per the design system's no-raw-values rule.
const styles = {
  centered: {alignItems: 'center'} as ViewStyle,
  centerText: {textAlign: 'center'} as TextStyle,
  ink: {color: color.textTibetan} as TextStyle,
  muted: {color: color.textMuted} as TextStyle,
  roman: {
    fontFamily: fontFamily.bodyMediumItalic,
    fontSize: fontSize.md,
    color: color.textAccent,
  } as TextStyle,
  thl: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize.xs,
    color: color.textSubtle,
  } as TextStyle,
  wylie: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    color: color.textMuted,
  } as TextStyle,
  gloss: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * leading.latin,
    color: color.textMuted,
  } as TextStyle,
};
