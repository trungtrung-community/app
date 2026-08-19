/**
 * @fileoverview The gallery's gate — `_ds` is dev-only, enforced rather than claimed.
 *
 * expo-router discovers every file under `app/` as a route, so the specimen gallery
 * shipped to production from the day it was ported (`docs/09` gap 18). This layout
 * closes the reachability half of that gap: a production build redirects the whole
 * group to the journey before any specimen mounts. The bundle-size half stays open —
 * a layout keeps a screen from being reached, not from being bundled.
 */

import {Redirect, Stack} from 'expo-router';

export default function DsLayout() {
  if (!__DEV__) {
    return <Redirect href="/journey" />;
  }
  // Same chrome as the root layout: no headers, the platform's own push.
  return <Stack screenOptions={{headerShown: false}} />;
}
