/**
 * @fileoverview Restore (U3) and the conflict choice (U4), walked as flows.
 *
 * Renders the real route screen with port doubles through the container and
 * expo-router mocked at the module seam. The assertions are the docs/06 §2
 * policy: what the file holds is shown before anything is applied, garbage is
 * named in plain language, and a backup older than the device shows both
 * states — keeping the phone writes nothing, choosing the backup applies it.
 * The S1 entry's finish — the `onboardedOn` stamp and the journey landing —
 * is asserted here too, driven by the `?from=onboarding` param.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Restore from '../../app/(tabs)/you/restore';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import {markTaught, newItem, type ItemId} from '../../src/domain/item';
import type {BackupFiles} from '../../src/ports/backup-files';
import type {Progress, ProgressStore} from '../../src/ports/progress-store';
import {DEFAULT_SETTINGS, type Settings, type SettingsStore} from '../../src/ports/settings-store';

import {useProgress} from '../../src/store/progress';
import {useSettings} from '../../src/store/settings';

const {back, replace, params} = vi.hoisted(() => ({
  back: vi.fn(),
  replace: vi.fn(),
  params: {value: {} as {from?: string}},
}));
vi.mock('expo-router', () => ({
  useRouter: () => ({back, replace}),
  useLocalSearchParams: () => params.value,
}));

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

/** A walk two items and one stop deep, last walked on 12 July. */
const BACKUP: Progress = {
  walkedOn: ['2026-07-01', '2026-07-12'],
  items: {
    'vocab.tashi-delek': markTaught(newItem('vocab.tashi-delek' as ItemId)),
    'vocab.thukje-che': markTaught(newItem('vocab.thukje-che' as ItemId)),
  },
  completedStops: ['stop.core.c1.1'],
  version: 2,
};

/** A device that walked past the backup: newer day, more items, more stops. */
const DEVICE_AHEAD: Progress = {
  walkedOn: ['2026-07-01', '2026-07-12', '2026-08-18'],
  items: {
    ...BACKUP.items,
    'vocab.la-se': markTaught(newItem('vocab.la-se' as ItemId)),
  },
  completedStops: ['stop.core.c1.1', 'stop.core.c1.2'],
  version: 2,
};

/** Drains pending promise chains without a real timer. */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

/** A backup port double whose pick answer each test scripts. */
function fakeBackupFiles(picked: {name: string; contents: string} | null): BackupFiles {
  return {
    async writeAndShare() {},
    async pick() {
      return picked;
    },
  };
}

/** A progress store double that records saves, so "nothing applied" is assertable. */
function fakeProgressStore(initial: Progress): ProgressStore & {saved: () => Progress[]} {
  const saves: Progress[] = [];
  return {
    async load() {
      return saves.at(-1) ?? initial;
    },
    async save(next) {
      saves.push(next);
    },
    async export() {
      return JSON.stringify(saves.at(-1) ?? initial);
    },
    async clear() {},
    saved: () => saves,
  };
}

/** A settings store double that records saves, so the onboarding stamp is assertable. */
function fakeSettingsStore(initial: Settings): SettingsStore & {saved: () => Settings[]} {
  const saves: Settings[] = [];
  return {
    async load() {
      return initial;
    },
    async save(next) {
      saves.push(next);
    },
    saved: () => saves,
  };
}

/** A picked file whose contents are the given progress, serialised as U2 writes it. */
function pickedBackup(progress: Progress): {name: string; contents: string} {
  return {name: 'trungtrung-walk-2026-07-12.json', contents: JSON.stringify(progress)};
}

let store: ReturnType<typeof fakeProgressStore>;
let settings: ReturnType<typeof fakeSettingsStore>;

beforeEach(() => {
  resetContainer();
  store = fakeProgressStore(EMPTY);
  settings = fakeSettingsStore(DEFAULT_SETTINGS);
  override('progress', store);
  override('settings', settings);
  override('backup', fakeBackupFiles(pickedBackup(BACKUP)));
  useProgress.setState({progress: null});
  useSettings.setState({settings: null});
  params.value = {};
  back.mockClear();
  replace.mockClear();
});

