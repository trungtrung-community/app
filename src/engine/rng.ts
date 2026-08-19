/**
 * @fileoverview The engine's randomness, injected so it can be asserted.
 *
 * The re-queue rule is "3–5 positions later" and every answer-bearing exercise
 * stores its answer first, so both the gap and the shuffle need a random draw —
 * and both need tests that state exact outcomes. Randomness therefore arrives as
 * a parameter everywhere in this layer; `Math.random` appears nowhere.
 */

/** A uniform draw in [0, 1). The engine's only source of chance. */
export type Rng = () => number;

/**
 * A deterministic `Rng` from a 32-bit seed (mulberry32).
 *
 * @example
 * const rng = seededRng(42);
 * rng() === seededRng(42)(); // the sequence repeats per seed
 */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A uniform integer draw in [min, max], both ends inclusive. */
export function intBetween(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** A Fisher–Yates shuffle into a new array; the input is left alone. */
export function shuffled<T>(rng: Rng, items: readonly T[]): readonly T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}
