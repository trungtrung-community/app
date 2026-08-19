/**
 * @fileoverview A cue player that makes no sound and moves nothing.
 *
 * Not a fallback and not a stub. It is the adapter the web build uses, for the same
 * reason `JsonContentSource` is the one web uses for content: `docs/06` runs the whole
 * Playwright suite against the Expo web build, `expo-haptics` does not exist there, and a
 * tick firing on every assertion in an end-to-end run is noise in a recording nobody can
 * mute.
 *
 * It is also what makes the component suite possible. Rendering through react-native-web
 * under jsdom means every component that marks a moment would otherwise need a native
 * module standing behind it.
 *
 * There is deliberately **no record of what it was asked to play**. A no-op that quietly
 * doubles as a spy is a test double living in shipping code, and the one place that wants
 * to see the cue traffic — `/_ds/feel` — keeps its own log, where the log is the point.
 */

import type {CuePlayer} from '../../ports/cue-player';

export class SilentCuePlayer implements CuePlayer {
  async play(): Promise<void> {}

  async setPreferences(): Promise<void> {}
}