describe('the restore screen', () => {
  it('stays at the file door when the pick is cancelled', async () => {
    // Given
    override('backup', fakeBackupFiles(null));
    renderScreen(<Restore />);

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Choose a backup file'}));
    await flushMicrotasks();

    // Then
    expect(screen.getByRole('button', {name: 'Choose a backup file'})).toBeTruthy();
    expect(store.saved()).toEqual([]);
  });

  it('shows what the file holds before anything is applied', async () => {
    // Given
    renderScreen(<Restore />);

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Choose a backup file'}));

    // Then
    expect(await screen.findByText('This file holds')).toBeTruthy();
    expect(
      screen.getByText(/2 days walking · 2 words and phrases · 1 stops completed/),
    ).toBeTruthy();
    expect(screen.getByText('Last walked 2026-07-12.')).toBeTruthy();
    expect(store.saved()).toEqual([]);
  });

  it('names a file that could not be read at all', async () => {
    // Given
    override('backup', fakeBackupFiles({name: 'holiday.json', contents: 'not json {{{'}));
    renderScreen(<Restore />);

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Choose a backup file'}));

    // Then
    expect(await screen.findByText(/This file could not be read/)).toBeTruthy();
    expect(store.saved()).toEqual([]);
  });

  it('names a readable file that was never a backup', async () => {
    // Given
    override('backup', fakeBackupFiles({name: 'notes.json', contents: '{"shopping":["tea"]}'}));
    renderScreen(<Restore />);

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Choose a backup file'}));

    // Then
    expect(await screen.findByText(/it is not a Trungtrung backup/)).toBeTruthy();
    expect(store.saved()).toEqual([]);
  });

  it('applies a backup the device has not walked past, and confirms', async () => {
    // Given
    renderScreen(<Restore />);
    fireEvent.click(screen.getByRole('button', {name: 'Choose a backup file'}));
    await screen.findByText('This file holds');

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Restore this'}));

    // Then
    expect(await screen.findByText('Your walk is back on this phone.')).toBeTruthy();
    expect(store.saved()).toEqual([BACKUP]);
    expect(useProgress.getState().progress).toEqual(BACKUP);
  });

  it('shows both states for a backup older than the device, applying nothing', async () => {
    // Given
    store = fakeProgressStore(DEVICE_AHEAD);
    override('progress', store);
    renderScreen(<Restore />);
    fireEvent.click(screen.getByRole('button', {name: 'Choose a backup file'}));
    await screen.findByText('This file holds');

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Restore this'}));

    // Then
    expect(await screen.findByText(/one of them wins/)).toBeTruthy();
    expect(screen.getByText('On this phone')).toBeTruthy();
    expect(screen.getByText('In the backup')).toBeTruthy();
    expect(store.saved()).toEqual([]);
  });

  it('leaves progress untouched when the learner keeps the phone', async () => {
    // Given
    store = fakeProgressStore(DEVICE_AHEAD);
    override('progress', store);
    renderScreen(<Restore />);
    fireEvent.click(screen.getByRole('button', {name: 'Choose a backup file'}));
    await screen.findByText('This file holds');
    fireEvent.click(screen.getByRole('button', {name: 'Restore this'}));
    await screen.findByText(/one of them wins/);

    // When
    fireEvent.click(screen.getByRole('button', {name: "Keep what's on this phone"}));
    await flushMicrotasks();

    // Then
    expect(store.saved()).toEqual([]);
    expect(back).toHaveBeenCalled();
  });

  it('applies the backup when the learner chooses it over the phone', async () => {
    // Given
    store = fakeProgressStore(DEVICE_AHEAD);
    override('progress', store);
    renderScreen(<Restore />);
    fireEvent.click(screen.getByRole('button', {name: 'Choose a backup file'}));
    await screen.findByText('This file holds');
    fireEvent.click(screen.getByRole('button', {name: 'Restore this'}));
    await screen.findByText(/one of them wins/);

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Use the backup'}));

    // Then
    expect(await screen.findByText('Your walk is back on this phone.')).toBeTruthy();
    expect(store.saved()).toEqual([BACKUP]);
    expect(useProgress.getState().progress).toEqual(BACKUP);
  });

  it('stamps onboardedOn on a restore from S1, and Done lands on the journey', async () => {
    // Given
    params.value = {from: 'onboarding'};
    renderScreen(<Restore />);
    fireEvent.click(screen.getByRole('button', {name: 'Choose a backup file'}));
    await screen.findByText('This file holds');

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Restore this'}));
    await screen.findByText('Your walk is back on this phone.');
    fireEvent.click(screen.getByRole('button', {name: 'Done'}));

    // Then
    expect(settings.saved().at(-1)?.onboardedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(replace).toHaveBeenCalledWith('/journey');
  });
});
