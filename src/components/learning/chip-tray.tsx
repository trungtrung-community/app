/**
 * @fileoverview ChipTray — the chip-arrange surface (E8 · order what you heard).
 *
 * The phrase's own **chunks** — words, cut at the settled boundaries and never at the tsheg
 * — sit in a tray, and the learner taps them into the answer row. Ordering syllables would
 * drill spelling rhythm rather than word order, which is why O2 settled on chunks in 2026-08-08.
 * Multi-part, so it commits on Check.
 *
 * **The tray may hold chips that belong nowhere.** `slots` is then the authority on how many
 * places the answer row has, and the tray is free to be longer: pass `slots={answer.length +
 * empties}`, not the chip count.
 *
 * **A decoy left in the tray at Check is not an error and carries no marking.** It sits in
 * its ordinary idle tone, because leaving it there was right. A decoy the learner *placed*
 * slides back to the tray, and the band names why.
 *
 * Two rules belong to whoever fills the tray and cannot be enforced here. The decoys are two
 * chunks from another phrase in the same district, differing in *meaning*. And a copula may
 * be a chip but may never be a decoy — 295 of the 403 chunked phrases carry one, so the
 * learner reproduces the copula they just heard rather than choosing an evidential.
 * `validate.py` rule 16b fails the content build on both.
 */

import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {advanceUnits} from '../../domain/tibetan';
import {
  color,
  fontFamily,
  fontSize,
  leading,
  radius,
  space,
  tracking,
} from '../../theme/tokens.generated';
import {SyllableChip} from './syllable-chip';

/** A slot's floor, and the points one advance unit takes at the chip's own size. */
const SLOT_MIN = 64;
const SLOT_PADDING = 32;
const SLOT_PER_UNIT = 13;

/**
 * The height of a filled `md` chip, which is what an empty slot has to match.
 *
 * A drawn number rather than a derived one: `SyllableChip`'s height comes out of its
 * padding, the Tibetan line box at 2.1 leading and the romanization under it, and deriving
 * it here would make an empty slot silently resize when any of those move.
 */
const SLOT_HEIGHT = 76;

/** `--tracking-caps` in points at the label's size. */
const CAPS_TRACKING = parseFloat(tracking.caps) * fontSize['2xs'];

export type TrayChip = {
  glyph: string;
  /** The Trungtrung romanization. */
  roman?: string;
  /** Marks a chunk that slid to its right place on reveal. */
  slid?: boolean;
};

/** Where a picked chip came from. The two lists index from zero independently. */
export type ChipOrigin = 'answer' | 'tray';

/**
 * The widest chunk in play, in points.
 *
 * A slot has to hold the longest chunk without the row reflowing when a chip lands in it,
 * so it is sized by advance units — a stack is one position wide however many letters are
 * piled into it.
 *
 * @example chunkSlotWidth([{glyph: 'ཡང་བསྐྱར་'}, {glyph: 'ག་ལེར་'}])
 */
export function chunkSlotWidth(chips: readonly TrayChip[]): number {
  const longest = chips.reduce((widest, chip) => Math.max(widest, advanceUnits(chip.glyph)), 0);
  return Math.max(SLOT_MIN, SLOT_PADDING + longest * SLOT_PER_UNIT);
}

export type ChipTrayProps = {
  /** The chunks the learner has placed, in the order they placed them. */
  answer?: readonly TrayChip[];
  /** Everything still unplaced, decoys included. */
  tray?: readonly TrayChip[];
  /** How many places the answer row has. Defaults to every chip in play. */
  slots?: number;
  /** Overrides the width derived from the longest chunk. */
  slotWidth?: number;
  answerLabel?: string;
  trayLabel?: string;
  /**
   * A chip was tapped.
   *
   * `origin` is not in the design system's signature and is added here because the two lists
   * both index from zero: `(chip, 0)` alone cannot say whether the learner took a chunk out
   * of the answer or put one in.
   */
  onPick?: (chip: TrayChip, index: number, origin: ChipOrigin) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The arrange surface.
 *
 * @example
 * <ChipTray answer={placed} tray={remaining} slots={4} onPick={move} />
 */
export function ChipTray({
  answer = [],
  tray = [],
  slots,
  slotWidth,
  answerLabel = 'In the order you heard',
  trayLabel = 'Still in the tray',
  onPick,
  style,
  testID,
}: ChipTrayProps) {
  const total = slots ?? answer.length + tray.length;
  const empties = Math.max(total - answer.length, 0);
  const width = slotWidth ?? chunkSlotWidth([...answer, ...tray]);

  return (
    <View style={[TRAY, style]} testID={testID}>
      <Text style={LABEL}>{answerLabel}</Text>
      <View style={[CHIP_ROW, ANSWER_ROW]}>
        {answer.map((chip, index) => (
          <SyllableChip
            key={`a${index}`}
            glyph={chip.glyph}
            roman={chip.roman}
            // `selected` is borrowed for its fill, not its meaning: the app moved this
            // chunk on reveal. It is deliberately not `correct`, which would credit the
            // learner with a placement the app made for them.
            tone={chip.slid ? 'selected' : 'idle'}
            style={{minWidth: width}}
            onPress={onPick ? () => onPick(chip, index, 'answer') : undefined}
          />
        ))}
        {Array.from({length: empties}, (_, index) => (
          <View key={`s${index}`} aria-hidden style={[SLOT, {width}]} />
        ))}
      </View>
      {tray.length ? <Text style={[LABEL, SUBTLE]}>{trayLabel}</Text> : null}
      {tray.length ? (
        <View style={CHIP_ROW}>
          {tray.map((chip, index) => (
            <SyllableChip
              key={`t${index}`}
              glyph={chip.glyph}
              roman={chip.roman}
              onPress={onPick ? () => onPick(chip, index, 'tray') : undefined}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const TRAY: ViewStyle = {width: '100%', gap: space['3']};

const CHIP_ROW: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: space['2'],
  justifyContent: 'center',
};

const ANSWER_ROW: ViewStyle = {alignItems: 'center'};

const SLOT: ViewStyle = {
  height: SLOT_HEIGHT,
  borderRadius: radius.md,
  backgroundColor: color.surfaceSunken,
};

const LABEL: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize['2xs'],
  lineHeight: fontSize['2xs'] * leading.tight,
  letterSpacing: CAPS_TRACKING,
  textTransform: 'uppercase',
  textAlign: 'center',
  color: color.textMuted,
};

const SUBTLE: TextStyle = {color: color.textSubtle};
