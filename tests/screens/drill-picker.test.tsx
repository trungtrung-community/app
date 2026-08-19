/**
 * @fileoverview The practice picker — counts in each mode's own unit, absence
 * under minimum fill, the empty-set register, and the 1–2 redirect. Real
 * fixture through the container; expo-router mocked at the module seam.
 * Phases per docs/11.
 */

import {fireEvent, screen, waitFor} from '@testing-library/react';
import {useEffect} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Picker from '../../app/(tabs)/practice/picker';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import {addDays, toIsoDate} from '../../src/domain/date';
import {
  markTaught,
  newItem,
  recordMiss,
  type ItemId,
  type ItemProgress,
} from '../../src/domain/item';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {AudioSource} from '../../src/ports';
import type {Progress, ProgressStore} from '../../src/ports/progress-store';

import {useDrillSession} from '../../src/store/drill';
import {useProgress} from '../../src/store/progress';

const {back, push, replace, params} = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  params: {pool: 'stop:stop.core.c1.1', entry: 'practice'} as Record<string, string>,
}));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => params,
  useRouter: () => ({back, push, replace}),
  useFocusEffect: (callback: () => void) => {
    // The test renders once and never blurs, so focus is mount.
    useEffect(callback, [callback]);
  },
}));

// A real Switch unmounted by a previous test leaves its Reanimated mapper
// registered under jsdom, and the next test's synchronous shared-value write
// runs that dead mapper into a dropped view ref. The switch's own animation is
// proven in its component test; here it is a control surface, so the seam
// keeps the semantics — role, label, checked, toggle — and drops the motion.
vi.mock('../../src/components/forms/switch', async () => {
  const {Pressable, Text} = await import('react-native');
  return {
    Switch: ({
      label,
      checked,
      onChange,
    }: {
      label: string;
      checked?: boolean;
      onChange?: (next: boolean) => void;
    }) => (
      <Pressable
        accessibilityRole="switch"
        aria-checked={checked ?? false}
        accessibilityLabel={label}
        onPress={onChange ? () => onChange(!(checked ?? false)) : undefined}
      >
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

/** The 12 items stop.core.c1.1 targets — 8 words, 4 phrases. */
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

describe('the practice picker', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    override('progress', memoryStore());
    override('audio', SILENT);
    useProgress.setState({progress: null});
    useDrillSession.getState().reset();
    params.pool = 'stop:stop.core.c1.1';
    params.entry = 'practice';
    delete params.selection;
    back.mockClear();
    push.mockClear();
    replace.mockClear();
  });

  it('draws each mode with its count in its own unit', async () => {
    // Given — the whole stop met
    useProgress.setState({progress: met(STOP_ITEMS)});

    // When
    renderScreen(<Picker />);

    // Then — cards, questions and boards all derive from the pool
    expect(await screen.findByText('12 cards')).toBeTruthy();
    expect(screen.getByText('Flashcards')).toBeTruthy();
    expect(screen.getByText('16 quest.')).toBeTruthy();
    expect(screen.getByText('Listen and pick')).toBeTruthy();
    expect(screen.getByText('4 quest.')).toBeTruthy();
    expect(screen.getByText('Listen and pick, phrases')).toBeTruthy();
    expect(screen.getByText('3 boards')).toBeTruthy();
    expect(screen.getByText('Match the pairs')).toBeTruthy();
    expect(screen.getByText('8 words · 4 phrases')).toBeTruthy();
  });

  it('omits pair-match below five distinct pairs, with no explanation', async () => {
    // Given — four items met, one under V13's board of five
    useProgress.setState({progress: met(STOP_ITEMS.slice(0, 4))});

    // When
    renderScreen(<Picker />);

    // Then — the mode is absent, not greyed, and nothing mentions it
    expect(await screen.findByText('4 cards')).toBeTruthy();
    expect(screen.queryByText('Match the pairs')).toBeNull();
    expect(screen.queryByText(/boards/)).toBeNull();
  });

  it('says an emptied set in one line, and the button is the switch turning off', async () => {
    // Given — everything met, nothing still getting
    useProgress.setState({progress: met(STOP_ITEMS)});
    params.selection = 'still-getting';

    // When
    renderScreen(<Picker />);

    // Then — one line, no counts
    expect(await screen.findByText("You're getting all of these")).toBeTruthy();
    expect(screen.queryByText(/cards/)).toBeNull();

    // When — the one way out
    fireEvent.click(screen.getByText('Practise all of it'));

    // Then — the pool unfiltered is the full picker again
    expect(await screen.findByText('12 cards')).toBeTruthy();
  });

  it('never shows the picker for a set of two — straight to flashcards', async () => {
    // Given
    useProgress.setState({progress: met(STOP_ITEMS.slice(0, 2))});

    // When
    renderScreen(<Picker />);

    // Then
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith(
        '/drill/flashcards?pool=stop:stop.core.c1.1&selection=all&entry=practice',
      );
    });
    expect(screen.queryByText('Flashcards')).toBeNull();
  });

  it('keeps the still-getting selection a live filter over the same pool', async () => {
    // Given — twelve met, three of them missed twice this week
    const today = toIsoDate(new Date());
    const progress = met(STOP_ITEMS);
    const still = STOP_ITEMS.slice(0, 3).map(id => [
      id,
      recordMiss(
        recordMiss(progress.items[id] as ItemProgress, addDays(today, -3)),
        addDays(today, -1),
      ),
    ]);
    useProgress.setState({
      progress: {...progress, items: {...progress.items, ...Object.fromEntries(still)}},
    });
    renderScreen(<Picker />);
    expect(await screen.findByText('12 cards')).toBeTruthy();

    // When
    fireEvent.click(screen.getByText("Only the ones I'm still getting"));

    // Then
    expect(await screen.findByText('3 cards')).toBeTruthy();
  });
});
