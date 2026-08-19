/**
 * @fileoverview Restore, tested with hand-built progress and a fake store.
 *
 * The fake `ProgressStore` records what was saved, so `applyBackup` is asserted
 * on stored state rather than on calls — same reasoning as the MMKV adapter's
 * fake key/value store.
 */

import {describe, expect, it} from 'vitest';

import {isoDate} from '../domain/date';
import {markTaught, newItem, recordCorrect, type ItemId, type ItemProgress} from '../domain/item';
import {PROGRESS_VERSION} from '../domain/progress-migration';
import type {Progress, ProgressStore} from '../ports/progress-store';
import {applyBackup, compareBackup, parseBackup, summariseBackup} from './restore-progress';

class FakeProgressStore implements ProgressStore {
  saved: Progress | null = null;

  async load(): Promise<Progress> {
    return this.saved ?? progress({});
  }

  async save(next: Progress): Promise<void> {
    this.saved = next;
  }

  async export(): Promise<string> {
    return JSON.stringify(await this.load(), null, 2);
  }

  async clear(): Promise<void> {
    this.saved = null;
  }
}

function progress(overrides: Partial<Progress>): Progress {
  return {walkedOn: [], items: {}, completedStops: [], version: PROGRESS_VERSION, ...overrides};
}

/** An item the learner has been taught, and nothing more. */
function metItem(id: string): ItemProgress {
  return markTaught(newItem(id as ItemId));
}

/** An item answered correctly on two days, which is what makes it known. */
function knownItem(id: string): ItemProgress {
  const once = recordCorrect(metItem(id), isoDate('2026-08-01'));
  return recordCorrect(once, isoDate('2026-08-02'));
}

describe('parseBackup', () => {
  it('round-trips what export writes', () => {
    // Given
    const backup = progress({
      walkedOn: ['2026-08-01', '2026-08-02'],
      items: {greeting: knownItem('greeting')},
      completedStops: ['greetings-1'],
    });
    const text = JSON.stringify(backup, null, 2);

    // When
    const parsed = parseBackup(text);

    // Then
    expect(parsed).toEqual({progress: backup});
  });

  it('reports unreadable for text that is not JSON', () => {
    // When
    const parsed = parseBackup('{not json');

    // Then
    expect(parsed).toEqual({error: 'unreadable'});
  });

  it('reports not-a-backup for JSON that was never a progress record', () => {
    // When
    const parsed = parseBackup(JSON.stringify({shoppingList: ['tsampa']}));

    // Then
    expect(parsed).toEqual({error: 'not-a-backup'});
  });

  it('migrates an old backup on the way in', () => {
    // Given
    const text = JSON.stringify({walkedOn: ['2026-08-01'], items: {}, version: 1});

    // When
    const parsed = parseBackup(text);

    // Then
    expect(parsed).toEqual({
      progress: progress({walkedOn: ['2026-08-01']}),
    });
  });
});

describe('summariseBackup', () => {
  it('counts days, met items and done stops, and names the newest day', () => {
    // Given
    const backup = progress({
      walkedOn: ['2026-08-01', '2026-08-03', '2026-08-02'],
      items: {
        tea: newItem('tea' as ItemId),
        hello: metItem('hello'),
        thanks: knownItem('thanks'),
      },
      completedStops: ['greetings-1', 'greetings-2'],
    });

    // When
    const summary = summariseBackup(backup);

    // Then
    expect(summary).toEqual({
      daysWalking: 3,
      itemsMet: 2,
      stopsDone: 2,
      newestDay: '2026-08-03',
    });
  });

  it('answers null for the newest day of a backup with no walked days', () => {
    // When
    const summary = summariseBackup(progress({}));

    // Then
    expect(summary.newestDay).toBeNull();
  });
});

describe('compareBackup', () => {
  it('calls the backup newer when it walked more recently', () => {
    // Given
    const device = progress({walkedOn: ['2026-08-01']});
    const backup = progress({walkedOn: ['2026-08-01', '2026-08-05']});

    // Then
    expect(compareBackup(device, backup)).toBe('backup-newer');
  });

  it('calls the backup older when the device walked more recently', () => {
    // Given
    const device = progress({walkedOn: ['2026-08-05']});
    const backup = progress({walkedOn: ['2026-08-01']});

    // Then
    expect(compareBackup(device, backup)).toBe('backup-older');
  });

  it('calls two identical states equal', () => {
    // Given
    const state = progress({walkedOn: ['2026-08-01'], completedStops: ['greetings-1']});

    // Then
    expect(compareBackup(state, state)).toBe('equal');
  });

  it('breaks a same-day tie by item count', () => {
    // Given
    const device = progress({walkedOn: ['2026-08-01']});
    const backup = progress({walkedOn: ['2026-08-01'], items: {hello: metItem('hello')}});

    // Then
    expect(compareBackup(device, backup)).toBe('backup-newer');
  });

  it('breaks a same-day same-items tie by stop count', () => {
    // Given
    const device = progress({walkedOn: ['2026-08-01'], completedStops: ['greetings-1']});
    const backup = progress({walkedOn: ['2026-08-01']});

    // Then
    expect(compareBackup(device, backup)).toBe('backup-older');
  });

  it('treats a side with no walked days as the older one', () => {
    // Given
    const device = progress({});
    const backup = progress({walkedOn: ['2026-08-01']});

    // Then
    expect(compareBackup(device, backup)).toBe('backup-newer');
  });
});

describe('applyBackup', () => {
  it('saves the backup and hands it back for the caller to apply', async () => {
    // Given
    const store = new FakeProgressStore();
    const backup = progress({walkedOn: ['2026-08-01'], completedStops: ['greetings-1']});

    // When
    const applied = await applyBackup({store}, backup);

    // Then
    expect(store.saved).toEqual(backup);
    expect(applied).toBe(backup);
  });
});
