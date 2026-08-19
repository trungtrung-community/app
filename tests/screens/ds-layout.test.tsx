/**
 * @fileoverview The `_ds` gate — a dev build opens the gallery instead of redirecting.
 *
 * `__DEV__` is a compile-time define (`vitest.config.mts` pins it to true), so the
 * production branch — the redirect to `/journey` — cannot execute under vitest at all.
 * Only the dev half is covered here, and deliberately: bending the layout so a test can
 * reach the other branch would trade two readable lines for a seam nothing else needs.
 */

import {screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import DsLayout from '../../app/_ds/_layout';
import {renderScreen} from './render';

vi.mock('expo-router', () => ({
  Redirect: ({href}: {href: string}) => <div data-testid="redirect">{href}</div>,
  Stack: () => <div data-testid="stack" />,
}));

describe('the _ds gate', () => {
  it('opens the gallery stack rather than redirecting in a dev build', () => {
    // When
    renderScreen(<DsLayout />);

    // Then
    expect(screen.getByTestId('stack')).toBeTruthy();
    expect(screen.queryByTestId('redirect')).toBeNull();
  });
});
