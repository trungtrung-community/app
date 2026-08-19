/**
 * @fileoverview The app's entry route.
 *
 * The four destinations live in the `(tabs)` group; the entry route only
 * forwards to the first of them. Onboarding (O*) will slot in front of this
 * redirect when it exists.
 */

import {Redirect} from 'expo-router';

export default function Home() {
  return <Redirect href="/journey" />;
}
