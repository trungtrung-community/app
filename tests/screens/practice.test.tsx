/**
 * @fileoverview Q1 practice home — the district list and the still-getting row.
 *
 * Renders the real route screen against the real fixture through the container.
 * Phases per docs/11.
 */

import {fireEvent, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Practice from '../../app/(tabs)/practice/index';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import {addDays, toIsoDate} from '../../src/domain/date';
import {markTaught, newItem, recordMiss, type ItemId} from '../../src/domain/item';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import {DEFAULT_APP_STATE, type AppState} from '../../src/ports/app-state-store';
import type {Progress} from '../../src/ports/progress-store';
import type {ReminderPermission} from '../../src/ports/reminder-scheduler';

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

describe('the practice home', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    useProgress.setState({progress: null});
    back.mockClear();
    push.mockClear();
    replace.mockClear();
  });

  it('renders the empty state on a first launch', async () => {
    // When — beforeEach already leaves progress null
    renderScreen(<Practice />);

    // Then
    expect(await screen.findByText('Practice grows as you walk')).toBeTruthy();
    expect(screen.queryByText('First Words')).toBeNull();
  });

  it('shows a row for a district with a done stop, and none for one without', async () => {
    // Given — stop.core.c1.1 belongs to district.core, "First Words"
    useProgress.setState({
      progress: {...EMPTY, completedStops: ['stop.core.c1.1']},
    });

    // When
    renderScreen(<Practice />);

    // Then
    expect(await screen.findByText('First Words')).toBeTruthy();
    expect(screen.queryByText('Meeting People')).toBeNull();
  });

  it('shows the still-getting count for items missed twice in the last week', async () => {
    // Given
    const today = toIsoDate(new Date());
    const itemId = 'vocab.test-item' as ItemId;
    const item = recordMiss(recordMiss(newItem(itemId), addDays(today, -3)), addDays(today, -1));
    useProgress.setState({
      progress: {...EMPTY, items: {[itemId]: item}},
    });

    // When
    renderScreen(<Practice />);

    // Then
    expect(await screen.findByText("Everything · 1 you're still getting")).toBeTruthy();
  });

  it('places the still-getting row above the district rows', async () => {
    // Given — docs/02 and docs/07 (2026-08-15): the still-getting row leads
    const today = toIsoDate(new Date());
    const itemId = 'vocab.test-item' as ItemId;
    const item = recordMiss(recordMiss(newItem(itemId), addDays(today, -3)), addDays(today, -1));
    useProgress.setState({
      progress: {...EMPTY, completedStops: ['stop.core.c1.1'], items: {[itemId]: item}},
    });

    // When
    renderScreen(<Practice />);

    // Then
    const stillGetting = await screen.findByText("Everything · 1 you're still getting");
    const district = screen.getByText('First Words');
    expect(
      stillGetting.compareDocumentPosition(district) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('carries the met counts on a district row, both figures bound', async () => {
    // Given — two core words and one core phrase met
    const items = Object.fromEntries(
      ['vocab.tashi-delek', 'vocab.a-little', 'phrase.core.dont-understand'].map(id => [
        id,
        markTaught(newItem(id as ItemId)),
      ]),
    );
    useProgress.setState({
      progress: {...EMPTY, completedStops: ['stop.core.c1.1'], items},
    });

    // When
    renderScreen(<Practice />);

    // Then
    expect(await screen.findByText('2 words · 1 phrase')).toBeTruthy();
  });

  it('hands a district row to the picker with its pool', async () => {
    // Given
    useProgress.setState({
      progress: {...EMPTY, completedStops: ['stop.core.c1.1']},
    });
    renderScreen(<Practice />);
    const row = await screen.findByText('First Words');

    // When
    fireEvent.click(row);

    // Then
    expect(push).toHaveBeenCalledWith('/practice/picker?pool=district:core&entry=practice');
  });

  it('offers the training ground as the fifth mode card, and it navigates', async () => {
    // Given
    useProgress.setState({
      progress: {...EMPTY, completedStops: ['stop.core.c1.1']},
    });
    renderScreen(<Practice />);
    const card = await screen.findByText('Training ground');

    // When
    fireEvent.click(card);

    // Then
    expect(push).toHaveBeenCalledWith('/training-ground');
  });

  it('keeps the first launch whole — no training ground card before a stop', async () => {
    // When — beforeEach already leaves progress null
    renderScreen(<Practice />);

    // Then
    await screen.findByText('Practice grows as you walk');
    expect(screen.queryByText('Training ground')).toBeNull();
  });

  it('hands the still-getting row to the worth-another-look list', async () => {
    // Given
    const today = toIsoDate(new Date());
    const itemId = 'vocab.test-item' as ItemId;
    const item = recordMiss(recordMiss(newItem(itemId), addDays(today, -3)), addDays(today, -1));
    useProgress.setState({
      progress: {...EMPTY, items: {[itemId]: item}},
    });
    renderScreen(<Practice />);
    const row = await screen.findByText("Everything · 1 you're still getting");

    // When
    fireEvent.click(row);

    // Then
    expect(push).toHaveBeenCalledWith('/practice/still-getting');
  });
});

describe('the nudge card', () => {
  const TODAY = toIsoDate(new Date());
  const YESTERDAY = addDays(TODAY, -1);

  /** A learner mid-walk in First Words who did not walk today. */
  const IDLE_PROGRESS: Progress = {
    ...EMPTY,
    walkedOn: [YESTERDAY],
    completedStops: ['stop.core.c1.1'],
  };

  /** Wire the scheduler and the bookkeeping; returns every state written. */
  function wireNudge(
    input: {permission?: ReminderPermission; lastNudgeOn?: string | null} = {},
  ): AppState[] {
    override('reminders', {
      getPermission: async () => input.permission ?? 'denied',
      requestPermission: async () => 'denied' as const,
      replaceSchedule: async () => {},
      cancelAll: async () => {},
    });
    const saved: AppState[] = [];
    override('appState', {
      load: async () => ({...DEFAULT_APP_STATE, lastNudgeOn: input.lastNudgeOn ?? null}),
      save: async (state: AppState) => {
        saved.push(state);
      },
    });
    return saved;
  }

  /** Drains the gate's promise chain without a real timer. */
  async function flushMicrotasks(): Promise<void> {
    for (let i = 0; i < 12; i += 1) {
      await Promise.resolve();
    }
  }

  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    useProgress.setState({progress: IDLE_PROGRESS});
    back.mockClear();
    push.mockClear();
    replace.mockClear();
  });

  it('shows the card after an idle day when push is declined, and stamps the day', async () => {
    // Given
    const saved = wireNudge();

    // When
    renderScreen(<Practice />);

    // Then
    expect(await screen.findByText('You stopped at First Words.')).toBeTruthy();
    expect(saved.at(-1)?.lastNudgeOn).toBe(TODAY);
  });

  it('never shows it twice the same day', async () => {
    // Given
    wireNudge({lastNudgeOn: TODAY});

    // When
    renderScreen(<Practice />);

    // Then
    await screen.findByText('First Words');
    await flushMicrotasks();
    expect(screen.queryByText('You stopped at First Words.')).toBeNull();
  });

  it('stays quiet on a day the learner walked', async () => {
    // Given
    wireNudge();
    useProgress.setState({progress: {...IDLE_PROGRESS, walkedOn: [YESTERDAY, TODAY]}});

    // When
    renderScreen(<Practice />);

    // Then
    await screen.findByText('First Words');
    await flushMicrotasks();
    expect(screen.queryByText('You stopped at First Words.')).toBeNull();
  });

  it('stays quiet while permission was never asked', async () => {
    // Given
    wireNudge({permission: 'undetermined'});

    // When
    renderScreen(<Practice />);

    // Then
    await screen.findByText('First Words');
    await flushMicrotasks();
    expect(screen.queryByText('You stopped at First Words.')).toBeNull();
  });

  it('dismiss hides the card at once and stamps the day', async () => {
    // Given
    const saved = wireNudge();
    renderScreen(<Practice />);
    await screen.findByText('You stopped at First Words.');

    // When
    fireEvent.click(screen.getByLabelText('Dismiss'));

    // Then
    expect(screen.queryByText('You stopped at First Words.')).toBeNull();
    await waitFor(() => expect(saved.length).toBe(2));
    expect(saved.at(-1)?.lastNudgeOn).toBe(TODAY);
  });

  it('leads to the journey — the landing N2 uses', async () => {
    // Given
    wireNudge();
    renderScreen(<Practice />);
    const line = await screen.findByText('You stopped at First Words.');

    // When
    fireEvent.click(line);

    // Then
    expect(push).toHaveBeenCalledWith('/journey');
  });
});
