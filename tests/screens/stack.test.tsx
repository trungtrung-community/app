/**
 * @fileoverview RB11 stack sheet — one stack: its parts, its readings with the
 * both-ways register, and the rules it obeys. Renders the real route against
 * the real fixture. Phases per docs/11.
 */

import {screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import StackSheet from '../../app/stack/[id]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';

const ROWS = fixture as unknown as {
  stack: {id: string; reading: string | null; reads_also_as_json: string}[];
  stack_rule: {stack_id: string; rule_id: string}[];
  read_rule: {id: string; statement: string}[];
};

/** The ambiguous prefix pair the spec names: read as ba, and as aap. */
const ABA = ROWS.stack.find(stack => stack.id === 'stack.aba');
const ABA_ALSO = JSON.parse(ABA?.reads_also_as_json ?? '[]') as {as: string; reading: string}[];

const {params} = vi.hoisted(() => ({params: {id: 'stack.aba'}}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push: vi.fn()}),
  useLocalSearchParams: () => params,
}));

describe('the stack sheet', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    params.id = 'stack.aba';
  });

  it('shows every reading of an ambiguous stack, with the parse each one is', async () => {
    // Given
    const readings = [ABA?.reading, ...ABA_ALSO.map(also => also.reading)].join(' · ');

    // When
    renderScreen(<StackSheet />);

    // Then
    expect(await screen.findByText('Reads more than one way')).toBeTruthy();
    expect(screen.getByText(readings)).toBeTruthy();
    for (const also of ABA_ALSO) {
      expect(screen.getByText(`${also.reading} · as ${also.as}`)).toBeTruthy();
    }
  });

  it('takes the stack apart into its named slots', async () => {
    // When
    renderScreen(<StackSheet />);

    // Then — stack.aba is a prefix on a root.
    expect(await screen.findByText('Prefix')).toBeTruthy();
    expect(screen.getByText('Root')).toBeTruthy();
  });

  it('states the rules the stack obeys, from the rule records', async () => {
    // Given
    const ruleIds = ROWS.stack_rule
      .filter(row => row.stack_id === 'stack.aba')
      .map(row => row.rule_id);
    const statements = ROWS.read_rule
      .filter(rule => ruleIds.includes(rule.id))
      .map(rule => rule.statement);

    // When
    renderScreen(<StackSheet />);

    // Then
    expect(await screen.findByText('The rules it obeys')).toBeTruthy();
    expect(statements.length).toBeGreaterThan(0);
    for (const statement of statements) {
      expect(findByFullText(statement).length).toBeGreaterThan(0);
    }
  });

  it('carries its play controls, silent until the recordings land', async () => {
    // When
    renderScreen(<StackSheet />);

    // Then
    await screen.findByText('Reads more than one way');
    expect(screen.getAllByRole('button', {name: /^Play /})).toHaveLength(2);
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
