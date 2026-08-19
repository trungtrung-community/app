/**
 * @fileoverview You — about (P8).
 *
 * The app's name and the content build it is running, so a learner reporting a
 * gap can say which build they saw it in. Licence text is a known open gap and
 * is not invented here.
 */

import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {EmptyState} from '../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../src/components/feedback/skeleton';

import {useContent} from '../../../src/store/use-content';

export default function About() {
  const insets = useSafeAreaInsets();
  const load = useContent(source => source.contentVersion(), []);

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="items-center gap-2 px-5 pb-8" style={{paddingTop: insets.top}}>
        <Text accessibilityRole="header" className="type-heading text-fg-heading">
          Trungtrung
        </Text>
        {load.status === 'loading' ? <Skeleton shape="text" width={160} /> : null}
        {load.status === 'error' ? <EmptyState title="Try that again" /> : null}
        {load.status === 'ready' ? (
          <Text className="type-caption text-fg-muted">{`Content version ${load.data}`}</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
