/**
 * @fileoverview Q5 — the worth-another-look list: the set's rows, the missed
 * line, and the one docked action handing the same set to the flashcard
 * runner. Real fixture through the container; expo-router mocked at the
 * module seam. Phases per docs/11.
 */

import {fireEvent, screen} from '@testing-library/react';
import {useEffect} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import StillGetting from '../../app/(tabs)/practice/still-getting';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import {addDays, toIsoDate} from '../../src/domain/date';
import {markTaught, newItem, recordMiss, type ItemId} from '../../src/domain/item';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {AudioSource} from '../../src/ports';
import type {Progress, ProgressStore} from '../../src/ports/progress-store';

import {useDrillSession} from '../../src/store/drill';
import {useProgress} from '../../src/store/progress';

const {back, push, replace} = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('expo-router', () => ({
  useRouter: () => ({back, push, replace}),
  useFocusEffect: (callback: () => void) => {
    // The test renders once and never blurs, so focus is mount.
    useEffect(callback, [callback]);
  },
}));

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

const SILENT: AudioSource = {
  resolve: async () => null,
  isAvailable: async () => false,
};

function memoryStore(): ProgressStore {
  let last = EMPTY;
  return {
    async load() {
      return last;
    },
    async save(progress) {
      last = progress;
    },
    async export() {
      return '';
    },
    async clear() {
      last = EMPTY;
    },
  };
}

describe('the worth-another-look list', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    override('progress', memoryStore());
    override('audio', SILENT);
    useProgress.setState({progress: null});
    useDrillSession.getState().reset();
    back.mockClear();
    push.mockClear();
    replace.mockClear();
  });

  it('lists the still-getting items with the missed line, framed as information', async () => {
    // Given — two taught words, each missed twice inside the window
    const today = toIsoDate(new Date());
    const still = (id: string) =>
      recordMiss(
        recordMiss(markTaught(newItem(id as ItemId)), addDays(today, -3)),
        addDays(today, -1),
      );
    useProgress.setState({
      progress: {
        ...EMPTY,
        items: {'vocab.tashi-delek': still('vocab.tashi-delek'), 'vocab.no': still('vocab.no')},
      },
    });

    // When
    renderScreen(<StillGetting />);

    // Then — the rows, the scope line and the missed line
    expect(await screen.findByText('Worth another look')).toBeTruthy();
    expect(await screen.findByText('trashi delek')).toBeTruthy();
    expect(screen.getByText('lakmin')).toBeTruthy();
    expect(screen.getByText('2 words, across 1 district.')).toBeTruthy();
    expect(screen.getAllByText('Met 2 times, not yet yours').length).toBe(2);
  });

  it('hands the same set to the flashcard runner from the docked action', async () => {
    // Given
    const today = toIsoDate(new Date());
    const still = recordMiss(
      recordMiss(markTaught(newItem('vocab.tashi-delek' as ItemId)), addDays(today, -3)),
      addDays(today, -1),
    );
    useProgress.setState({
      progress: {...EMPTY, items: {'vocab.tashi-delek': still}},
    });
    renderScreen(<StillGetting />);
    const practise = await screen.findByText('Practise these 1');

    // When
    fireEvent.click(practise);

    // Then
    expect(push).toHaveBeenCalledWith(
      '/drill/flashcards?pool=everything&selection=still-getting&entry=still-getting',
    );
  });
});
