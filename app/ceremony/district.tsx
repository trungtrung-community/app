/**
 * @fileoverview S9 district finished — the one celebration, walk-scoped.
 *
 * A stack-root route with no tab bar, like the stop screen. The copy is scoped
 * to the circuit that closed: the first-walk variant never says "complete",
 * because the second walk comes back this way, and only the second-walk variant
 * closes the district for good. The heading carries the product's one
 * exclamation mark.
 *
 * Reachable by URL only for now — a later task wires the stop screen's onDone
 * to `afterStop` and routes here.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../src/components/core/button';
import {Icon} from '../../src/components/core/icon';
import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {CapabilityList} from '../../src/components/learning/capability-list';

import {useContent} from '../../src/store/use-content';
import {color} from '../../src/theme/tokens.generated';

export default function DistrictCeremony() {
  const {slug, circuit} = useLocalSearchParams<{slug: string; circuit: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const circuitNumber = Number(circuit);
  const secondWalk = circuitNumber >= 2;

  const load = useContent(
    async source => {
      const [district, stops] = await Promise.all([
        source.getDistrict(slug),
        source.listStopsByDistrict(slug),
      ]);
      return {district, stops: stops.filter(stop => stop.circuit === circuitNumber)};
    },
    [slug, circuitNumber],
  );

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View
        className="items-center gap-4 px-5 pb-8"
        style={{paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32}}
      >
        {load.status === 'loading' ? <CeremonySkeleton /> : null}
        {load.status === 'error' ? (
          <EmptyState title="That district is off the map">
            Head back to the journey and pick the walk up from there.
          </EmptyState>
        ) : null}
        {load.status === 'ready' ? (
          <>
            <Icon name="map-pin" size={28} color={color.textAccent} />
            <Text accessibilityRole="header" className="type-title text-fg-heading text-center">
              {/* adherence-allow: exclamation — this is S9, the one screen that owns it. */}
              {`${load.data.district.name}, ${secondWalk ? 'complete' : 'walked'}!`}
            </Text>
            <Text className="type-body text-fg-body text-center">
              {secondWalk
                ? 'Both circuits are behind you. This district closes for good, and it is yours.'
                : 'Every stop on this circuit is behind you. The second walk comes back this way with new stops — this district has more to say yet.'}
            </Text>
            <CapabilityList
              items={load.data.stops.map(stop => ({capability: stop.outcome}))}
              style={{alignSelf: 'stretch'}}
            />
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.replace('/journey')}
            >
              Walk on
            </Button>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function CeremonySkeleton() {
  return (
    <View className="items-center gap-4 self-stretch">
      <Skeleton shape="text" width={220} />
      <Skeleton shape="text" width={280} />
      <Skeleton shape="block" height={180} />
    </View>
  );
}
