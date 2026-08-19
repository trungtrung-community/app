/**
 * @fileoverview The motion tokens, in the form Reanimated wants.
 *
 * The design system states its easings as CSS `cubic-bezier()` strings, which is their
 * native form and what the board consumes directly. Reanimated wants four numbers. So
 * the strings are parsed here, once, rather than four control points being retyped into
 * every component that moves — which is how a curve drifts from the token that named it.
 *
 * Parsing at runtime rather than emitting numbers from `sync-design` is deliberate: the
 * vendored token CSS stays the single source, and the web target still reads the string.
 * If a curve ever needs to be a number at build time, that is a change to the generator.
 *
 * `--ease-settle` is the one with an overshoot — its second control point is y=1.4, so it
 * passes its target and comes back. `docs/04` allows exactly one soft overshoot and no
 * wobble, which is what a single cubic bezier can express and a spring cannot.
 */

import {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  type EasingFunctionFactory,
} from 'react-native-reanimated';

import {motion} from '../../theme/tokens.generated';

/** `cubic-bezier(a, b, c, d)` → the four control points. */
const CUBIC_BEZIER =
  /^cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/;

/**
 * A token's curve as a Reanimated easing.
 *
 * Throws rather than falling back to linear. A silently-linear easing is invisible in a
 * screenshot and would survive every review; a throw at module load is found once.
 */
function bezier(token: string): EasingFunctionFactory {
  const points = CUBIC_BEZIER.exec(token)?.slice(1).map(Number) ?? [];
  // Both halves matter: four control points, and none of them NaN. A `0` default in place
  // of this check would turn an unparsed curve into a valid-looking linear one.
  if (points.length !== 4 || points.some(Number.isNaN)) {
    throw new Error(`Not a cubic-bezier token: ${token}`);
  }
  const [x1, y1, x2, y2] = points as [number, number, number, number];
  return Easing.bezier(x1, y1, x2, y2);
}

export const easing = {
  out: bezier(motion.easeOut),
  inOut: bezier(motion.easeInOut),
  /** One soft overshoot. For a thing arriving at rest, never for a thing leaving. */
  settle: bezier(motion.easeSettle),
};

/**
 * Hold a progress value inside [0, 1], on the UI thread.
 *
 * `easing.settle` deliberately overshoots, which is right for something travelling to a
 * stop and wrong for a colour: `interpolateColor` extrapolates rather than clamps, so an
 * unclamped 1.08 produces a colour past the end of the range — one that is not in the
 * palette, for about 60ms, which no screenshot would ever catch.
 */
export function clamp01(value: number): number {
  'worklet';
  return Math.min(Math.max(value, 0), 1);
}

/** Durations in milliseconds, which is already what the generated tokens hold. */
export const duration = {
  instant: motion.durInstant,
  fast: motion.durFast,
  base: motion.durBase,
  slow: motion.durSlow,
  /** The rail's draw-on. Far longer than the rest, and used by exactly one component. */
  rail: motion.durRail,
};

/**
 * How something arrives and leaves, as layout animations.
 *
 * The reason these are here rather than written at each use: Reanimated's builders are
 * chainable, so `FadeIn.duration(220).easing(...).reduceMotion(...)` is three decisions
 * restated every time one is wanted, and they would drift the way four hand-typed control
 * points drift. A preset is the same argument as the rest of this file, applied one level
 * up.
 *
 * `.easing()` takes the token factory directly — `EasingFunction | EasingFunctionFactory`
 * — so these curves are the same objects every component's `withTiming` already uses.
 *
 * `ReduceMotion.System` is Reanimated's default and is written out anyway. The point of a
 * preset is that the accessibility decision travels with it; leaving it implicit would
 * make the next preset, written by copying this one, a coin toss.
 *
 * **A fade, not a slide.** Travel is available — `FadeInDown`, `SlideInRight` — and is a
 * per-surface decision about where a thing came from, which is exactly the kind of thing
 * a default should not answer. `leave` is quicker than `arrive` and does not move: a
 * thing on its way out has nowhere to be, and moving it draws the eye to the exit rather
 * than to what replaced it.
 *
 * @example <Animated.View entering={arrive} exiting={leave} />
 */
export const arrive = FadeIn.duration(duration.base)
  .easing(easing.out)
  .reduceMotion(ReduceMotion.System);

export const leave = FadeOut.duration(duration.fast)
  .easing(easing.out)
  .reduceMotion(ReduceMotion.System);
