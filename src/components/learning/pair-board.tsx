/**
 * @fileoverview PairBoard — V13, match the pairs.
 *
 * Five Tibetan tiles — script, romanization and a play control each — against five English
 * tiles, shuffled. Clear the board.
 *
 * **No timer, no combo, no score.** A right pair clears; a wrong pair shakes once, neutrally,
 * and stays. The board just empties, which is the whole feedback: a matching game that kept
 * score would turn a vocabulary check into a reflex test, and this one is about whether the
 * learner knows the words.
 *
 * `wrong` is the one-shake moment and is not a resting state — a caller sets it, lets the
 * shake play, and clears it back to `idle`. The tile does not go red, because the pair being
 * wrong is not a failure, it is a turn.
 */

import {Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {color, elevation, fontFamily, fontSize, radius, space} from '../../theme/tokens.generated';
import {AudioButton} from './audio-button';
import {TibetanText} from './tibetan-text';

/**
 * Fill and edge per tile state.
 *
 * `cleared` keeps the tile in place at reduced strength rather than removing it, so the
 * board does not reflow under the learner's finger mid-game.
 */
const TILES = {
  idle: {fill: color.surfaceCard, edge: elevation.edgeGround, faded: false},
  selected: {fill: color.surfaceAccentSoft, edge: elevation.edgeAccent, faded: false},
  cleared: {fill: color.surfaceSunken, edge: null, faded: true},
  wrong: {fill: color.surfaceSunken, edge: null, faded: false},
} as const;

export type PairTileState = keyof typeof TILES;

const TILE_MIN_HEIGHT = 62;
const CLEARED_OPACITY = 0.45;

/** How far a wrong tile shifts. One nudge, held by the caller for one beat. */
const SHAKE = 4;

export type PairTibetanTile = {
  bo: string;
  /** The Trungtrung romanization. */
  roman?: string;
  state?: PairTileState;
};

export type PairEnglishTile = {
  en: string;
  state?: PairTileState;
};

/** Which column a tap came from. The two columns index from zero independently. */
export type PairSide = 'left' | 'right';

export type PairBoardProps = {
  left?: readonly PairTibetanTile[];
  right?: readonly PairEnglishTile[];
  onPick?: (side: PairSide, index: number) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The matching board.
 *
 * @example <PairBoard left={tibetan} right={english} onPick={pick} />
 */
export function PairBoard({left = [], right = [], onPick, style, testID}: PairBoardProps) {
  return (
    <View style={[BOARD, style]} testID={testID}>
      <View style={COLUMN}>
        {left.map((tile, index) => {
          const state = tile.state ?? 'idle';
          const cleared = state === 'cleared';
          return (
            // The tile is a View holding two separate targets, not one Pressable holding
            // the other. A play control nested inside a pressable tile is a button inside
            // a button: invalid on web, and on a device it makes the tile's own press
            // compete with the one control the learner is most likely to be reaching for.
            <View key={index} style={[tileStyle(state), TIBETAN_TILE]}>
              <Pressable
                accessibilityRole="button"
                // The romanization names the tile: a screen reader given the glyph alone
                // produces either silence or nonsense.
                accessibilityLabel={tile.roman}
                aria-selected={state === 'selected'}
                disabled={cleared || !onPick}
                onPress={onPick ? () => onPick('left', index) : undefined}
                style={TIBETAN_COPY}
              >
                <TibetanText inline unit="word" size="xs">
                  {tile.bo}
                </TibetanText>
                {tile.roman ? (
                  // Hidden: it is already the tile's accessible name.
                  <Text aria-hidden style={ROMAN}>
                    {tile.roman}
                  </Text>
                ) : null}
              </Pressable>
              {cleared ? null : <AudioButton size="sm" />}
            </View>
          );
        })}
      </View>
      <View style={COLUMN}>
        {right.map((tile, index) => {
          const state = tile.state ?? 'idle';
          return (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={tile.en}
              aria-selected={state === 'selected'}
              disabled={state === 'cleared' || !onPick}
              onPress={onPick ? () => onPick('right', index) : undefined}
              style={[tileStyle(state), ENGLISH_TILE]}
            >
              <Text style={ENGLISH}>{tile.en}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function tileStyle(state: PairTileState): ViewStyle {
  const {fill, edge, faded} = TILES[state];
  return {
    ...TILE,
    backgroundColor: fill,
    ...(edge ? {boxShadow: edge} : null),
    ...(faded ? {opacity: CLEARED_OPACITY} : null),
    ...(state === 'wrong' ? {transform: [{translateX: SHAKE}]} : null),
  };
}

const BOARD: ViewStyle = {
  width: '100%',
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: space['3'],
};

/** Equal halves: neither script nor English is the column being matched *against*. */
const COLUMN: ViewStyle = {flex: 1, gap: space['3']};

const TILE: ViewStyle = {
  width: '100%',
  minHeight: TILE_MIN_HEIGHT,
  paddingVertical: space['2h'],
  paddingHorizontal: space['3'],
  borderRadius: radius.md,
};

const TIBETAN_TILE: ViewStyle = {flexDirection: 'row', alignItems: 'center', gap: space['2']};
const TIBETAN_COPY: ViewStyle = {flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 1};

const ENGLISH_TILE: ViewStyle = {alignItems: 'center', justifyContent: 'center'};

const ROMAN: TextStyle = {
  fontFamily: fontFamily.bodyMediumItalic,
  fontSize: fontSize.xs,
  lineHeight: fontSize.xs * 1.3,
  color: color.textAccent,
};

const ENGLISH: TextStyle = {
  fontFamily: fontFamily.bodySemibold,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * 1.3,
  color: color.textHeading,
  textAlign: 'center',
};
