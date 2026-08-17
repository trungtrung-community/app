/**
 * @fileoverview StackDiagram — an assembled stack with its parts named by role.
 *
 * The Read track's one structural picture: a syllable is a prefix, a superscript, a root, a
 * subscript and a suffix — **and only ever a syllable.** An empty part is a slot waiting to
 * be filled, which is what makes RB12's builder possible without inventing a second
 * component.
 *
 * **Three layouts, and the split between the last two is the lesson.**
 *
 * - `diagram` — the stack above, its parts below, each named.
 * - `additive` — `ཀ + ར་བཏགས་ → ཀྲ`. A subscript is added to its base and the sum is the
 *   reading, so it is written as an addition.
 * - `procedural` — `རྐ · ར → ཀ · ka`. A superscript is **silent**, so "ར + ཀ = རྐ" would
 *   state something false. It is written as a procedure instead: say ར, then ཀ, now say ka.
 *
 * The spell-out rows are read down a column rather than across, so every base, operator and
 * reading sits under its like. Glyph widths differ, so the columns are fixed geometry rather
 * than content-sized — both templates total 262pt, the width of the row inside a 390 frame's
 * card with a play button beside it.
 */

import type {ReactNode} from 'react';
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
import {SyllableChip, type SyllableChipTone} from './syllable-chip';
import {TibetanText} from './tibetan-text';

/** What each role is called, where the caller does not name it itself. */
const ROLE_LABELS = {
  prefix: 'Prefix',
  superscript: 'Superscript',
  root: 'Root',
  subscript: 'Subscript',
  suffix: 'Suffix',
  suffix2: 'Second suffix',
  vowel: 'Vowel',
} as const;

export type StackRole = keyof typeof ROLE_LABELS;

/** The chip size and the assembled stack's size, per diagram size. */
const CHIP_SIZE = {sm: 'sm', md: 'md', lg: 'lg'} as const;
const STACK_SIZE = {sm: 'lg', md: 'xl', lg: 'hero'} as const;

export type StackDiagramSize = keyof typeof CHIP_SIZE;

/** The fixed column widths. `null` is the column that takes what is left. */
const ADDITIVE_COLS = [64, 18, 80, 18, null] as const;
const PROCEDURAL_COLS = [64, 56, 18, 56, null] as const;

/** An empty slot's box — the same footprint a filled chip takes at `md`. */
const SLOT = {width: 58, height: 54} as const;

/** `--tracking-caps` in points at the role label's size. */
const CAPS_TRACKING = parseFloat(tracking.caps) * fontSize['2xs'];

export type StackPart = {
  glyph?: string;
  role?: StackRole;
  /** Overrides the role's own name. */
  label?: string;
  /** A slot waiting to be filled. */
  empty?: boolean;
  tone?: SyllableChipTone;
};

