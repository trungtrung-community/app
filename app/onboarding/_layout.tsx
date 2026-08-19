/**
 * @fileoverview The onboarding stack — S1 → K1 → O2 → O3 → O4, linear, then out.
 *
 * Five screens, walked forward with `push` so the back gesture retreats a step
 * rather than escaping the flow. The launch gate that routes a first launch here
 * is a separate task; until it lands the flow is reachable by URL only.
 */

import {Stack} from 'expo-router';

export default function OnboardingLayout() {
  return <Stack screenOptions={{headerShown: false}} />;
}
