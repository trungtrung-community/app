/**
 * @fileoverview LetterTile — the glyph in a square.
 *
 * The atom of the Read track's browsing and drills. Its five states are the whole vocabulary
 * of knowing a letter: learned, not yet, selected while answering, and the two results.
 *
 * Tiles are sized so the 2.1 Tibetan leading fits without clipping, and the board's numbers
 * are kept because measurement says they are right. At 22pt Noto Serif Tibetan *declares* a
 * 62pt line box, but that is the room it reserves for the tallest stack it could ever be
 * asked to draw: real ink is much smaller — `ཀ` is 25.3pt and `བསྒྲིབས`, one of the tallest
 * stacks in the language, is 33.5pt. Both sit inside 2.1 leading's 46.2pt box with room
 * over, so a tile at the drawn size clips nothing.
 *
 * Provisioning the full declared box instead was tried, and it is worse: it adds 24pt of
 * blank space between the glyph and its romanization, which reads as a mistake.
 *
 * `base` names the letter a stack was built from, and it is not decoration: without it a
 * stack grid is unreadable. ར་བཏགས་ alone produces tra three times, thra three times and
 * thraa three times, and nothing else on the tile says which base made which.
 */

import {Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {keycap} from '../core/press';
import {color, fontFamily, fontSize, radius, space} from '../../theme/tokens.generated';
import {TibetanText, type TibetanSize} from './tibetan-text';

const STATES = {
  learned: {fill: color.surfaceCard, ink: color.textTibetan, edge: color.ground300},
  notYet: {fill: color.ground050, ink: color.textSubtle, edge: null},
  selected: {fill: color.teal600, ink: color.textOnAccent, edge: color.teal800},
  correct: {fill: color.grass100, ink: color.grass600, edge: color.grass600},
  wrong: {fill: color.crown100, ink: color.crown600, edge: color.crown600},
} as const;

/**
 * Each size's box, glyph size, romanization size and corner.
 *
 * The board states a fixed box per size. Here the box is the larger of that number and what
 * the glyph actually needs — see the note at the top of the file.
 */
const SIZES = {
  sm: {drawn: 52, tib: 'sm', roman: fontSize['2xs'], corner: radius.sm},
  md: {drawn: 64, tib: 'md', roman: fontSize.xs, corner: radius.md},
  lg: {drawn: 84, tib: 'lg', roman: fontSize.sm, corner: radius.lg},
  xl: {drawn: 116, tib: 'xl', roman: fontSize.md, corner: radius.xl},
  hero: {drawn: 168, tib: 'hero', roman: fontSize.lg, corner: radius.sheet},
} as const satisfies Record<
  string,
  {drawn: number; tib: TibetanSize; roman: number; corner: number}
>;

export type LetterTileState = keyof typeof STATES;
export type LetterTileSize = keyof typeof SIZES;

export type LetterTileProps = {
  glyph: string;
  /** The Trungtrung romanization. Becomes the tile's accessible name. */
  roman?: string;
  /** The base letter a stack was built from, shown in brackets. */
  base?: string;
  /** A line under the tile, outside the box. */
  caption?: string;
  state?: LetterTileState;
  size?: LetterTileSize;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** How much wider than the tile a caption may run. */
const CAPTION_OVERHANG = 36;

/**
 * A square tile carrying one glyph.
 *
 * @example <LetterTile glyph="ཀ" roman="ka" onPress={open} />
 * @example <LetterTile glyph="ཀྲ" roman="tra" base="ཀ" size="lg" state="selected" />
 */
export function LetterTile({
  glyph,
  roman,
  base,
  caption,
  state = 'learned',
  size = 'md',
  onPress,
  style,
  testID,
}: LetterTileProps) {
  const {fill, ink, edge} = STATES[state];
  const {drawn, tib, roman: romanSize, corner} = SIZES[size];

  // The board's own box. Measured rather than assumed: at 22pt the tallest real stack's
  // ink is 33.5pt against a 46.2pt line box, so 2.1 leading has room to spare and the tile
  // does not need inflating. See the note at the top of the file.
  const box = drawn;

  return (
    <View className="items-center gap-2" style={style} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={roman}
        aria-selected={state === 'selected'}
        disabled={!onPress}
        onPress={onPress}
        style={({pressed}) => [
          TILE,
          {
            width: box,
            minHeight: box,
            borderRadius: corner,
            backgroundColor: fill,
            paddingVertical: roman || base ? space['1'] : 0,
          },
          keycap(edge, pressed && Boolean(onPress)),
        ]}
      >
        <TibetanText inline size={tib} textStyle={{color: ink}}>
          {glyph}
        </TibetanText>
        {roman ? <Text style={[ROMAN, {fontSize: romanSize, color: ink}]}>{roman}</Text> : null}
        {base ? (
          // Bracketed rather than labelled: on a tile there is no room for the word
          // "from", and the brackets read the same in every language.
          <View className="flex-row items-baseline" style={BASE_ROW}>
            <Text style={[BASE, {color: ink}]}>(</Text>
            <TibetanText inline size="xs" textStyle={{color: ink}}>
              {base}
            </TibetanText>
            <Text style={[BASE, {color: ink}]}>)</Text>
          </View>
        ) : null}
      </Pressable>
      {caption ? (
        <Text style={[CAPTION, {maxWidth: box + CAPTION_OVERHANG}]}>{caption}</Text>
      ) : null}
    </View>
  );
}

const TILE: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: space['2'],
};

const ROMAN: TextStyle = {
  fontFamily: fontFamily.bodyMediumItalic,
  opacity: 0.75,
};

const BASE_ROW: ViewStyle = {gap: 1};

const BASE: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize['2xs'],
  opacity: 0.55,
};

const CAPTION: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize['2xs'],
  color: color.textSubtle,
  textAlign: 'center',
};
