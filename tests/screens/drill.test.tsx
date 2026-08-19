/**
 * @fileoverview The drill runner — the counter that grows on Again, the x
 * that leaves with no dialog, and the summary whose label follows the entry.
 * Real fixture through the container; expo-router mocked at the module seam.
 * The FlashCard's flip is design-system motion, not runner behaviour, so the
 * seam renders its faces as plain text. Phases per docs/11.
 */

import {fireEvent, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Drill from '../../app/drill/[mode]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import {markTaught, newItem, type ItemId, type ItemProgress} from '../../src/domain/item';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {AudioSource} from '../../src/ports';
import type {Progress, ProgressStore} from '../../src/ports/progress-store';

import {useDrillSession} from '../../src/store/drill';
import {useProgress} from '../../src/store/progress';

const {back, push, replace, params} = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  params: {
    mode: 'flashcards',
    pool: 'stop:stop.core.c1.1',
    selection: 'all',
    entry: 'practice',
  } as Record<string, string>,
}));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => params,
  useRouter: () => ({back, push, replace}),
}));

// The card's flip is the design system's motion, proven on the specimen page;
// the runner's behaviour is which face and which item, said here as text.
vi.mock('../../src/components/learning/flash-card', async () => {
  const {Text, View} = await import('react-native');
  return {
    FlashCard: ({face, bo, en}: {face?: string; bo?: string; en?: string}) => (
      <View>
        <Text>{face === 'back' ? `back: ${en}` : `front: ${bo}`}</Text>
      </View>
    ),
  };
});

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

const STOP_ITEMS = [
  'vocab.tashi-delek',
  'vocab.i-am-doing-well',
  'vocab.good-night',
  'vocab.fortunately',
  'vocab.to-have-a-conversation',
  'vocab.no',
  'vocab.very',
  'vocab.when',
  'phrase.core.dont-understand',
  'phrase.core.excuse-me',
  'phrase.core.say-again-slowly',
  'phrase.core.please-talk-slowly',
] as const;

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

function met(ids: readonly string[]): Progress {
  const items: Record<string, ItemProgress> = {};
  for (const id of ids) {
    items[id] = markTaught(newItem(id as ItemId));
  }
  return {...EMPTY, items};
}

describe('the drill runner', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    override('progress', memoryStore());
    override('audio', SILENT);
    useProgress.setState({progress: null});
    useDrillSession.getState().reset();
    params.mode = 'flashcards';
    params.pool = 'stop:stop.core.c1.1';
    params.selection = 'all';
    params.entry = 'practice';
    back.mockClear();
    push.mockClear();
    replace.mockClear();
  });

  it('grows the counter when Again re-queues, and never shrinks it', async () => {
    // Given — the whole stop as a deck
    useProgress.setState({progress: met(STOP_ITEMS)});
    renderScreen(<Drill />);
    expect(await screen.findByText('1 of 12')).toBeTruthy();

    // When — the card turns and the learner asks to see it again
    fireEvent.click(screen.getByText('Turn over'));
    fireEvent.click(await screen.findByText('Again'));

    // Then — the total grew by exactly one and the counter moved on
    expect(await screen.findByText('2 of 13')).toBeTruthy();
  });

  it('leaves immediately on x — no dialog, ratings kept', async () => {
    // Given
    useProgress.setState({progress: met(STOP_ITEMS)});
    renderScreen(<Drill />);
    await screen.findByText('1 of 12');

    // When
    fireEvent.click(screen.getByLabelText('Leave the drill'));

    // Then — one tap, straight out, nothing asked
    expect(back).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/leave/i)).toBeNull();
  });

  it('closes on the summary, whose label returns where the drill was entered', async () => {
    // Given — a two-card deck entered from the district
    useProgress.setState({progress: met(STOP_ITEMS.slice(0, 3))});
    params.entry = 'district';
    renderScreen(<Drill />);
    expect(await screen.findByText('1 of 3')).toBeTruthy();

    // When — one Again, then Got it through to the end
    fireEvent.click(screen.getByText('Turn over'));
    fireEvent.click(await screen.findByText('Again'));
    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(await screen.findByText('Turn over'));
      fireEvent.click(await screen.findByText('Got it'));
    }

    // Then — the summary, the quiet come-back block, and the entry-aware door
    expect(await screen.findByText("That's the set")).toBeTruthy();
    expect(screen.getByText('1 to come back to')).toBeTruthy();
    expect(screen.getByText('Practise again')).toBeTruthy();
    expect(screen.queryByTestId('drill-counter')).toBeNull();
    const door = screen.getByText('Back to the district');

    // When
    fireEvent.click(door);

    // Then
    await waitFor(() => {
      expect(back).toHaveBeenCalledTimes(1);
    });
  });

  it('labels the door for the worth-another-look entry', async () => {
    // Given — a one-card deck entered from Q5
    useProgress.setState({progress: met(STOP_ITEMS.slice(0, 1))});
    params.entry = 'still-getting';
    renderScreen(<Drill />);

    // When
    fireEvent.click(await screen.findByText('Turn over'));
    fireEvent.click(await screen.findByText('Got it'));

    // Then
    expect(await screen.findByText('Back to Worth another look')).toBeTruthy();
  });
});
