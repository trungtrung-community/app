/**
 * @fileoverview Screen-test render helper: the providers the root layout gives
 * every real screen, with fixed metrics because jsdom has no native insets.
 */

import {render} from '@testing-library/react';
import type {ReactElement} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

/** The board's frame: 390×760, no notches. */
const METRICS = {
  frame: {x: 0, y: 0, width: 390, height: 760},
  insets: {top: 0, left: 0, right: 0, bottom: 0},
};

export function renderScreen(ui: ReactElement): ReturnType<typeof render> {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);
}
