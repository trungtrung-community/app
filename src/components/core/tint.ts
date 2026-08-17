/**
 * @fileoverview A token colour at partial strength.
 *
 * The design system uses `color-mix(in oklab, <colour> N%, transparent)` in a handful of
 * places, and `sync-design` precomputes those to rgba wherever the arguments are tokens.
 * Two components mix against `currentColor` instead, which is not a token and not knowable
 * until the state is chosen — an answer row's index badge is 14% of whatever ink that row's
 * state uses. That cannot be resolved at build time, so it is resolved here.
 *
 * The input is always a generated token, never a literal, so no raw colour enters through
 * this door.
 */

/** `#RRGGBB` from the generated palette. */
const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

/**
 * A token colour at `alpha`, as rgba.
 *
 * rgba rather than a `View` with `opacity`: opacity applies to a view's children too, so a
 * badge tinted that way would fade the number sitting on it.
 *
 * Throws on anything that is not a six-digit hex — the palette is all six-digit hex, and a
 * silent fallback here would produce an invisible badge that no screenshot explains.
 *
 * @example withAlpha(color.grass600, 0.14)
 */
export function withAlpha(token: string, alpha: number): string {
  const match = HEX.exec(token);
  if (!match) {
    throw new Error(`withAlpha expects a six-digit hex token, got: ${token}`);
  }
  const [r, g, b] = match.slice(1).map(pair => parseInt(pair, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
