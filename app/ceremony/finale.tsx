/**
 * @fileoverview F-A there and back twice — the Speak finale, on quiet ground.
 *
 * Deliberately not a second full-bleed teal panel: J3 holds the only one. No
 * confetti either — that fires at S12 and nowhere else. The crane at rest and
 * the whole rail drawn small and complete land with the asset pass (docs/09
 * gap 6); until then the screen is the words and the two doors: keep
 * practising, or see the walk.
 *
 * Reachable by URL only for now — a later task wires the stop screen's onDone
 * to `afterStop` and routes here.
 */

import {useRouter} from 'expo-router';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../src/components/core/button';

export default function FinaleCeremony() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center justify-center gap-4 bg-surface-app px-7"
      style={{paddingTop: insets.top, paddingBottom: insets.bottom + 24}}
    >
      <Text accessibilityRole="header" className="type-title text-fg-heading text-center">
        There and back, twice.
      </Text>
      <Text className="type-body text-fg-body text-center">
        Every district, both circuits — the whole way there, and the whole way back. Both walks are
        behind you now.
      </Text>
      <View className="mt-4 gap-3 self-stretch">
        <Button variant="primary" size="lg" fullWidth onPress={() => router.replace('/practice')}>
          Keep practising
        </Button>
        <Button variant="ghost" size="lg" fullWidth onPress={() => router.replace('/you')}>
          See your walk
        </Button>
      </View>
    </View>
  );
}
