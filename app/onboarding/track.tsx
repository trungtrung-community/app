/**
 * @fileoverview K1 Track choice — three equal cards, pick then Carry on.
 *
 * None of the cards starts tinted: the board retired the pre-chosen teal
 * because it read as a default, and this screen has none. There is no fourth
 * card and no branch — K2 and K3 are parked, and v1 walks in order, so the
 * skip-ahead they belonged to stays unreachable.
 *
 * A selectable card is not in the design system, so the card composes the
 * system's own surfaces: `Card`'s fills on a `Pressable` announcing itself as
 * one radio of three.
 */

import {useRouter} from 'expo-router';
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../src/components/core/button';
import type {Settings} from '../../src/ports/settings-store';
import {useSettings} from '../../src/store/settings';

type Track = Settings['track'];

/** The three cards, verbatim from the board's K1 frame. */
const TRACKS: readonly {value: Track; title: string; body: string}[] = [
  {
    value: 'speak',
    title: 'Speak Tibetan',
    body: 'Say something useful at every stop. Pronunciation in Latin letters.',
  },
  {
    value: 'read',
    title: 'Read the script',
    body: 'Thirty letters, then how they stack.',
  },
  {
    value: 'both',
    title: 'Both',
    body: 'Two routes through one walk. Switch between them any time.',
  },
];

export default function TrackChoice() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<Track | null>(null);

  const carryOn = () => {
    if (picked === null) {
      return;
    }
    void useSettings.getState().set({track: picked});
    router.push('/onboarding/pace');
  };

  return (
    <View
      className="flex-1 bg-surface-app px-5"
      style={{paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24}}
    >
      <Text accessibilityRole="header" className="type-title text-fg-heading">
        What do you want first?
      </Text>
      <View accessibilityRole="radiogroup" className="mt-4 gap-3">
        {TRACKS.map(track => {
          const on = picked === track.value;
          return (
            <Pressable
              key={track.value}
              accessibilityRole="radio"
              aria-checked={on}
              accessibilityLabel={track.title}
              accessibilityHint={track.body}
              onPress={() => setPicked(track.value)}
              className={`rounded-card p-5 ${on ? 'bg-surface-accent-soft' : 'bg-surface-card'}`}
            >
              <Text className="type-body-strong text-fg-heading">{track.title}</Text>
              <Text className="type-caption text-fg-muted mt-1">{track.body}</Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-1" />
      {/* The disabled state's reason is the screen itself: the question above three
          unpicked cards. Picking any card is what arms the button. */}
      <Text className="type-caption text-fg-subtle mb-2h text-center">
        You can change this any time.
      </Text>
      <Button size="lg" fullWidth disabled={picked === null} onPress={carryOn}>
        Carry on
      </Button>
    </View>
  );
}
