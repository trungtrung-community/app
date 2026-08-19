/**
 * @fileoverview The cue vocabulary is closed, and one cue moves the phone.
 *
 * Both of these are guards on a constant rather than tests of behaviour, which is why
 * most of them have no `// When` — nothing happens, and a marker for an act that never
 * occurs would be a lie about what the test does (`docs/11` §1).
 *
 * They are worth having because both facts are **decisions with a paper trail**, and the
 * failure mode is somebody adding a fifth cue or a second haptic in a hurry. A red test
 * naming `docs/07` is a cheaper conversation than finding it on a device.
 */

import {describe, expect, it} from 'vitest';

import {CUES, CUE_NAMES, DEFAULT_CUE_PREFERENCES, type Cue} from './cue';

describe('the vocabulary', () => {
  it('marks exactly the four moments signed in docs/07', () => {
    // Then
    expect(CUE_NAMES).toEqual(['correct', 'wrong', 'run', 'stop-complete']);
  });

  it('says what each moment is, so a fifth has to justify itself in the same words', () => {
    // Then
    for (const name of CUE_NAMES) {
      expect(CUES[name].moment.length).toBeGreaterThan(0);
    }
  });
});

describe('haptics', () => {
  it('moves the phone for a correct answer and nothing else', () => {
    // When
    const moving = CUE_NAMES.filter(name => CUES[name].haptic);

    // Then
    expect(moving).toEqual<Cue[]>(['correct']);
  });

  it('stays still for a wrong answer', () => {
    // Then — docs/05: "one soft tick for correct, nothing for wrong". The 2026-08-18
    // entry widened the sound class and deliberately left this line alone.
    expect(CUES.wrong.haptic).toBe(false);
  });
});

describe('preferences', () => {
  it('starts with both switches on', () => {
    // Then
    expect(DEFAULT_CUE_PREFERENCES).toEqual({sound: true, haptics: true});
  });
});
