/**
 * @fileoverview Keeping a tooltip bubble on the screen. Pure arithmetic, so it can be tested.
 *
 * Split out of the component because it is the whole of the fix and none of the rendering.
 * The bubble is centred on its trigger with a `-50%` transform, so a trigger near either
 * gutter puts half of it past the edge — reported from a device on 2026-08-18, where the
 * gallery's own specimen lays its triggers out at `flex-start` and a wide label ran off the
 * left.
 *
 * React Native has no `position: fixed` and no way to escape an ancestor, so there is no
 * CSS answer: the only fix is to measure where the trigger actually is and shift the bubble
 * back by the overflow. That measurement is a platform call; this file is what it feeds.
 */

/** What a measured trigger and bubble look like, in window coordinates. */
export type Placement = {
  /** The trigger's left edge and width, from `measureInWindow`. */
  readonly triggerX: number;
  readonly triggerWidth: number;
  /** The trigger's top edge and height. */
  readonly triggerY: number;
  readonly triggerHeight: number;
  /** The bubble's own measured size. */
  readonly bubbleWidth: number;
  readonly bubbleHeight: number;
  readonly windowWidth: number;
  readonly windowHeight: number;
};

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

/**
 * How far off the screen edge the bubble is allowed to sit.
 *
 * A bubble flush against the glass reads as clipped even when it is whole, and on a device
 * with rounded corners it can be.
 */
export const EDGE_MARGIN = 8;

/**
 * The sideways nudge that keeps a top/bottom bubble on screen, in points.
 *
 * Zero whenever the bubble already fits, which is the common case — the correction only
 * appears near an edge. A bubble wider than the screen is centred rather than pinned to one
 * side, because pinning would hide its far end with no way to reach it.
 *
 * @example horizontalShift({triggerX: 20, triggerWidth: 60, bubbleWidth: 200, …})  // +58
 */
export function horizontalShift(placement: Placement): number {
  const {triggerX, triggerWidth, bubbleWidth, windowWidth} = placement;
  if (bubbleWidth + EDGE_MARGIN * 2 >= windowWidth) {
    return (windowWidth - bubbleWidth) / 2 - (triggerX + triggerWidth / 2 - bubbleWidth / 2);
  }
  const centred = triggerX + triggerWidth / 2 - bubbleWidth / 2;
  const clamped = Math.min(Math.max(centred, EDGE_MARGIN), windowWidth - bubbleWidth - EDGE_MARGIN);
  return clamped - centred;
}

/**
 * The side the bubble actually gets, which is the asked-for one unless it does not fit.
 *
 * Only `top` and `bottom` flip. A `left` or `right` tooltip that does not fit is a caller
 * putting a hint on the wrong side of a control at the screen edge, and silently moving it
 * above the control would put it somewhere the learner is not looking. `horizontalShift`
 * still keeps it on screen.
 */
export function resolveSide(side: TooltipSide, placement: Placement): TooltipSide {
  const {triggerY, triggerHeight, bubbleHeight, windowHeight} = placement;
  const needed = bubbleHeight + EDGE_MARGIN;
  if (side === 'top' && triggerY < needed) {
    return 'bottom';
  }
  if (side === 'bottom' && windowHeight - (triggerY + triggerHeight) < needed) {
    return 'top';
  }
  return side;
}
