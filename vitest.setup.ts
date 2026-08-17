/**
 * @fileoverview What jsdom does not have and React Native assumes, plus teardown.
 *
 * The component suite renders through `react-native-web` — the same path `expo start --web`
 * takes — so these are the browser APIs jsdom omits rather than React Native shims.
 *
 * `matchMedia` is the one that matters: Reanimated reads `prefers-reduced-motion` at import
 * time, so without it every component that animates fails to load, not to render.
 *
 * The cleanup is explicit rather than left to Testing Library's automatic hook. Without it
 * every render stacks up in one document and the queries start reporting "found multiple",
 * which reads as a component bug and is not one.
 */

import {cleanup} from '@testing-library/react';
import {afterEach} from 'vitest';

afterEach(cleanup);

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
