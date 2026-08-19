/**
 * @fileoverview A tooltip bubble stays on the screen.
 *
 * The defect this defends was reported from a device: a bubble centred on a trigger near
 * the left gutter hung half off the screen. Nothing in the component measured anything, so
 * there was nothing to be wrong — the fix is arithmetic, and arithmetic is testable without
 * a screen, which is why it lives in its own module rather than inside the component.
 *
 * A 390-wide window throughout: an iPhone's logical width, and the size the design system's
 * own frame is drawn at.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {describe, expect, it} from 'vitest';

import {EDGE_MARGIN, horizontalShift, resolveSide, type Placement} from './tooltip-position';

const WINDOW_WIDTH = 390;
const WINDOW_HEIGHT = 844;

function placement(overrides: Partial<Placement> = {}): Placement {
  return {
    triggerX: 160,
    triggerY: 400,
    triggerWidth: 60,
    triggerHeight: 32,
    bubbleWidth: 200,
    bubbleHeight: 40,
    windowWidth: WINDOW_WIDTH,
    windowHeight: WINDOW_HEIGHT,
    ...overrides,
  };
}

/** Where the bubble's left edge ends up: centred on the trigger, plus the correction. */
function left(place: Placement): number {
  return place.triggerX + place.triggerWidth / 2 - place.bubbleWidth / 2 + horizontalShift(place);
}

describe('horizontalShift', () => {
  it('leaves a bubble alone when it already fits', () => {
    // When
    const shift = horizontalShift(placement());

    // Then
    expect(shift).toBe(0);
  });

  it('pushes a bubble back on screen at the left gutter', () => {
    // The reported case: the gallery lays its triggers out at flex-start, so a wide label
    // on a narrow tag was centred at x=50 and started 50 points off the left edge.

    // Given
    const place = placement({triggerX: 20, triggerWidth: 60});

    // When
    const shift = horizontalShift(place);

    // Then
    expect(shift).toBeGreaterThan(0);
    expect(left(place)).toBe(EDGE_MARGIN);
  });

  it('pulls a bubble back on screen at the right gutter', () => {
    // Given
    const place = placement({triggerX: 350, triggerWidth: 30});

    // When
    const shift = horizontalShift(place);

    // Then
    expect(shift).toBeLessThan(0);
    expect(left(place) + place.bubbleWidth).toBe(WINDOW_WIDTH - EDGE_MARGIN);
  });

  it('centres a bubble too wide for the screen instead of pinning one end off it', () => {
    // Pinning to an edge would put the far end past the other edge, where nothing can
    // reach it. Centred, the loss is shared and the middle of the label is readable.

    // Given
    const place = placement({bubbleWidth: 440, triggerX: 20, triggerWidth: 40});

    // Then
    expect(left(place)).toBe((WINDOW_WIDTH - 440) / 2);
  });
});

describe('resolveSide', () => {
  it('keeps the side it was asked for when there is room', () => {
    // Then
    expect(resolveSide('top', placement())).toBe('top');
    expect(resolveSide('bottom', placement())).toBe('bottom');
  });

  it('flips a top bubble under the trigger when it would go off the top', () => {
    // When
    const side = resolveSide('top', placement({triggerY: 10}));

    // Then
    expect(side).toBe('bottom');
  });

  it('flips a bottom bubble above the trigger when it would go off the bottom', () => {
    // When
    const side = resolveSide('bottom', placement({triggerY: 800}));

    // Then
    expect(side).toBe('top');
  });

  it('never moves a left or right bubble to another axis', () => {
    // A side hint that has no room is the caller putting it on the wrong side of a control
    // at the screen edge. Silently lifting it above the control would put it where the
    // learner is not looking; the horizontal correction still keeps it on screen.

    // Then
    expect(resolveSide('left', placement({triggerY: 0}))).toBe('left');
    expect(resolveSide('right', placement({triggerY: 840}))).toBe('right');
  });
});
