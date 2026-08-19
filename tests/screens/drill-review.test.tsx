/**
 * @fileoverview Q2/Q3 — mixed review: the provenance line on the answer band,
 * and the summary that marks the come-back list with the ring and closes on
 * practice. Real fixture through the container; expo-router mocked at the
 * module seam. Phases per docs/11.
 */

import {act, fireEvent, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Review from '../../app/drill/review';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import {addDays, toIsoDate} from '../../src/domain/date';
import {
  markTaught,
  newItem,
  recordCorrect,
  type ItemId,
  type ItemProgress,
} from '../../src/domain/item';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {AudioSource} from '../../src/ports';
import type {Progress, ProgressStore} from '../../src/ports/progress-store';
import type {SessionState} from '../../src/usecases/drill-plan';

import {useDrillSession} from '../../src/store/drill';
import {useProgress} from '../../src/store/progress';

const {back, push, replace} = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('expo-router', () => ({
  useRouter: () => ({back, push, replace}),
}));

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};
const TODAY = toIsoDate(new Date());

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

/** Known `daysAgo` back, so the first review interval fell due before today. */
function known(id: string, daysAgo: number): ItemProgress {
  return recordCorrect(
    recordCorrect(markTaught(newItem(id as ItemId)), addDays(TODAY, -daysAgo - 2)),
    addDays(TODAY, -daysAgo),
  );
}

/** Wait until the review session stands ready, then hand its state over. */
async function ready(): Promise<SessionState> {
  await waitFor(() => {
    expect(useDrillSession.getState().status).toBe('ready');
  });
  const state = useDrillSession.getState().state;
  if (state === null) {
    throw new Error('ready without a session state');
  }
  return state;
}

describe('the mixed review', () => {
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

  it('carries district provenance on the answer band', async () => {
    // Given — two known words fell due
    useProgress.setState({
      progress: {
        ...EMPTY,
        items: {
          'vocab.tashi-delek': known('vocab.tashi-delek', 6),
          'vocab.no': known('vocab.no', 3),
        },
      },
    });
    renderScreen(<Review />);
    const state = await ready();
    const entry = state.queue[0];
    const options =
      entry?.position.kind === 'exercise' ? (entry.options ?? entry.position.exercise.options) : [];
    const answerId = options.find(option => option.isAnswer)?.itemId ?? '';
    const answerEn = useDrillSession.getState().pool?.itemsById.get(answerId)?.en ?? '';

    // When — the right answer commits
    fireEvent.click(screen.getByText(answerEn));

    // Then — the band says why the item came back
    expect(await screen.findByText('you met it at First Words')).toBeTruthy();
  });

  it('closes on Q3 — the ring for the come-back list, and back to practice', async () => {
    // Given — the session stands at its end with one quiet miss recorded
    useProgress.setState({
      progress: {
        ...EMPTY,
        items: {
          'vocab.tashi-delek': known('vocab.tashi-delek', 6),
          'vocab.no': known('vocab.no', 3),
        },
      },
    });
    renderScreen(<Review />);
    const state = await ready();
    const firstExercise = state.queue.find(entry => entry.position.kind === 'exercise');
    const exercise =
      firstExercise?.position.kind === 'exercise' ? firstExercise.position.exercise : null;
    expect(exercise).not.toBeNull();
    if (exercise === null) {
      return;
    }
    act(() => {
      useDrillSession.setState({
        state: {
          ...state,
          index: state.queue.length - 1,
          answered: null,
          misses: [{itemId: 'vocab.no', exercise}],
        },
      });
    });

    // Then — what got firmer and what to come back to, never a score
    expect(await screen.findByText("That's the review")).toBeTruthy();
    expect(screen.getByText('Firmer now')).toBeTruthy();
    expect(screen.getByText('Come back to these')).toBeTruthy();
    expect(screen.getByText('hello / greetings')).toBeTruthy();
    expect(screen.getByText('no')).toBeTruthy();

    // When
    fireEvent.click(screen.getByText('Back to practice'));

    // Then — the loop closes on the practice root
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/practice');
    });
  });
});
