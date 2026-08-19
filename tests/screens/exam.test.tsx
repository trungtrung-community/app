/**
 * @fileoverview X1–X5 — the exam as thin configuration over the drill machine:
 * the declinable gate, the sampled paper with counter-only chrome, the
 * count-only section result, the final test's one percentage surface, and the
 * P4·x dialog whose Leave drops the session without a park. Real fixture
 * through the container; expo-router and the answer band mocked at the module
 * seam. Phases per docs/11.
 */

import {act, fireEvent, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Exam from '../../app/exam/[section]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import {markTaught, newItem, type ItemId, type ItemProgress} from '../../src/domain/item';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {AudioSource} from '../../src/ports';
import {DEFAULT_APP_STATE, type AppStateStore} from '../../src/ports/app-state-store';
import type {Progress, ProgressStore} from '../../src/ports/progress-store';
import type {SessionState} from '../../src/usecases/drill-plan';

import {useDrillSession} from '../../src/store/drill';
import {useProgress} from '../../src/store/progress';

const {back, push, replace, params} = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  params: {section: 'section.speak.1'} as Record<string, string>,
}));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => params,
  useRouter: () => ({back, push, replace}),
}));

// The band's look is the design system's; the runner's behaviour is which
// variant it was handed — said here as text, so the tone is assertable.
vi.mock('../../src/components/learning/answer-band', async () => {
  const {Text, View} = await import('react-native');
  return {
    AnswerBand: ({tone, onAction}: {tone?: string; onAction?: () => void}) => (
      <View>
        <Text>{`band:${tone}`}</Text>
        <Text onPress={onAction}>Continue</Text>
      </View>
    ),
  };
});

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

