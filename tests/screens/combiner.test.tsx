/**
 * @fileoverview L7 combiner index and L8 combiner sheet — the seven that
 * attach, and one combiner in three steps. Renders the real routes against the
 * real fixture. Phases per docs/11.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import CombinerIndex from '../../app/combiner/index';
import CombinerSheet from '../../app/combiner/[id]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';

const ROWS = fixture as unknown as {
  combiner: {id: string; name: string; position: string; exceptions_json: string}[];
  combiner_stack: {combiner_id: string; stack_id: string}[];
  read_rule: {id: string; statement: string}[];
};

const SUPERSCRIPTS = ROWS.combiner.filter(combiner => combiner.position === 'superscript');
const SUBSCRIPTS = ROWS.combiner.filter(combiner => combiner.position === 'subscript');

/** How many stacks one combiner forms, from its child rows. */
function stackCount(combinerId: string): number {
  return ROWS.combiner_stack.filter(row => row.combiner_id === combinerId).length;
}

const {push, params} = vi.hoisted(() => ({push: vi.fn(), params: {id: 'combiner.ya-tak'}}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push}),
  useLocalSearchParams: () => params,
}));

describe('the combiner index', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    push.mockClear();
  });

  it('draws all seven as records, split below and on top', async () => {
    // When
    renderScreen(<CombinerIndex />);

    // Then
    for (const combiner of ROWS.combiner) {
      expect(await screen.findByRole('button', {name: combiner.name})).toBeTruthy();
    }
    expect(screen.getByText(`dok-chen · ${SUBSCRIPTS.length}`)).toBeTruthy();
    expect(screen.getByText(`go-chen · ${SUPERSCRIPTS.length}`)).toBeTruthy();
  });

  it('binds every card count to the stack list, never typed', async () => {
    // When
    renderScreen(<CombinerIndex />);

    // Then
    await screen.findByRole('button', {name: ROWS.combiner[0]!.name});
    for (const combiner of ROWS.combiner) {
      expect(screen.getAllByText(`${stackCount(combiner.id)} stacks`).length).toBeGreaterThan(0);
    }
  });

  it('opens the combiner sheet from a card', async () => {
    // Given
    renderScreen(<CombinerIndex />);
    const card = await screen.findByRole('button', {name: 'ya-tak'});

    // When
    fireEvent.click(card);

    // Then
    expect(push).toHaveBeenCalledWith('/combiner/combiner.ya-tak');
  });
});

describe('the combiner sheet', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    params.id = 'combiner.ya-tak';
    push.mockClear();
  });

  it('draws the three steps with counts from the stack list', async () => {
    // Given
    const count = stackCount('combiner.ya-tak');

    // When
    renderScreen(<CombinerSheet />);

    // Then
    expect(await screen.findByText('① Symbol & name')).toBeTruthy();
    expect(screen.getByText(`② All ${count} stacks`)).toBeTruthy();
    expect(screen.getByText(`③ How each one is read · ${count}`)).toBeTruthy();
  });

  it('gives every spell-out row its own play control', async () => {
    // Given
    const count = stackCount('combiner.ya-tak');

    // When
    renderScreen(<CombinerSheet />);

    // Then
    await screen.findByText('① Symbol & name');
    expect(screen.getAllByRole('button', {name: /^Play /})).toHaveLength(count);
  });

  it('states the reading rule from the rule record', async () => {
    // Given
    const statement = ROWS.read_rule.find(rule => rule.id === 'R-SUB-YA')?.statement ?? '';

    // When
    renderScreen(<CombinerSheet />);

    // Then
    await screen.findByText('① Symbol & name');
    expect(findByFullText(statement).length).toBeGreaterThan(0);
  });

  it('renders the exception where the record carries one', async () => {
    // Given
    params.id = 'combiner.la-go';
    const laGo = ROWS.combiner.find(combiner => combiner.id === 'combiner.la-go');
    const note = (JSON.parse(laGo?.exceptions_json ?? '[]') as {note: string}[])[0]?.note ?? '';

    // When
    renderScreen(<CombinerSheet />);

    // Then
    await screen.findByText('① Symbol & name');
    expect(findByFullText(note).length).toBeGreaterThan(0);
  });

  it('links the others in the group', async () => {
    // Given
    renderScreen(<CombinerSheet />);
    await screen.findByText('The others in this group');
    const sibling = SUBSCRIPTS.find(combiner => combiner.id !== 'combiner.ya-tak');

    // When
    fireEvent.click(screen.getByRole('button', {name: sibling?.name ?? ''}));

    // Then
    expect(push).toHaveBeenCalledWith(`/combiner/${sibling?.id ?? ''}`);
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
