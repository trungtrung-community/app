/**
 * @fileoverview The four moments the app marks with a sound or a tick.
 *
 * A closed vocabulary, and closing it is the point. `docs/07` (2026-08-16) admitted
 * interface sounds as a class distinct from teaching audio and signed three of them; the
 * wrong tone was added 2026-08-18 and made it four. **A fifth is a decision entry, not a
 * call site** — which is only enforceable if there is one list to add it to.
 *
 * What lives here is what a cue *means*. What it sounds like, how loud it is, and which
 * native haptic generator fires are all in `src/infra/cues/`, because they are answers to
 * "how is this provided on this device" rather than to "what are the rules".
 *
 * The one exception is `haptic`, which looks like a platform detail and is not: `docs/05`
 * says "one soft tick for correct, nothing for wrong", and that is a product rule about
 * when a phone may move. Infra decides what the tick *is*; this decides that exactly one
 * cue gets one.
 */

export type CueSpec = {
  /** What happened, in the product's own words. The reason this cue exists. */
  readonly moment: string;
  /** Whether the phone moves. True for exactly one cue — see the file's note. */
  readonly haptic: boolean;
};

/**
 * The vocabulary.
 *
 * `stop-complete` is the only one that may be accompanied by confetti, and only on S12 —
 * `docs/01`'s never-do list carries that as a signed exception naming a single screen.
 */
export const CUES = {
  correct: {
    moment: 'An answer was right.',
    haptic: true,
  },
  wrong: {
    moment:
      'An answer was wrong. Quiet, and the phone does not move — a miss is ' +
      'information, not a scolding.',
    haptic: false,
  },
  run: {
    moment: "S7's run reached three in a row, inside one set.",
    haptic: false,
  },
  'stop-complete': {
    moment: 'A lesson stop finished. The narrative unit, and the only confetti in the product.',
    haptic: false,
  },
} as const satisfies Record<string, CueSpec>;

export type Cue = keyof typeof CUES;

/** Every cue, for iterating — a gallery, a settings preview, a test. */
export const CUE_NAMES = Object.keys(CUES) as readonly Cue[];

/**
 * The learner's two switches, from P2's sound and vibration row.
 *
 * Two rather than one because they fail differently: a learner on a bus wants the tick
 * without the sound, and a learner in a quiet room wants the opposite. Reduce Motion is
 * deliberately not here — that belongs to the operating system, and Reanimated reads it.
 */
export type CuePreferences = {
  readonly sound: boolean;
  readonly haptics: boolean;
};

/** Both on. A learner who has never opened P2 gets the product as designed. */
export const DEFAULT_CUE_PREFERENCES: CuePreferences = {sound: true, haptics: true};
