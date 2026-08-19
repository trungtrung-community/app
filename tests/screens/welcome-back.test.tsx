/**
 * @fileoverview O5 Welcome back — the returning learner's landing.
 *
 * Renders the real route screen against the real fixture through the
 * container, with the bookkeeping store doubled and expo-router mocked at the
 * module seam. The assertions are the board's rules: the days-walking line,
 * the parked stop named only when a snapshot exists, Carry on to the parked
 * stop or the journey, Review first to practice, the due-items line held back,
 * and no guilt in the copy.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import WelcomeBack from '../../app/welcome-back';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import {DEFAULT_APP_STATE, type AppState} from '../../src/ports/app-state-store';
import type {Progress} from '../../src/ports/progress-store';
import {useProgress} from '../../src/store/progress';

const {replace} = vi.hoisted(() => ({replace: vi.fn()}));
vi.mock('expo-router', () => ({
  useRouter: () => ({replace}),
}));

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

/** Nine walked days, matching the board frame's count. */
const NINE_DAYS = Array.from({length: 9}, (_, i) => `2026-08-0${i + 1}`);

/** A snapshot parked at the fixture stop named "Hello, and a way out". */
const PARKED: AppState = {
  ...DEFAULT_APP_STATE,
  session: {
    stopId: 'stop.core.c1.1',
    contentVersion: '1',
    savedAt: new Date().toISOString(),
    state: {},
  },
};

/** Drains pending promise chains without a real timer. */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

function wireAppState(state: AppState): void {
  override('appState', {load: async () => state, save: async () => {}});
}

beforeEach(() => {
  resetContainer();
  override('content', new JsonContentSource(fixture as unknown as ContentFixture));
  wireAppState(DEFAULT_APP_STATE);
  useProgress.setState({progress: {...EMPTY, walkedOn: NINE_DAYS}});
  replace.mockClear();
});

describe('O5, welcome back', () => {
  it('counts the walked days in the headline', () => {
    // When
    renderScreen(<WelcomeBack />);

    // Then
    expect(screen.getByRole('heading', {name: '9 days walking.'})).toBeTruthy();
  });

  it('names the parked stop when a snapshot exists', async () => {
    // Given
    wireAppState(PARKED);

    // When
    renderScreen(<WelcomeBack />);

    // Then
    expect(await screen.findByText('You stopped at Hello, and a way out.')).toBeTruthy();
  });

  it('holds the stopped-at line back when nothing is parked', async () => {
    // When
    renderScreen(<WelcomeBack />);
    await flushMicrotasks();

    // Then
    expect(screen.queryByText(/You stopped at/)).toBeNull();
  });

  it('carries on to the journey when nothing is parked', async () => {
    // Given
    renderScreen(<WelcomeBack />);
    await flushMicrotasks();

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Carry on'}));

    // Then
    expect(replace).toHaveBeenCalledWith('/journey');
  });

  it('carries on to the parked stop when one exists', async () => {
    // Given
    wireAppState(PARKED);
    renderScreen(<WelcomeBack />);
    await screen.findByText('You stopped at Hello, and a way out.');

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Carry on'}));

    // Then
    expect(replace).toHaveBeenCalledWith('/stop/stop.core.c1.1');
  });

  it('reviews first at the practice list', () => {
    // Given
    renderScreen(<WelcomeBack />);

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Review first'}));

    // Then
    expect(replace).toHaveBeenCalledWith('/practice');
  });

  it('holds the due-items line back until the review loop surfaces a count', async () => {
    // When
    renderScreen(<WelcomeBack />);
    await flushMicrotasks();

    // Then
    expect(screen.queryByText(/waiting/)).toBeNull();
  });

  it('carries no guilt in the copy', async () => {
    // When
    const {container} = renderScreen(<WelcomeBack />);
    await flushMicrotasks();

    // Then
    expect(container.textContent).not.toMatch(/sorry|missed|streak|behind|late|lost/i);
  });
});
