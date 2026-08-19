/**
 * @fileoverview The tab group — the app's four destinations.
 *
 * Uses the headless tabs API (`expo-router/ui`) rather than the react-navigation
 * tab bar, because the design system already owns the bar: `TabBar` draws the four
 * destinations and this layout only wires router state to it. The `TabList` is
 * hidden — it registers which routes are tabs; the visible bar is ours.
 */

import {useRouter, useSegments} from 'expo-router';
import {TabList, TabSlot, Tabs, TabTrigger} from 'expo-router/ui';
import {useEffect} from 'react';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {TABS, TabBar} from '../../src/components/core/tab-bar';
import {useProgress} from '../../src/store/progress';
import {useSettings} from '../../src/store/settings';

export default function TabsLayout() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  // Fire-and-forget: pre-hydration selectors answer as a first launch would, and a
  // platform without the native store keeps that answer rather than crashing.
  // Settings hydrate here too, so a persisted Wylie toggle reaches the word and
  // phrase sheets without the learner passing through the Settings screen first.
  useEffect(() => {
    useProgress
      .getState()
      .hydrate()
      .catch(() => {});
    useSettings
      .getState()
      .hydrate()
      .catch(() => {});
  }, []);

  // The active tab is whichever destination the current route sits under. The
  // group segment comes first, so the destination is the segment after it.
  const active = TABS.find(tab => segments.includes(tab.id))?.id ?? 'journey';

  return (
    <Tabs>
      <TabSlot />
      <TabList style={HIDDEN}>
        {TABS.map(tab => (
          <TabTrigger key={tab.id} name={tab.id} href={`/${tab.id}`}>
            <Text>{tab.label}</Text>
          </TabTrigger>
        ))}
      </TabList>
      <View className="bg-surface-card" style={{paddingBottom: insets.bottom}}>
        <TabBar active={active} onSelect={id => router.navigate(`/${id}`)} />
      </View>
    </Tabs>
  );
}

const HIDDEN = {display: 'none'} as const;
