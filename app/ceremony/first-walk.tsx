/**
 * @fileoverview J3 → J4, the first walk complete and the return — two beats,
 * one route.
 *
 * J3 is the arrival: the product's one full-bleed teal panel, and the white
 * pill survives only here as the inverse primary on teal. J4 is the return,
 * explained once in the app's own terms — the second walk crosses the same
 * districts on new stops, and nothing is replayed. The crane flies on J4 and
 * only there; the flight asset does not exist yet, so a fixed-size neutral
 * block holds its place (docs/09 gap 6).
 *
 * The beat is local page state, not navigation state: going from the arrival to
 * the return does not go anywhere.
 *
 * Reachable by URL only for now — a later task wires the stop screen's onDone
 * to `afterStop` and routes here.
 */

import {useRouter} from 'expo-router';
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../src/components/core/button';
import {StatPill} from '../../src/components/learning/stat-pill';

import {useContent} from '../../src/store/use-content';

export default function FirstWalkCeremony() {
  const [beat, setBeat] = useState<'arrival' | 'return'>('arrival');
  return beat === 'arrival' ? <Arrival onContinue={() => setBeat('return')} /> : <Return />;
}

/** J3 — the arrival, before the return. */
function Arrival({onContinue}: {onContinue: () => void}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 items-center justify-center gap-4 bg-teal-600 px-7"
      style={{paddingTop: insets.top, paddingBottom: insets.bottom + 24}}
    >
      <Text accessibilityRole="header" className="type-title text-fg-on-accent text-center">
        The first walk is complete.
      </Text>
      <Text className="type-body text-fg-on-accent text-center">
        Every district, every stop of the first circuit. You have walked the whole way there.
      </Text>
      {/* The white pill: the inverse primary on teal, which exists only on this panel. */}
      <Pressable
        accessibilityRole="button"
        onPress={onContinue}
        className="mt-4 h-14 items-center justify-center rounded-full bg-ground-000 px-7"
      >
        <Text className="type-body-strong text-fg-accent">Now, the way back</Text>
      </Pressable>
    </View>
  );
}

/** J4 — the return, explained once. */
function Return() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const load = useContent(async source => source.listDistricts(), []);

  return (
    <View
      className="flex-1 items-center justify-center gap-4 bg-surface-app px-7"
      style={{paddingTop: insets.top, paddingBottom: insets.bottom + 24}}
    >
      {/* Holds the crane-in-flight cutout's place until the asset exists. */}
      <View testID="crane-placeholder" className="h-44 w-44 rounded-lg bg-ground-200" />
      <Text accessibilityRole="header" className="type-title text-fg-heading text-center">
        The walk turns around.
      </Text>
      <Text className="type-body text-fg-body text-center">
        The second walk crosses the same districts again, on new stops. Nothing is replayed — the
        way back is deeper words and longer phrases, on ground you already know.
      </Text>
      {load.status === 'ready' ? (
        <StatPill value={String(load.data.length)} label="Districts to cross again" tone="accent" />
      ) : null}
      <Button variant="primary" size="lg" fullWidth onPress={() => router.replace('/journey')}>
        Walk on
      </Button>
    </View>
  );
}
