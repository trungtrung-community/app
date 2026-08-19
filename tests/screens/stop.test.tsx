/**
 * @fileoverview The stop screen — the intro opens, a card teaches, the bar
 * stands over the whole run. The loop's depth is proven by the integration
 * suite; this asserts the screen's composition. Phases per docs/11.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Stop from '../../app/stop/[id]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {Progress, ProgressStore} from '../../src/ports/progress-store';
import {useProgress} from '../../src/store/progress';
import {useStopSession} from '../../src/store/session';

const {back} = vi.hoisted(() => ({back: vi.fn()}));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({id: 'stop.core.c1.1'}),
  useRouter: () => ({back}),
}));

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

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

describe('the stop screen', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    override('progress', memoryStore());
    useProgress.setState({progress: null});
    useStopSession.getState().reset();
    back.mockClear();
  });

  it('opens on the intro with the way in', async () => {
    // When
    renderScreen(<Stop />);

    // Then
    expect(await screen.findByText('Hello, and a way out')).toBeTruthy();
    expect(screen.getByText('Step inside')).toBeTruthy();
    expect(screen.getByTestId('stop-progress')).toBeTruthy();
  });

  it('teaches the first word from its card', async () => {
    // Given
    renderScreen(<Stop />);
    const enter = await screen.findByText('Step inside');

    // When
    fireEvent.click(enter);

    // Then
    expect(await screen.findByText('trashi delek')).toBeTruthy();
    expect(screen.getByText(/New word/)).toBeTruthy();
  });
});
