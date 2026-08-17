/**
 * @fileoverview One animated 0→1 for a control that is either on or off.
 *
 * Switch, Checkbox and Radio all animate the same shape: a boolean arrives from a parent,
 * and something has to travel between two states over a token duration. This is that,
 * once.
 *
 * A shared value rather than component state, because the whole point is that the
 * interpolation runs off the JS thread. Reading `progress.value` outside a worklet is
 * not the intended use.
 */

import {useEffect} from 'react';
import {
  useSharedValue,
  withTiming,
  type EasingFunctionFactory,
  type SharedValue,
} from 'react-native-reanimated';

import {duration, easing} from './motion';

export type ToggleProgressConfig = {
  durationMs?: number;
  /**
   * A curve with an overshoot makes the progress leave [0, 1] near the end. That is
   * wanted for a thing that travels and settles, and wrong for a colour — see
   * `clamp01` in `./motion`.
   */
  curve?: EasingFunctionFactory;
};

/**
 * The control's state as an animated 0→1.
 *
 * Starts already at its destination, so a control that mounts checked is checked rather
 * than animating into it — a list of settings must not flutter on open.
 *
 * @example const progress = useToggleProgress(checked);
 */
export function useToggleProgress(
  on: boolean,
  config: ToggleProgressConfig = {},
): SharedValue<number> {
  const {durationMs = duration.fast, curve = easing.out} = config;
  const progress = useSharedValue(on ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(on ? 1 : 0, {duration: durationMs, easing: curve});
  }, [on, progress, durationMs, curve]);

  return progress;
}
