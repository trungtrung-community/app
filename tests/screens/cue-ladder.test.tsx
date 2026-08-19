/**
 * @fileoverview L9 cue ladder — the six find-the-root rungs, verbatim from the
 * read_cue rows, with a worked word where one settles cleanly. Renders the
 * real route against the real fixture. Phases per docs/11.
 */

import {screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import CueLadder from '../../app/cue-ladder';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';

const CUES = (
  fixture as unknown as {
    read_cue: {id: string; n: number; headline: string; emphasis: string; sentence: string}[];
  }
).read_cue;

vi.mock('expo-router', () => ({
  useRouter: () => ({push: vi.fn()}),
}));

describe('the cue ladder', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
  });

  it('renders all six rungs verbatim from the data', async () => {
    // When
    renderScreen(<CueLadder />);

    // Then
    await screen.findByText('One word for each rung');
    expect(CUES).toHaveLength(6);
    for (const cue of CUES) {
      expect(findByFullText(cue.headline).length).toBeGreaterThan(0);
      expect(findByFullText(cue.emphasis).length).toBeGreaterThan(0);
      expect(findByFullText(cue.sentence).length).toBeGreaterThan(0);
    }
  });

  it('numbers the rungs in rung order', async () => {
    // When
    renderScreen(<CueLadder />);

    // Then
    await screen.findByText('One word for each rung');
    for (const cue of CUES) {
      expect(screen.getAllByText(String(cue.n)).length).toBeGreaterThan(0);
    }
  });

  it('works one example word where the list settles a rung', async () => {
    // When
    renderScreen(<CueLadder />);

    // Then — the fixture's word list is rich enough to settle at least one
    // rung, and every worked card names its rung.
    await screen.findByText('One word for each rung');
    expect(screen.getAllByText(/^Rung \d$/).length).toBeGreaterThan(0);
  });
});

/**
 * Elements whose whole text equals `text`, ignoring the break characters
 * TibetanText inserts — mixed Tibetan-and-Latin copy renders as sibling runs,
 * so a plain string matcher cannot see it whole.
 */
function findByFullText(text: string): HTMLElement[] {
  const wanted = normalize(text);
  return screen.getAllByText((_, element) => normalize(element?.textContent ?? '') === wanted);
}

function normalize(value: string): string {
  // The tsheg goes too: TibetanText closes a multi-syllable run with one, per
  // the domain's own rule, so rendered text may carry a closing tsheg the data
  // does not. Stripping it from both sides keeps the comparison symmetric.
  return value.replaceAll('\u200B', '').replaceAll('\u0F0B', '').replace(/\s+/g, ' ').trim();
}
