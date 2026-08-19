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
 * - The font *declares* a line box of ~2.8x the size, and **2.1 cannot be applied to a
 *   `Text` as a compression of it without shaving the top off tall glyphs** — the margin
 *   is 0.04x the font size, which some stacks clear and some do not. The leading rule is
 *   honoured as layout instead: the font's box is rendered and the difference is taken
 *   back with negative margins. See `lineBox` and `leadingTrim`.
 * - `--measure-tibetan` is 34ch, which has no point equivalent and on a phone is always
 *   wider than the screen. Omitted rather than guessed at.
 */

import {Fragment, type ReactNode} from 'react';
import {
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

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
 * The language, marked for both targets.
 *
 * `accessibilityLanguage` is the React Native prop and is what a device reads. It never
 * reaches the DOM — react-native-web drops it, exactly as it drops `accessibilityState` —
 * so the web needs the `lang` attribute as well, and React Native ignores an unknown prop.
 * One each, rather than the one whichever platform was checked last happened to need.
 *
 * The cast is the whole reason this is a constant: React Native does not type `lang`, and
 * a cast buried in the JSX would read as a mistake rather than as a second target.
 */
const TIBETAN_LANGUAGE = {
  accessibilityLanguage: 'bo',
  lang: 'bo',
} as unknown as Partial<TextProps>;

/**
 * The line box Noto Serif Tibetan *declares*, as a multiple of font size.
 *
 * Measured at five sizes in docs/spikes/2026-08-17-tibetan-rendering.md, where the ratio
 * held between 2.80 and 2.86 — at 22pt, an ascent of 32 and a descent of 30.
 *
 * **More than the ink needs, and less than optional.** The font declares that much because
 * it reserves room for the tallest stack it could ever be asked to draw. Real ink is
 * smaller: at 22pt, `ཀ` measures 25.3pt and `བསྒྲིབས` — one of the tallest stacks in the
 * language — measures 33.5pt, against `--leading-tibetan`'s 46.2pt box.
 *
 * **Both fitting is not the same as there being room**, which is what the reading here said
 * until 2026-08-18. Inside a 2.1 box the tall stack clears the top by 0.04 x the font size,
 * so it fits and a glyph slightly taller does not — `སྤོས་` was reported clipped on a device
 * at 44pt. `lineBox` carries the arithmetic. The declared box is therefore what gets
 * rendered, and it is the only figure that is safe for arbitrary content.
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

/**
 * The line box a Tibetan run is given: the font's own, never a compression of it.
 *
 * **`--leading-tibetan: 2.1` cannot be applied as a `lineHeight` on iOS without clipping.**
 * Worked out from the spike's own measurements at 22pt — a declared ascent of 32 (1.45x)
 * and a painted ascent of 23.3 (1.06x) for `བསྒྲིབས`, one of the tallest stacks in the
 * language. React Native centres a compressed box on the font's, so the top of the ink
 * lands at:
 *
 *     ink_top = (lineHeight − 2.8·s) / 2 + 1.45·s − 1.06·s
 *
 * which is only non-negative for **lineHeight ≥ 2.02 · s**. At 2.1 the clearance is
 * 0.04 · s — 1.8pt at `FlashCard`'s 44pt — so any glyph a hair taller than `བསྒྲིབས` has
 * its top shaved off. `སྤོས་` is one, reported from a device on 2026-08-18, and the spike
 * had recorded iOS as clipping nothing because the stack it measured happens to fit.
 *
 * So the box is the font's declared one, which cannot clip whatever glyph it is handed.
 * `--leading-tibetan` is still what the *layout* gets — see `leadingTrim`.
 */
function lineBox(glyphSize: number): number {
  return glyphSize * DECLARED_LINE_BOX;
}

/**
 * The layout space `lineBox` costs, given back.
 *
 * The glyph `Text` now measures 2.8x rather than 2.1x, which would push everything under a
 * Tibetan run down by 0.7x its size. Negative margins take that back, so the rendered box
 * is the font's and the *occupied* box is `--leading-tibetan`'s — spacing identical to
 * before the fix, ink no longer clipped.
 *
 * This is the one place the design system's leading rule survives in React Native. It is
 * the same idea as CSS `leading-trim`, done with the two properties React Native has.
 *
 * **Inline runs get no trim**, and cannot: margins do not apply to text inside text. There
 * the tall box is the fix rather than a cost — it makes a mixed row's height depend on the
 * size of the Tibetan rather than on which glyphs happen to be in it, which is what stops
 * two rows in one card disagreeing.
 */
function leadingTrim(glyphSize: number): TextStyle {
  const trim = (lineBox(glyphSize) - glyphSize * leading.tibetan) / 2;
  return {marginTop: -trim, marginBottom: -trim};
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
    // The font's own box, never a compression of it. See `lineBox` for the arithmetic.
    lineHeight: lineBox(glyphSize),
    // Never letter-space Tibetan: it pulls stacks apart.
    letterSpacing: 0,
  };

  const body = renderRuns(value, highlight, highlightUnit);

  if (inline) {
    return (
      <Text
        {...TIBETAN_LANGUAGE}
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
        {...TIBETAN_LANGUAGE}
        accessibilityLabel={highlightLabel ?? roman}
        style={[
          glyphStyle,
          leadingTrim(glyphSize),
          styles.ink,
          align === 'center' && styles.centerText,
          textStyle,
        ]}
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
