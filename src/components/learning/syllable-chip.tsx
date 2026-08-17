/**
 * @fileoverview SyllableChip — one tappable Tibetan letter, stack or syllable.
 *
 * The atom of the drills and of the word bank. `LetterTile` is its square sibling for the
 * Read track's browsing; this is the inline chip that sits in a tray.
 *
 * The glyph goes through `TibetanText` like every other Tibetan string in the system. The
 * design system's own source had a hand-set `lang="bo"` span here until 2026-08-16, which
 * put 83 mounts of this component outside the rule — worth remembering as the reason the
 * rule is enforced by lint rather than by intent.
 *
 * `roman` is the Trungtrung romanization. It was called `wylie` until 2026-08-09, a name
 * that never matched what any frame passed it.
 */

import {Pressable, Text, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {keycap} from '../core/press';
import {color, fontFamily, fontSize, radius, space} from '../../theme/tokens.generated';
import {TibetanText, type TibetanSize} from './tibetan-text';

/** Fill, ink and edge per state. `muted` has no edge — it is not offering to be pressed. */
const TONES = {
  idle: {fill: color.surfaceCard, ink: color.textHeading, edge: color.ground300},
  selected: {fill: color.teal600, ink: color.textOnAccent, edge: color.teal800},
  correct: {fill: color.grass100, ink: color.grass600, edge: color.grass600},
  wrong: {fill: color.crown100, ink: color.crown600, edge: color.crown600},
  muted: {fill: color.ground200, ink: color.textSubtle, edge: null},
} as const;

const SIZES = {
  sm: {padV: space['2'], padH: space['3h'], tib: 'sm'},
  md: {padV: space['2h'], padH: space['4'], tib: 'md'},
  lg: {padV: space['3h'], padH: space['6'], tib: 'lg'},
} as const satisfies Record<string, {padV: number; padH: number; tib: TibetanSize}>;

export type SyllableChipTone = keyof typeof TONES;
export type SyllableChipSize = keyof typeof SIZES;

export type SyllableChipProps = {
  glyph: string;
  /** The Trungtrung romanization, set small and italic under the glyph. */
  roman?: string;
  tone?: SyllableChipTone;
  size?: SyllableChipSize;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A chip carrying one Tibetan unit.
 *
 * @example <SyllableChip glyph="ཀྲ" roman="tra" onPress={pick} />
 * @example <SyllableChip glyph="སྐུ" tone="correct" />
 */
export function SyllableChip({
  glyph,
  roman,
  tone = 'idle',
  size = 'md',
  onPress,
  style,
  testID,
}: SyllableChipProps) {
  const {fill, ink, edge} = TONES[tone];
  const {padV, padH, tib} = SIZES[size];

  return (
    <Pressable
      accessibilityRole="button"
      // The romanization is the name: a screen reader reading the glyph itself produces
      // either silence or nonsense, which is the whole reason TibetanText carries `roman`.
      accessibilityLabel={roman}
      aria-selected={tone === 'selected'}
      disabled={!onPress}
      onPress={onPress}
      style={({pressed}) => [
        CHIP,
        {backgroundColor: fill, paddingVertical: padV, paddingHorizontal: padH},
        keycap(edge, pressed && Boolean(onPress)),
        style,
      ]}
      testID={testID}
    >
      {/* `textStyle` rather than a colour class: the ink changes with the tone, and a
          computed class name is a class Tailwind never generated. */}
      <TibetanText inline size={tib} unit="letter" textStyle={{color: ink}}>
        {glyph}
      </TibetanText>
      {roman ? <Text style={[ROMAN, {color: ink}]}>{roman}</Text> : null}
    </Pressable>
  );
}

const CHIP: ViewStyle = {
  alignSelf: 'flex-start',
  alignItems: 'center',
  borderRadius: radius.md,
};

const ROMAN: TextStyle = {
  fontFamily: fontFamily.bodyMediumItalic,
  fontSize: fontSize['2xs'],
  opacity: 0.75,
  marginTop: -2,
};
