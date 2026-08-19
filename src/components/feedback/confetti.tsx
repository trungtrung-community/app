/**
 * @fileoverview Confetti — the one celebration the product allows itself.
 *
 * `docs/01`'s never-do list bans confetti with a single signed exception (07,
 * 2026-08-08): **S12, the moment a lesson stop completes, and nowhere else.** Not on a
 * card reveal, where a quiet arrival is the effect; not on drills, exams or reviews, which
 * are not stops. A stop is the narrative unit, which is the same reason it is the only
 * loop with a progress bar. Anything that mounts this on a second surface is breaking that
 * clause, not extending it.
 *
 * **Deliberately outside the design-system manifest** (07, 2026-08-18). The board has
 * never drawn confetti and structurally cannot: confetti is motion, and the board draws
 * states. That puts it in the same category as the cue layer — the part of the product the
 * design system has no way to express — rather than in the category of a component someone
 * forgot to add. If the DS ever ships a `Confetti` entry, this is its port and the name is
 * already right.
 *
 * No new dependency. Reanimated and the token palette were both already here.
 */

import {useEffect, useMemo} from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {duration, easing} from '../core/motion';
import {color, radius} from '../../theme/tokens.generated';

/**
 * The four colours, and why these four.
 *
 * Thosam picked three off a screenshot on 2026-08-18 — `#1f8a91`, `#f6a724`, `#80cbce` —
 * and every one of them was already a token, within a digit or two of what he read.
 * `beak600` is documented in the palette as *"beak orange — XP, rewards, highlights"*: the
 * reward colour, by name. `grass600` is the fourth, for spread, and it is the colour this
 * product already uses to mean *correct*.
 *
 * **`crown600` is deliberately absent.** `docs/04` fixes crown red as destructive-only,
 * and it is the family `--surface-alert` draws a wrong answer in — red falling at a
 * completion would argue with the band a learner saw thirty seconds earlier.
 *
 * The palette also carries `flagBlue/White/Red/Green/Yellow` — the prayer-flag five,
 * sky/air/fire/water/earth. Swapping this array for those is one line and needs no new
 * token, if the celebration ever wants to be more specifically of its place.
 */
const COLOURS = [color.teal600, color.beak600, color.teal300, color.grass600] as const;

/** Tuned by eye on a device from `/_ds/feel`. */
const PIECE_COUNT = 28;
const PIECE_SIZE = 9;
const FALL_MS = 1800;
/** The last piece starts this long after the first, so it arrives as a scatter. */
const STAGGER_MS = 420;
/** How far a piece may drift sideways on the way down, either way. */
const DRIFT = 90;
/** Half-turns over the fall. Whole numbers land flat, which reads as a stop rather than a settle. */
const SPINS = 2.5;
/** Where the pieces start, above the top edge. */
const RISE = 40;

/**
 * One piece's fixed character, decided once at mount.
 *
 * `useMemo` with no dependencies rather than state: these never change while a burst
 * runs, and recomputing them on a re-render would make every piece jump to a new place
 * mid-fall.
 */
type Piece = {
  readonly left: `${number}%`;
  readonly drift: number;
  readonly delay: number;
  readonly spin: number;
  readonly size: number;
  readonly colour: string;
  readonly round: boolean;
};

function makePieces(count: number): Piece[] {
  return Array.from({length: count}, (_, index) => ({
    // Spread across the width by index rather than at random, so no burst is ever
    // lopsided; the jitter below is what stops it reading as a comb.
    left: `${((index + 0.5) / count) * 100}%`,
    drift: (Math.random() * 2 - 1) * DRIFT,
    delay: Math.random() * STAGGER_MS,
    spin: (Math.random() * 2 - 1) * SPINS,
    size: PIECE_SIZE * (0.7 + Math.random() * 0.6),
    colour: COLOURS[index % COLOURS.length] as string,
    round: index % 3 === 0,
  }));
}

export type ConfettiProps = {
  /**
   * Called once the last piece has landed.
   *
   * The parent unmounts on this. There is no `playing` prop and no imperative handle:
   * mounting starts a burst and that is the whole API, which means a burst cannot be
   * accidentally restarted by a re-render.
   */
  onDone?: () => void;
  /** For tuning from `/_ds/feel`. Screens take the default. */
  count?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A burst of confetti over whatever it is mounted inside.
 *
 * Fills its parent and sits above it, so the parent needs no layout change to make room.
 * It never takes a touch — `pointerEvents` lives in the style object because
 * `check-adherence` bans the prop, which is deprecated and warns on every render.
 *
 * **Renders nothing under Reduce Motion.** Not a shortened burst and not a static
 * scatter: confetti with the motion removed is a flash of debris on the screen, which is
 * worse than the quiet arrival the product would otherwise have. `onDone` still fires, so
 * a screen waiting on it does not hang.
 *
 * @example {celebrating ? <Confetti onDone={() => setCelebrating(false)} /> : null}
 */
export function Confetti({onDone, count = PIECE_COUNT, style, testID}: ConfettiProps) {
  const reduced = useReducedMotion();
  const pieces = useMemo(() => (reduced ? [] : makePieces(count)), [count, reduced]);

  // Drives every piece. One shared value rather than one per piece: they differ by their
  // fixed character and their delay, not by their timeline.
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      onDone?.();
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, {duration: FALL_MS + STAGGER_MS, easing: easing.out});
    const settled = setTimeout(() => onDone?.(), FALL_MS + STAGGER_MS + duration.fast);
    return () => clearTimeout(settled);
    // Mount starts a burst; nothing restarts one. `onDone` is deliberately not a
    // dependency — a parent passing an inline arrow would otherwise re-run the whole fall
    // on every render of the screen it is celebrating.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  if (reduced) {
    return null;
  }

  return (
    <View aria-hidden style={[FIELD, style]} testID={testID}>
      {pieces.map((piece, index) => (
        <Fleck key={index} piece={piece} progress={progress} />
      ))}
    </View>
  );
}

/** One falling piece. */
function Fleck({piece, progress}: {piece: Piece; progress: SharedValue<number>}) {
  const animated = useAnimatedStyle(() => {
    // Each piece runs the same 0→1 shifted by its own delay, clamped at both ends, so a
    // late piece waits at the top rather than starting part-way down.
    const span = FALL_MS / (FALL_MS + STAGGER_MS);
    const start = piece.delay / (FALL_MS + STAGGER_MS);
    const t = Math.min(Math.max((progress.value - start) / span, 0), 1);

    return {
      opacity: progress.value === 0 ? 0 : 1 - t * t,
      transform: [
        {translateY: -RISE + t * (RISE + FIELD_FALL)},
        {translateX: t * piece.drift},
        {rotate: `${t * piece.spin * 180}deg`},
      ],
    };
  });

  return (
    <Animated.View
      style={[
        FLECK,
        {
          left: piece.left,
          width: piece.size,
          height: piece.size * 1.6,
          backgroundColor: piece.colour,
          borderRadius: piece.round ? radius.pill : radius.xs,
        },
        animated,
      ]}
    />
  );
}

/**
 * How far a piece falls.
 *
 * A fixed distance rather than the parent's measured height: the burst is meant to leave
 * the frame, and measuring the parent to fall exactly to its bottom edge would make every
 * piece stop dead on a line. Generous enough to clear a full-height screen.
 */
const FIELD_FALL = 900;

const FIELD: ViewStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflow: 'hidden',
  // In the style object, never as a prop — see the component's note.
  pointerEvents: 'none',
};

const FLECK: ViewStyle = {position: 'absolute', top: 0};
