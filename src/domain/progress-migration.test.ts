/**
 * @fileoverview The migration cases, moved here from the MMKV adapter's test when
 * the migration moved into the domain.
 *
 * The store's own test keeps the store-level behaviours (leave corrupt bytes
 * alone, map an unreadable value to empty); this suite owns what counts as a
 * migratable record and what counts as garbage.
 */

import {describe, expect, it} from 'vitest';

import {migrateProgress, PROGRESS_VERSION} from './progress-migration';

describe('migrateProgress', () => {
  it('gives a version-1 record an empty completed-stops list', () => {
    // Given
    const stored = {walkedOn: ['2026-08-01'], items: {}, version: 1};

    // When
    const migrated = migrateProgress(stored);

    // Then
    expect(migrated).toEqual({
      walkedOn: ['2026-08-01'],
      items: {},
      completedStops: [],
      version: PROGRESS_VERSION,
    });
  });

  it('carries an unversioned record forward as version 0', () => {
    // Given
    const stored = {walkedOn: ['2026-08-01'], items: {}};

    // When
    const migrated = migrateProgress(stored);

    // Then
    expect(migrated?.walkedOn).toEqual(['2026-08-01']);
    expect(migrated?.completedStops).toEqual([]);
    expect(migrated?.version).toBe(PROGRESS_VERSION);
  });

  it('returns a current-version record untouched', () => {
    // Given
    const stored = {walkedOn: [], items: {}, completedStops: ['greetings-1'], version: 2};

    // When
    const migrated = migrateProgress(stored);

    // Then
    expect(migrated).toBe(stored);
  });

  it('answers null for values that were never a progress record', () => {
    // Then
    expect(migrateProgress(42)).toBeNull();
    expect(migrateProgress('progress')).toBeNull();
    expect(migrateProgress(null)).toBeNull();
    expect(migrateProgress(undefined)).toBeNull();
    expect(migrateProgress([])).toBeNull();
    expect(migrateProgress({foo: 'bar'})).toBeNull();
  });

  it('answers null when a required field has the wrong kind', () => {
    // Then
    expect(migrateProgress({walkedOn: 'not-a-list', items: {}})).toBeNull();
    expect(migrateProgress({walkedOn: [1, 2], items: {}})).toBeNull();
    expect(migrateProgress({walkedOn: [], items: []})).toBeNull();
    expect(migrateProgress({walkedOn: [], items: {}, version: 'two'})).toBeNull();
    expect(migrateProgress({walkedOn: [], items: {}, completedStops: 'none'})).toBeNull();
  });
});
