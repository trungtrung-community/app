import '../global.css';

import {useFonts} from 'expo-font';
import {Stack, useRouter} from 'expo-router';
import {useEffect} from 'react';
import {ActivityIndicator, AppState, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {configureAudioSession} from '../src/composition/audio-session';
import {onReminderResponse, syncReminders} from '../src/composition/notifications';
import {fonts} from '../src/theme/fonts.generated';

export default function RootLayout() {
  const router = useRouter();
  // The face list is generated from the same table as the family tokens
  // (scripts/token-map.ts), so a token can never name a face nobody loaded.
  const [fontsLoaded, fontError] = useFonts(fonts);

  // The audio session is app-wide rather than per-player, so it is set once here and
  // never again — see src/infra/audio/audio-session.ts for what was chosen and why. It
  // resolves either way and nothing waits on it: a refused session degrades playback, it
  // does not stop the app from opening.
  useEffect(() => {
    void configureAudioSession();
  }, []);

  // The reminder window only rolls forward when the app is in hand — that is the
  // whole 60-day silence design (src/usecases/reminder-plan.ts) — so it is replanned
  // once here and again on every return to the foreground. Fire-and-forget for the
  // audio session's reason: a failed schedule loses a nudge, never the app.
  useEffect(() => {
    void syncReminders().catch(() => {});
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void syncReminders().catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  // A reminder tap lands on N2's pickup when it names a stop, and on the journey
  // for the plain daily line — never an error surface from a notification.
  useEffect(
    () =>
      onReminderResponse(stopId => {
        router.push(stopId === null ? '/journey' : `/pickup/${stopId}`);
      }),
    [router],
  );

  // Rendering Tibetan before its face is registered falls back to a system font
  // that may lack the script, which would make the spike report a false failure.
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {/*
       * The stack keeps the platform's own push animation, deliberately, and this is the
       * one place in the app where a motion token is NOT applied.
       *
       * Checked rather than assumed (2026-08-18): `animationDuration` is iOS-only and
       * applies to `slide_from_bottom`, `fade_from_bottom`, `fade` and `simple_push` — not
       * to `default`. Driving it from `duration.base` therefore means switching iOS to
       * `simple_push`, which the type's own documentation describes as the platform
       * animation "without shadow and native header transition". That is a worse push in
       * exchange for a number matching a token, and `docs/04` already says OS surfaces are
       * handed off rather than mocked. Screen-to-screen travel is the OS's; everything
       * inside a screen is ours and does use the tokens.
       */}
      <Stack screenOptions={{headerShown: false}} />
    </SafeAreaProvider>
  );
}
