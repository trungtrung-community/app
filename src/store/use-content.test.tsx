/**
 * @fileoverview useContent's contract — loading, ready, error, and the re-read on
 * changed inputs. Phases are marked per `docs/11-testing-conventions.md`.
 */

import {renderHook, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';

import type {ContentSource} from '../ports';

import {override, resetContainer} from '../composition/container';
import {useContent} from './use-content';

// The hook hands the container's source to the caller's read callback; these tests
// assert that plumbing, so a bare object stands in for the 23-method port.
const SOURCE = {} as ContentSource;

describe('useContent', () => {
  afterEach(() => {
    resetContainer();
  });

  it('starts loading and lands ready with the read result', async () => {
    // Given
    override('content', SOURCE);

    // When
    const {result} = renderHook(() => useContent(async () => 'the data', []));

    // Then
    expect(result.current).toEqual({status: 'loading'});
    await waitFor(() => {
      expect(result.current).toEqual({status: 'ready', data: 'the data'});
    });
  });

  it('hands the container source to the read callback', async () => {
    // Given
    override('content', SOURCE);

    // When
    const {result} = renderHook(() => useContent(async source => source === SOURCE, []));

    // Then
    await waitFor(() => {
      expect(result.current).toEqual({status: 'ready', data: true});
    });
  });

  it('lands on error when the read rejects', async () => {
    // Given
    override('content', SOURCE);
    const failure = new Error('no such record');

    // When
    const {result} = renderHook(() => useContent<never>(() => Promise.reject(failure), []));

    // Then
    await waitFor(() => {
      expect(result.current).toEqual({status: 'error', error: failure});
    });
  });

  it('reads again when a dep changes', async () => {
    // Given
    override('content', SOURCE);
    const {result, rerender} = renderHook(
      ({q}: {q: string}) => useContent(async () => `results for ${q}`, [q]),
      {initialProps: {q: 'cha'}},
    );
    await waitFor(() => {
      expect(result.current).toEqual({status: 'ready', data: 'results for cha'});
    });

    // When
    rerender({q: 'ja'});

    // Then
    await waitFor(() => {
      expect(result.current).toEqual({status: 'ready', data: 'results for ja'});
    });
  });
});
