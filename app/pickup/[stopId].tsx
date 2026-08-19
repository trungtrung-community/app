/**
 * @fileoverview N2 Opened from a notification — the deep-link landing.
 *
 * The board's rules: the tap lands in the stop the notification named, never the
 * top of the map; the stop name binds to curriculum data, never typed; one tap
 * back to the journey, no interstitial; *Pick it up* hands over to the stop route
 * (S4·r shows itself there when a snapshot exists — that is the stop store's
 * wiring, not this screen's).
 *
 * A stale notification may name a stop the content set no longer has. That is a
 * quiet redirect to the journey — a learner who tapped a reminder must never be
 * met by an error screen.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {useEffect} from 'react';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../src/components/core/button';
import {IconButton} from '../../src/components/core/icon-button';
import {Skeleton} from '../../src/components/feedback/skeleton';
import type {StopId} from '../../src/ports/content-ids';
import {useContent} from '../../src/store/use-content';

export default function Pickup() {
  const {stopId} = useLocalSearchParams<{stopId: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // A route param is a raw string; the brand is restored at the boundary, as the
  // stop route does.
  const stop = useContent(c => c.getStop(stopId as StopId), [stopId]);

  // The quiet redirect. `getStop` throws for an unknown id, so `error` is exactly
  // the stale-notification case — a deliberate deviation from the EmptyState
  // convention, for the reason the header gives.
  useEffect(() => {
    if (stop.status === 'error') {
      router.replace('/journey');
    }
  }, [stop.status, router]);

  return (
    <View
      className="flex-1 bg-surface-app px-6"
      style={{paddingTop: insets.top, paddingBottom: insets.bottom + 20}}
    >
      <View className="flex-row items-center py-2">
        <IconButton
          icon="x"
          label="Back to the journey"
          onPress={() => router.replace('/journey')}
        />
      </View>
      <View className="flex-1 items-center justify-center gap-2">
        {stop.status === 'ready' ? (
          <>
            {stop.data.district !== null && (
              <Text className="type-label text-fg-muted text-center">{stop.data.district}</Text>
            )}
            <Text accessibilityRole="header" className="type-title text-fg-heading text-center">
              {stop.data.name}
            </Text>
            <Text className="type-body text-fg-muted text-center">
              A few quiet minutes, whenever you are ready.
            </Text>
          </>
        ) : (
          <>
            <Skeleton shape="text" width={120} />
            <Skeleton shape="text" width={220} />
          </>
        )}
      </View>
      <Button
        size="lg"
        fullWidth
        disabled={stop.status !== 'ready'}
        onPress={() => router.replace(`/stop/${stopId}`)}
      >
        Pick it up
      </Button>
    </View>
  );
}
