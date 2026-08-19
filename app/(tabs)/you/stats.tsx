/**
 * @fileoverview You — stats (Y1).
 *
 * Counts, not scores: every taught item's state, days walked, and stops
 * finished, read straight off the progress snapshot. Before the engine has run
 * a single lesson these are honestly zero, and are shown as such.
 */

import {ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ListRow} from '../../../src/components/core/list-row';
import {selectCounts, useProgress} from '../../../src/store/progress';

export default function Stats() {
  const insets = useSafeAreaInsets();
  const progress = useProgress(s => s.progress);

  const counts = selectCounts(progress, Object.keys(progress?.items ?? {}));
  const walkedOn = progress?.walkedOn.length ?? 0;
  const stopsDone = progress?.completedStops.length ?? 0;

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-2 px-5 pb-8" style={{paddingTop: insets.top}}>
        <ListRow label="Words known" value={String(counts.known)} chevron={false} />
        <ListRow label="Words met" value={String(counts.met)} chevron={false} />
        <ListRow label="Days walking" value={String(walkedOn)} chevron={false} />
        <ListRow label="Stops completed" value={String(stopsDone)} chevron={false} />
      </View>
    </ScrollView>
  );
}
