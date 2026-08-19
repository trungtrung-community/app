/**
 * @fileoverview previousDistrict — the listed district a given one follows,
 * decided against the list so numbering gaps do not lock the walk. Phases per
 * docs/11.
 */

import {describe, expect, it} from 'vitest';

import {previousDistrict} from './district';

describe('previousDistrict', () => {
  it('spans a numbering gap: 14 follows 12 when 13 is not listed', () => {
    // Given
    const districts = [{number: 12}, {number: 14}, {number: 15}];

    // When
    const previous = previousDistrict(districts, 14);

    // Then
    expect(previous).toEqual({number: 12});
  });

  it('picks the highest number strictly below, never the district itself', () => {
    // Given
    const districts = [{number: 3}, {number: 1}, {number: 2}];

    // When
    const previous = previousDistrict(districts, 3);

    // Then
    expect(previous).toEqual({number: 2});
  });

  it('answers null for the lowest-numbered district', () => {
    // Given
    const districts = [{number: 1}, {number: 2}];

    // When
    const previous = previousDistrict(districts, 1);

    // Then
    expect(previous).toBeNull();
  });
});
