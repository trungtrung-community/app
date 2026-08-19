/**
 * @fileoverview The app's entry route — the launch gate.
 *
 * Three destinations, in precedence order. A first launch — never onboarded,
 * nothing walked — goes to onboarding. A return with a stop mid-flight, or
 * after three or more days away, goes through O5 Welcome back, at most once
 * per launch. Every other launch goes straight to the journey.
 *
 * The gate waits for the settings and progress snapshots and the device
 * bookkeeping, rendering nothing meanwhile — the same frames the root layout
 * already spends on fonts. A store that fails to load answers as a first
 * launch would, which is the stance the slices document; corrupt bookkeeping
 * loses only continuity, so it reads as no parked stop.
 */

import {Redirect, type Href} from 'expo-router';
import {useEffect, useState} from 'react';

import {appState} from '../src/composition/container';
import {daysBetween, isoDate, toIsoDate} from '../src/domain/date';
import type {ParkedSession} from '../src/ports/app-state-store';
import type {Progress} from '../src/ports/progress-store';
import type {Settings} from '../src/ports/settings-store';
import {useProgress} from '../src/store/progress';
import {useSettings} from '../src/store/settings';

/** Days away at which a return goes through O5 rather than straight in. */
const AWAY_DAYS_FOR_WELCOME = 3;

/**
 * Whether O5 has already been offered this launch. Module-level on purpose:
 * the welcome shows at most once per launch, so a later visit to `/` — the
 * back gesture, a reset — must fall through to the journey instead.
 */
let welcomedThisLaunch = false;

/** Forget this launch's welcome. Tests only. */
export function resetLaunchGate(): void {
  welcomedThisLaunch = false;
}

/**
 * The destination for this launch, by the docs/02 precedence.
 *
 * Null slices read as a first launch: nothing chosen, nothing walked.
 */
function decide(
  settings: Settings | null,
  progress: Progress | null,
  session: ParkedSession | null,
): Href {
  const onboardedOn = settings?.onboardedOn ?? null;
  const walkedOn = progress?.walkedOn ?? [];
  if (onboardedOn === null && walkedOn.length === 0) {
    return '/onboarding';
  }
  const lastWalked = walkedOn.at(-1);
  const daysAway =
    lastWalked === undefined ? 0 : daysBetween(isoDate(lastWalked), toIsoDate(new Date()));
  if (!welcomedThisLaunch && (session !== null || daysAway >= AWAY_DAYS_FOR_WELCOME)) {
    welcomedThisLaunch = true;
    return '/welcome-back';
  }
  return '/journey';
}

export default function Home() {
  const [href, setHref] = useState<Href | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [, , bookkeeping] = await Promise.allSettled([
        useSettings.getState().hydrate(),
        useProgress.getState().hydrate(),
        appState().then(store => store.load()),
      ]);
      if (!live) {
        return;
      }
      const session = bookkeeping.status === 'fulfilled' ? bookkeeping.value.session : null;
      // Decided in the effect rather than during render, so the once-per-launch
      // flag is written exactly once even where renders repeat.
      setHref(decide(useSettings.getState().settings, useProgress.getState().progress, session));
    })();
    return () => {
      live = false;
    };
  }, []);

  if (href === null) {
    return null;
  }
  return <Redirect href={href} />;
}
