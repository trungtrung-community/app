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

/**
 * The bottom margin that keeps a keycap control's footprint constant.
 *
 * Without it the layout jumps: the control sinks 2pt but its box still reserves the
 * full 4pt edge, so everything below it shifts.
 */
export function edgeReserve(pressed: boolean): number {
  return EDGE_DEPTH - (pressed ? EDGE_DEPTH_PRESSED : EDGE_DEPTH);
}

/** How far a keycap travels: exactly what its edge loses. */
export const SINK = EDGE_DEPTH - EDGE_DEPTH_PRESSED;

/**
 * A keycap control's whole press behaviour: the edge, the travel, and the reserve.
 *
 * The three have to move together or the footprint changes, which is why they are one
 * function rather than three exports. Button, SyllableChip, LetterTile, AnswerChoice and
 * RailNode all draw this edge; the design system's own sources animate the shadow and the
 * transform but not the margin, so on the board those controls do shift what is under them
 * by 2pt. Here they do not.
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
    marginBottom: pressed ? SINK : 0,
  };
}
