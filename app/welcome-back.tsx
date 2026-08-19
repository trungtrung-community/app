/**
 * @fileoverview O5 Welcome back — the returning learner's landing. No guilt.
 *
 * The board's lines, in order: the days-walking count, and the parked stop by
 * name when a snapshot exists. The board's third line — how many items are
 * waiting — is omitted until the review loop surfaces its due count; it binds
 * when the drill planner lands, not here. The crane the board draws is absent
 * for the reason S1 gives: no mascot art exists in the repo yet.
 *
 * Carry on resumes the parked stop when one exists and otherwise goes to the
 * journey; Review first goes to the practice list. Both replace, so the
 * welcome does not stack under its destination.
 */

import {useRouter} from 'expo-router';
import {useEffect, useState} from 'react';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../src/components/core/button';
import {appState} from '../src/composition/container';
import type {StopId} from '../src/ports/content-ids';
import {useProgress} from '../src/store/progress';
import {useContent} from '../src/store/use-content';

export default function WelcomeBack() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const walkedDays = useProgress(s => s.progress?.walkedOn.length ?? 0);
  const [parkedStopId, setParkedStopId] = useState<StopId | null>(null);

  useEffect(() => {
    // Fire-and-forget, as the tab layout does: pre-hydration the count reads 0
    // and corrects itself when the snapshot lands.
    void useProgress
      .getState()
      .hydrate()
      .catch(() => {});
    let live = true;
    appState()
      .then(store => store.load())
      .then(
        state => {
          if (live && state.session !== null) {
            // A snapshot's stopId is stored as a plain string; the brand is
            // restored at the boundary, as the stop route does.
            setParkedStopId(state.session.stopId as StopId);
          }
        },
        // Corrupt bookkeeping loses only continuity: nothing to resume.
        () => {},
      );
    return () => {
      live = false;
    };
  }, []);

  return (
    <View
      className="flex-1 items-center bg-surface-app px-6"
      style={{paddingTop: insets.top, paddingBottom: insets.bottom + 20}}
    >
      <View className="flex-1" />
      <Text accessibilityRole="header" className="type-title text-fg-heading text-center">
        {walkedDays === 1 ? '1 day walking.' : `${walkedDays} days walking.`}
      </Text>
      {parkedStopId !== null && <StoppedAtLine stopId={parkedStopId} />}
      <View className="flex-1" />
      <View className="w-full gap-2h">
        <Button
          size="lg"
          fullWidth
          onPress={() =>
            router.replace(parkedStopId === null ? '/journey' : `/stop/${parkedStopId}`)
          }
        >
          Carry on
        </Button>
        <Button variant="ghost" fullWidth onPress={() => router.replace('/practice')}>
          Review first
        </Button>
      </View>
    </View>
  );
}

/**
 * The parked stop, named. Mounted only when a snapshot exists, so the content
 * read never runs without an id; loading and error simply hold the line back.
 */
function StoppedAtLine({stopId}: {stopId: StopId}) {
  const stop = useContent(c => c.getStop(stopId), [stopId]);
  if (stop.status !== 'ready') {
    return null;
  }
  return (
    <Text className="type-body text-fg-muted mt-2 text-center">
      {`You stopped at ${stop.data.name}.`}
    </Text>
  );
}