export type StackDiagramProps = {
  /** The assembled stack. Empty while the builder is unfinished. */
  stack?: string;
  parts?: readonly StackPart[];
  /** The Trungtrung romanization of the whole stack. */
  roman?: string;
  note?: string;
  size?: StackDiagramSize;
  layout?: 'diagram' | 'additive' | 'procedural';
  /** `additive` and `procedural`: the letter being combined or spelled. */
  base?: {glyph?: string; roman?: string} | string;
  /** `procedural`: the silent letter on top. */
  head?: string;
  /** `additive`: the thing being added, named as the script names it. */
  combiner?: {bo?: string; roman?: string};
  showRoles?: boolean;
  /** Tints the root, which is the part carrying the sound. */
  highlightRoot?: boolean;
  onPart?: (part: StackPart, index: number) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A stack, taken apart.
 *
 * @example
 * <StackDiagram stack="བསྒྲུབས" roman="drup" parts={[{glyph: 'བ', role: 'prefix'}, …]} />
 * @example
 * // A subscript adds; the sum is the reading.
 * <StackDiagram layout="additive" base={{glyph: 'ཀ', roman: 'ka'}} combiner={{bo: 'ར་བཏགས་', roman: 'ra-tak'}} stack="ཀྲ" roman="tra" />
 * @example
 * // A superscript is silent, so it is spelled aloud rather than added.
 * <StackDiagram layout="procedural" stack="རྐ" head="ར" base="ཀ" roman="ka" />
 */
export function StackDiagram({
  stack,
  parts = [],
  roman,
  note,
  size = 'md',
  layout = 'diagram',
  base,
  head,
  combiner,
  showRoles = true,
  highlightRoot = true,
  onPart,
  style,
  testID,
}: StackDiagramProps) {
  const baseGlyph = typeof base === 'string' ? base : base?.glyph;

  if (layout === 'additive') {
    return (
      <View style={[SPELL_ROW, style]} testID={testID}>
        <Cell width={ADDITIVE_COLS[0]}>
          <Piece glyph={baseGlyph} label={typeof base === 'string' ? undefined : base?.roman} />
        </Cell>
        <Cell width={ADDITIVE_COLS[1]}>
          <Text style={OPERATOR}>+</Text>
        </Cell>
        <Cell width={ADDITIVE_COLS[2]}>
          <View style={COMBINER}>
            {combiner?.bo ? (
              <TibetanText inline size="xs" textStyle={ACCENT_INK}>
                {combiner.bo}
              </TibetanText>
            ) : null}
            {combiner?.roman ? <Text style={COMBINER_ROMAN}>{combiner.roman}</Text> : null}
          </View>
        </Cell>
        <Cell width={ADDITIVE_COLS[3]}>
          <Text style={OPERATOR}>→</Text>
        </Cell>
        <Cell width={ADDITIVE_COLS[4]}>
          <View style={RESULT}>
            {stack ? (
              <TibetanText inline size="lg">
                {stack}
              </TibetanText>
            ) : null}
            <Text style={READING}>{roman}</Text>
          </View>
        </Cell>
      </View>
    );
  }

  if (layout === 'procedural') {
    return (
      <View style={[SPELL_ROW, style]} testID={testID}>
        <Cell width={PROCEDURAL_COLS[0]}>
          {stack ? (
            <TibetanText inline size="lg">
              {stack}
            </TibetanText>
          ) : null}
        </Cell>
        <Cell width={PROCEDURAL_COLS[1]}>
          {head ? <SyllableChip glyph={head} size="sm" /> : null}
        </Cell>
        <Cell width={PROCEDURAL_COLS[2]}>
          <Text style={OPERATOR}>→</Text>
        </Cell>
        <Cell width={PROCEDURAL_COLS[3]}>
          {baseGlyph ? <SyllableChip glyph={baseGlyph} size="sm" /> : null}
        </Cell>
        <Cell width={PROCEDURAL_COLS[4]}>
          {/* The reading, not the spelling: this is the whole point of the procedural
              form, so it is the one thing on the row carrying a fill. */}
          <Text numberOfLines={1} style={[READING, READING_PILL]}>
            {roman}
          </Text>
        </Cell>
      </View>
    );
  }

  return (
    <View style={[DIAGRAM, style]} testID={testID}>
      {stack ? (
        <TibetanText size={STACK_SIZE[size]} align="center" roman={roman}>
          {stack}
        </TibetanText>
      ) : null}
      <View style={PARTS}>
        {parts.map((part, index) => (
          <View key={index} style={PART}>
            {part.empty || !part.glyph ? (
              <View aria-hidden style={EMPTY_SLOT} />
            ) : (
              <SyllableChip
                glyph={part.glyph}
                size={CHIP_SIZE[size]}
                tone={part.tone ?? (highlightRoot && part.role === 'root' ? 'selected' : 'idle')}
                onPress={onPart ? () => onPart(part, index) : undefined}
              />
            )}
            {showRoles ? (
              <Text style={ROLE}>{part.label ?? (part.role ? ROLE_LABELS[part.role] : '')}</Text>
            ) : null}
          </View>
        ))}
      </View>
      {note ? <Text style={NOTE}>{note}</Text> : null}
    </View>
  );
}

/** One glyph with its name under it, for the additive row's base. */
function Piece({glyph, label}: {glyph?: string; label?: string}) {
  return (
    <View style={PIECE}>
      {glyph ? (
        <TibetanText inline size="lg">
          {glyph}
        </TibetanText>
      ) : null}
      {label ? <Text style={ROLE}>{label}</Text> : null}
    </View>
  );
}

/** A fixed column, or the flexible one when the width is `null`. */
function Cell({width, children}: {width: number | null; children?: ReactNode}) {
  return <View style={[CELL, width === null ? FLEX_CELL : {width}]}>{children}</View>;
}

/**
 * The spell-out row.
 *
 * The column widths ride on the cells rather than on the row, because React Native has no
 * `grid-template-columns` — the two templates above are the same shape stated as data, so a
 * reader can still see that they line up.
 */
const SPELL_ROW: ViewStyle = {
  width: '100%',
  flexDirection: 'row',
  alignItems: 'center',
};

const CELL: ViewStyle = {alignItems: 'center', justifyContent: 'center'};
const FLEX_CELL: ViewStyle = {flex: 1, minWidth: 0};

const DIAGRAM: ViewStyle = {width: '100%', alignItems: 'center', gap: space['3']};

const PARTS: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  alignItems: 'flex-start',
  gap: space['2h'],
};

const PART: ViewStyle = {alignItems: 'center', gap: 4};

const PIECE: ViewStyle = {alignItems: 'center', gap: 2};

const EMPTY_SLOT: ViewStyle = {
  width: SLOT.width,
  height: SLOT.height,
  borderRadius: radius.md,
  backgroundColor: color.ground200,
};

const COMBINER: ViewStyle = {
  alignItems: 'center',
  gap: 1,
  paddingVertical: space['2'],
  paddingHorizontal: space['3'],
  borderRadius: radius.md,
  backgroundColor: color.surfaceAccentSoft,
};

const RESULT: ViewStyle = {alignItems: 'center', gap: 2};

const ACCENT_INK: TextStyle = {color: color.teal700};

const OPERATOR: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize.lg,
  color: color.textSubtle,
};

const READING: TextStyle = {
  fontFamily: fontFamily.bodyBoldItalic,
  fontSize: fontSize.md,
  lineHeight: fontSize.md * leading.tight,
  color: color.textAccent,
};

const READING_PILL: TextStyle = {
  paddingVertical: space['1h'],
  paddingHorizontal: space['3'],
  borderRadius: radius.pill,
  backgroundColor: color.surfaceAccentSoft,
  overflow: 'hidden',
};

const COMBINER_ROMAN: TextStyle = {
  fontFamily: fontFamily.bodyMediumItalic,
  fontSize: fontSize['2xs'],
  lineHeight: fontSize['2xs'] * leading.tight,
  color: color.teal700,
};

const ROLE: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize['2xs'],
  lineHeight: fontSize['2xs'] * leading.tight,
  letterSpacing: CAPS_TRACKING,
  textTransform: 'uppercase',
  color: color.textSubtle,
  textAlign: 'center',
};

const NOTE: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * leading.latin,
  color: color.textMuted,
  textAlign: 'center',
};
