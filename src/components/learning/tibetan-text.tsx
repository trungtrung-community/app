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

import {Fragment, type ReactNode} from 'react';
import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {
  hasTibetan,
  lineLetters,
  splitRuns,
  tshegBreaks,
  withTsheg,
  type TibetanUnit,
} from '../../domain/tibetan';
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

/**
 * The line box Noto Serif Tibetan *declares*, as a multiple of font size.
 *
 * Measured at five sizes in docs/spikes/2026-08-17-tibetan-rendering.md, where the ratio
 * held between 2.80 and 2.86 — at 22pt, an ascent of 32 and a descent of 30.
 *
 * **This is not how much room the ink needs.** The font declares that much because it
 * reserves space for the tallest stack it could ever be asked to draw. Real ink is far
 * smaller: at 22pt, `ཀ` measures 25.3pt and `བསྒྲིབས` — one of the tallest stacks in the
 * language — measures 33.5pt, against `--leading-tibetan`'s 46.2pt box. Both fit, with
 * room over.
 *
 * The spike's finding 2 read the 0.35x overflow as ink escaping the line box. It is not:
 * 0.35 x 22 is 7.7, which is the *half-leading* — the amount the font's declared box hangs
 * outside a compressed line box, above and below, with no ink in it. Corrected here rather
 * than left to be rediscovered, because the wrong reading makes every fixed-height Tibetan
 * box a third taller than it needs to be.
 */
const DECLARED_LINE_BOX = 2.8;

/**
 * The room a Tibetan run of this size would need for the font's whole declared box.
 *
 * Deliberately generous — see above, real ink needs about half this. Worth it only where
 * the content is arbitrary and the cost of clipping is high: an editable field, where the
 * learner can type any stack and Android's baseline placement inside a compressed line box
 * is still unverified. A tile showing one known glyph should use the drawn size instead.
 *
 * @example minHeight: tibetanBox('md')   // 62 at --text-tib-md
 */
export function tibetanBox(size: TibetanSize): number {
  return Math.ceil(TIB_SIZES[size] * DECLARED_LINE_BOX);
}

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
 * Tibetan runs inside a Latin string, each routed through the inline renderer.
 *
 * This is the design system's `TibetanText.mixed()`, as a plain function rather than a
 * static on the component — the same thing under a name TypeScript can see.
 *
 * It exists for the strings a receiver cannot wrap: a Sheet title, a Tooltip label, a
 * RailNode caption. Those arrive as props already assembled, so the call site has no
 * chance to put `<TibetanText>` around the Tibetan part, and without this the script
 * would render in the receiver's Latin type — at 1.55 leading, letter-spaced, and
 * uppercased if the receiver uppercases.
 *
 * Returns the string untouched when there is no Tibetan in it, so it is safe to call on
 * every label rather than only the ones someone remembered were bilingual.
 *
 * @example mixedTibetan('The ད is silent')
 * @example mixedTibetan(title, 'md')
 */
export function mixedTibetan(value: string, size: TibetanSize = 'xs'): ReactNode {
  if (!hasTibetan(value)) {
    return value;
  }
  return splitRuns(value).map((run, index) =>
    run.tibetan ? (
      <TibetanText key={index} inline size={size}>
        {run.text}
      </TibetanText>
    ) : (
      <Fragment key={index}>{run.text}</Fragment>
    ),
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
