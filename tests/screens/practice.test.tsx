/**
 * @fileoverview Q1 practice home — the district list and the still-getting row.
 *
 * Renders the real route screen against the real fixture through the container.
 * Phases per docs/11.
 */

import {screen} from '@testing-library/react';
import {beforeEach, describe, expect, it} from 'vitest';

import Practice from '../../app/(tabs)/practice/index';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import {addDays, toIsoDate} from '../../src/domain/date';
import {newItem, recordMiss, type ItemId} from '../../src/domain/item';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {Progress} from '../../src/ports/progress-store';

import {useProgress} from '../../src/store/progress';

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

describe('the practice home', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    useProgress.setState({progress: null});
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
});
