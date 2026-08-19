/**
 * @fileoverview The onboarding flow's route surface — K2 and K3 stay unwired.
 *
 * docs/02 keeps the skip-ahead screens on the board but out of v1: K2b's
 * "Start reading" and K3's bulk mark-known must not be reachable. Expo Router
 * wires routes from the filesystem, so unreachable means no file — this test
 * pins the flow to exactly its five screens plus the layout.
 */

import {readdirSync} from 'node:fs';
import {join} from 'node:path';

import {describe, expect, it} from 'vitest';

describe('the onboarding route directory', () => {
  it('holds exactly the five screens and the layout, so K2 and K3 are unreachable', () => {
    // When
    const files = readdirSync(join(__dirname, '../../app/onboarding')).sort();

    // Then
    expect(files).toEqual([
      '_layout.tsx',
      'audio.tsx',
      'index.tsx',
      'pace.tsx',
      'reminder.tsx',
      'track.tsx',
    ]);
  });
});
