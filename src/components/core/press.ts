/**
 * @fileoverview The press gesture, in one place.
 *
 * The system has two press behaviours and no third. A flat control scales down by
 * `--press-scale`; a control with a solid keycap edge sinks by `--press-translate`
 * onto that edge and the edge shrinks to match. Nine components need one or the
 * other, and nine local copies of the numbers would drift.
 */

import type {ViewStyle} from 'react-native';

import {elevation, motion} from '../../theme/tokens.generated';

/** Flat controls: cards, tags, icon buttons. */
export const pressScale: ViewStyle = {transform: [{scale: motion.pressScale}]};

/**
 * Keycap controls: the primary buttons.
 *
 * The control moves down by the difference between the resting and pressed edge, so
 * its top face travels and its bottom stays put — the edge compresses rather than the
 * whole control sliding.
 */
export const pressSink: ViewStyle = {transform: [{translateY: motion.pressTranslate}]};

/** Resting and pressed depth of the keycap edge, in points. */
export const EDGE_DEPTH = elevation.edgeDepth;
export const EDGE_DEPTH_PRESSED = elevation.edgeDepthPressed;

/** How far a keycap travels: exactly what its edge loses. */
export const SINK = EDGE_DEPTH - EDGE_DEPTH_PRESSED;

/**
 * A keycap control's whole press behaviour: the edge and the travel.
 *
 * **Neither of the two properties below touches layout, and that is the entire point.**
 * A `boxShadow` is painted outside the box, and a `transform` is applied after layout has
 * run. So a keycap's footprint is constant across its states by construction, and every
 * control under it holds still while it is pressed.
 *
 * That is worth stating plainly because this function carried a third property until
 * 2026-08-18 — `marginBottom: pressed ? SINK : 0` — added to keep the footprint constant.
 * Margin *is* layout, so it was the only thing here that could move anything, and it moved
 * everything below a pressed button down by 2pt. The docstring justifying it had the fact
 * exactly backwards: it claimed the design system's own sources shift their surroundings
 * because they animate the shadow and the transform but not the margin. Those two are
 * precisely the ones that cannot shift anything. Found by pressing a button on a phone.
 *
 * `edgeReserve()` went with it. It computed the same number for the same wrong reason and
 * nothing ever imported it.
 *
 * The 4pt edge therefore sits in whatever gap the parent already provides, which is what
 * the board does too. A control flush against the next element would have its edge
 * overlapped — no layout in the product does that, and `docs/04` already requires a docked
 * CTA to reserve its own height plus a gap.
 *
 * `boxShadow` carries geometry and colour in one string, so the edge colour arrives as a
 * value rather than a class.
 *
 * @example style={({pressed}) => [keycap(color.teal800, pressed), style]}
 */
export function keycap(edge: string | null, pressed: boolean): ViewStyle | null {
  if (edge === null) {
    return pressed ? pressScale : null;
  }
  return {
    boxShadow: `0 ${pressed ? EDGE_DEPTH_PRESSED : EDGE_DEPTH}px 0 0 ${edge}`,
    transform: [{translateY: pressed ? SINK : 0}],
  };
}