/** Fifteen section.speak.1 words with an eligible recognition exercise each. */
const MET = [
  'vocab.a-little',
  'vocab.afternoon',
  'vocab.age',
  'vocab.all-day',
  'vocab.already',
  'vocab.also',
  'vocab.always',
  'vocab.at-the-same-time',
  'vocab.biased',
  'vocab.birthplace',
  'vocab.boy',
  'vocab.certainly',
  'vocab.child',
  'vocab.completely',
  'vocab.comprehension',
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

const parkSave = vi.fn(async () => {});

/** Start the exam through its own gate and wait for the session. */
async function begun(): Promise<SessionState> {
  fireEvent.click(screen.getByText('Start the exam'));
  await waitFor(() => {
    expect(useDrillSession.getState().status).toBe('ready');
  });
  const state = useDrillSession.getState().state;
  if (state === null) {
    throw new Error('ready without a session state');
  }
  return state;
}

/** Stand the session on its end with `missCount` questions missed. */
function endedWith(state: SessionState, missCount: number): void {
  const exercises = state.queue.flatMap(entry =>
    entry.position.kind === 'exercise' ? [entry.position.exercise] : [],
  );
  const misses = exercises
    .slice(0, missCount)
    .map(exercise => ({itemId: exercise.itemId ?? '', exercise}));
  act(() => {
    useDrillSession.setState({
      state: {...state, index: state.queue.length - 1, answered: null, misses},
    });
  });
}

describe('the exam', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    override('progress', memoryStore());
    override('audio', SILENT);
    override('appState', {load: async () => DEFAULT_APP_STATE, save: parkSave} as AppStateStore);
    useProgress.setState({progress: met(MET)});
    useDrillSession.getState().reset();
    params.section = 'section.speak.1';
    back.mockClear();
    push.mockClear();
    replace.mockClear();
    parkSave.mockClear();
  });

  it('gates behind X1, declinable with dignity — nothing starts until Begin', () => {
    // Given
    renderScreen(<Exam />);

    // Then — the gate stands and no session was started
    expect(screen.getByText('Start the exam')).toBeTruthy();
    expect(useDrillSession.getState().status).toBe('idle');

    // When — the ghost decline
    fireEvent.click(screen.getByText('Practise a little more first'));

    // Then — back, and still no session
    expect(back).toHaveBeenCalled();
    expect(useDrillSession.getState().status).toBe('idle');
  });

  it('draws at most ten for a section, counts with n of m, and mounts no bar', async () => {
    // Given
    renderScreen(<Exam />);

    // When
    const state = await begun();

    // Then — ten of the fifteen met, a counter, never a bar, never a percent
    const total = state.queue.filter(entry => entry.position.kind === 'exercise').length;
    expect(total).toBe(10);
    expect(screen.getByTestId('exam-counter').textContent).toBe('1 of 10');
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('ends a section exam on X3 — a count of what was right and nothing else', async () => {
    // Given
    renderScreen(<Exam />);
    const state = await begun();

    // When — the paper ends with two missed
    endedWith(state, 2);

    // Then — the count, the register, the revisit list; no percentage, no verdict
    expect(await screen.findByText('8 of 10 right')).toBeTruthy();
    expect(screen.getByText('2 worth another look')).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText(/passed|failed/i)).toBeNull();
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);

    // When
    fireEvent.click(screen.getByText('Done'));

    // Then
    expect(back).toHaveBeenCalled();
  });

  it('opens P4·x on the x, and Leave drops the session without a park', async () => {
    // Given
    renderScreen(<Exam />);
    await begun();

    // When — the x
    fireEvent.click(screen.getByLabelText('Leave the exam'));

    // Then — the exam wording: no mid-exam save, a retake is a different paper
    expect(
      await screen.findByText(/Nothing is kept — leaving starts a fresh set next time/),
    ).toBeTruthy();

    // When — Keep going first, then Leave
    fireEvent.click(screen.getByText('Keep going'));
    fireEvent.click(screen.getByLabelText('Leave the exam'));
    fireEvent.click(screen.getByText('Leave'));

    // Then — back, and the exam never wrote a park
    expect(back).toHaveBeenCalled();
    expect(parkSave).not.toHaveBeenCalled();
  });

  it('draws the X5 wrong state through the neutral band, never a third tone', async () => {
    // Given
    renderScreen(<Exam />);
    const state = await begun();
    const entry = state.queue[0];
    const options =
      entry?.position.kind === 'exercise' ? (entry.options ?? entry.position.exercise.options) : [];
    const wrongId = options.find(option => !option.isAnswer)?.itemId ?? '';
    const wrongEn = useDrillSession.getState().pool?.itemsById.get(wrongId)?.en ?? '';

    // When — a wrong answer commits
    fireEvent.click(screen.getAllByText(wrongEn)[0] as HTMLElement);

    // Then — the band's variant is the drill runner's own wrong tone
    expect(await screen.findByText('band:wrong')).toBeTruthy();
    expect(screen.queryByText(/band:(?!wrong|correct)/)).toBeNull();
  });

  it('states the final mark in the chrome from the first item', async () => {
    // Given
    params.section = 'section.read.11';
    renderScreen(<Exam />);

    // When
    await begun();

    // Then — X4: the 90% mark is never a surprise at the end
    expect(screen.getByText('Final test · 90% to pass')).toBeTruthy();
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
  });

  it('draws the one percentage surface on X4·pass, count beside it', async () => {
    // Given
    params.section = 'section.read.11';
    renderScreen(<Exam />);
    const state = await begun();
    const total = state.queue.filter(entry => entry.position.kind === 'exercise').length;
    expect(total).toBeLessThanOrEqual(100);

    // When — every answer right
    endedWith(state, 0);

    // Then — the percentage, the count beside it, and Carry on
    expect(await screen.findByText('100%')).toBeTruthy();
    expect(screen.getByText(`${total} of ${total} right`)).toBeTruthy();
    expect(screen.getByText('Carry on')).toBeTruthy();
  });

  it('offers the retake as the primary action under the mark, and never says failed', async () => {
    // Given
    params.section = 'section.read.11';
    renderScreen(<Exam />);
    const state = await begun();
    const total = state.queue.filter(entry => entry.position.kind === 'exercise').length;

    // When — under 90%
    endedWith(state, Math.ceil(total * 0.2));

    // Then — retake primary on this screen, the word "failed" nowhere
    expect(await screen.findByText('Take it again')).toBeTruthy();
    expect(screen.getByText(/Everything stays open — the items are sampled/)).toBeTruthy();
    expect(screen.queryByText(/fail/i)).toBeNull();

    // When — the retake
    fireEvent.click(screen.getByText('Take it again'));

    // Then — a fresh session from the top
    await waitFor(() => {
      expect(useDrillSession.getState().status).toBe('ready');
      expect(useDrillSession.getState().state?.index).toBe(0);
    });
  });
});
