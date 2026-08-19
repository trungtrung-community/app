/**
 * @fileoverview Your data (U1) and the backup export behind its row (U2).
 *
 * Renders the real route screen with store and backup-port doubles through the
 * container, expo-router mocked at the module seam. The assertions are the
 * board's rules: the local-only truth stated first, the export reaching the
 * share door under the dated human name, the restore door one push away, and
 * the delete door still guarded by its dialog. The `your data` tests that
 * lived in `you.test.tsx` moved here when the screen became U1.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import YourData from '../../app/(tabs)/you/data';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import type {BackupFiles} from '../../src/ports/backup-files';
import type {Progress, ProgressStore} from '../../src/ports/progress-store';

import {useProgress} from '../../src/store/progress';

const {push} = vi.hoisted(() => ({push: vi.fn()}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push}),
}));

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

/** Drains pending promise chains without a real timer. */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

/** A progress store double with real export/clear behaviour over an in-memory record. */
function fakeProgressStore(initial: Progress): ProgressStore {
  let stored = initial;
  return {
    async load() {
      return stored;
    },
    async save(next) {
      stored = next;
    },
    async export() {
      return JSON.stringify(stored, null, 2);
    },
    async clear() {
      stored = EMPTY;
    },
  };
}

/** A backup port double that records what reached the share door. */
function fakeBackupFiles(): BackupFiles & {shared: () => {name: string; contents: string}[]} {
  const calls: {name: string; contents: string}[] = [];
  return {
    async writeAndShare(name, contents) {
      calls.push({name, contents});
    },
    async pick() {
      return null;
    },
    shared: () => calls,
  };
}

let store: ProgressStore;
let files: ReturnType<typeof fakeBackupFiles>;

beforeEach(() => {
  resetContainer();
  store = fakeProgressStore({...EMPTY, walkedOn: ['2026-08-17']});
  files = fakeBackupFiles();
  override('progress', store);
  override('backup', files);
  useProgress.setState({progress: null});
  push.mockClear();
});

describe('the your data screen', () => {
  it('states the local-only truth before any door', () => {
    // When
    renderScreen(<YourData />);

    // Then
    expect(
      screen.getByText(/Your walk is saved on this device\. Nothing is sent anywhere\./),
    ).toBeTruthy();
  });

  it('hands the export to the share door under the dated backup name', async () => {
    // Given
    renderScreen(<YourData />);

    // When
    fireEvent.click(screen.getByRole('button', {name: /^Make a backup/}));
    await flushMicrotasks();

    // Then
    expect(files.shared()).toHaveLength(1);
    expect(files.shared()[0]?.name).toMatch(/^Trungtrung backup — \d{4}-\d{2}-\d{2}\.json$/);
    expect(files.shared()[0]?.contents).toBe(await store.export());
  });

  it('echoes the shared file by name once the sheet has been handed the backup', async () => {
    // Given
    renderScreen(<YourData />);

    // When
    fireEvent.click(screen.getByRole('button', {name: /^Make a backup/}));

    // Then
    expect(await screen.findByText(/^Trungtrung backup — .*\.json$/)).toBeTruthy();
    expect(screen.getByText(/Backup ready/)).toBeTruthy();
  });

  it('says the backup could not be made when the share door fails, changing nothing', async () => {
    // Given
    override('backup', {
      async writeAndShare() {
        throw new Error('no sheet');
      },
      async pick() {
        return null;
      },
    });
    renderScreen(<YourData />);

    // When
    fireEvent.click(screen.getByRole('button', {name: /^Make a backup/}));

    // Then
    expect(await screen.findByText(/could not be made/)).toBeTruthy();
    expect(screen.queryByText(/Backup ready/)).toBeNull();
  });

  it('opens the restore screen from its own row', () => {
    // Given
    renderScreen(<YourData />);

    // When
    fireEvent.click(screen.getByRole('button', {name: /^Restore from a backup/}));

    // Then
    expect(push).toHaveBeenCalledWith('/you/restore');
  });

  it('clears progress after the dialog is confirmed', async () => {
    // Given — the confirm footer sits inside Dialog's entering animation, whose
    // CSS keyframes jsdom never runs, so its subtree stays computed-hidden and
    // is found by text rather than by accessible role name.
    renderScreen(<YourData />);
    fireEvent.click(screen.getByRole('button', {name: /^Delete everything/}));

    // When
    fireEvent.click(await screen.findByText('Clear'));
    await flushMicrotasks();

    // Then
    expect(useProgress.getState().progress).toEqual(EMPTY);
  });
});
