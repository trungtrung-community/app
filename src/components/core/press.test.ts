/**
 * @fileoverview A keycap's footprint does not change when it is pressed.
 *
 * This is the test that would have caught the 2026-08-18 defect: `keycap()` returned a
 * `marginBottom` in its pressed state, so pressing any button, answer row, tile, chip or
 * rail node moved everything below it down by 2pt. It survived review because the property
 * was introduced *as* the fix for that problem, with a docstring arguing for it.
 *
 * So the assertion is deliberately about the shape of the returned style rather than about
 * a rendered position. jsdom performs no layout, and the component suite could not have
 * told the difference either — this is a property of the style object and is checkable
 * exactly there, in plain node.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {describe, expect, it} from 'vitest';

import {EDGE_DEPTH, EDGE_DEPTH_PRESSED, SINK, keycap, pressScale} from './press';

const EDGE = '#12595E';

/**
 * Everything React Native lays out with.
 *
 * A keycap may set none of these. `transform` and `boxShadow` are absent by design: both
 * are applied after layout, which is what makes them safe here.
 */
const LAYOUT_PROPERTIES = [
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginVertical',
  'marginHorizontal',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingVertical',
  'height',
  'minHeight',
  'top',
  'bottom',
  'position',
  'flex',
  'flexBasis',
] as const;

describe('keycap', () => {
  it('sets nothing that affects layout, in either state', () => {
    // When
    const resting = keycap(EDGE, false);
    const pressed = keycap(EDGE, true);

    // Then
    for (const property of LAYOUT_PROPERTIES) {
      expect(resting).not.toHaveProperty(property);
      expect(pressed).not.toHaveProperty(property);
    }
  });

  it('changes only the edge depth and the travel when pressed', () => {
    // When
    const changed = Object.keys({...keycap(EDGE, false), ...keycap(EDGE, true)});

    // Then
    expect(changed.sort()).toEqual(['boxShadow', 'transform']);
  });

  it('sinks the control by exactly what the edge loses, so its bottom stays put', () => {
    // Given
    const pressed = keycap(EDGE, true);

    // Then
    expect(SINK).toBe(EDGE_DEPTH - EDGE_DEPTH_PRESSED);
    expect(pressed?.transform).toEqual([{translateY: SINK}]);
  });

  it('draws the resting edge at full depth and the pressed edge shallower', () => {
    // Then
    expect(keycap(EDGE, false)?.boxShadow).toBe(`0 ${EDGE_DEPTH}px 0 0 ${EDGE}`);
    expect(keycap(EDGE, true)?.boxShadow).toBe(`0 ${EDGE_DEPTH_PRESSED}px 0 0 ${EDGE}`);
  });

  it('scales instead of sinking when the variant has no edge to sink onto', () => {
    // When
    const flat = keycap(null, true);

    // Then
    expect(flat).toBe(pressScale);

    // When
    const resting = keycap(null, false);

    // Then
    expect(resting).toBeNull();
  });
});
