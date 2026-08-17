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
