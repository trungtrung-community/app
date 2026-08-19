/**
 * @fileoverview You — the profile hub (P1).
 *
 * Six doors: what has been learned, where, and the controls over how it is shown
 * and kept. Days walking sits above them because it is the one count every other
 * number on this tab is built from.
 */

import {useRouter} from 'expo-router';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import type {IconName} from '../../../src/components/core/icon';
import {ListRow} from '../../../src/components/core/list-row';
import {useProgress} from '../../../src/store/progress';

type Destination = {
  readonly label: string;
  /** One sentence. `ListRow.sub` allows no more. */
  readonly sub: string;
  readonly icon: IconName;
  readonly href: string;
};

const DESTINATIONS: readonly Destination[] = [
  {
    label: 'Stats',
    sub: 'Words met and known, and stops completed.',
    icon: 'gauge',
    href: '/you/stats',
  },
  {
    label: 'District progress',
    sub: 'How each district is going.',
    icon: 'route',
    href: '/you/districts',
  },
  {label: 'Search', sub: 'Find any word or phrase you have met.', icon: 'search', href: '/search'},
  {
    label: 'Settings',
    sub: 'The spelled-out Wylie line, and what follows it.',
    icon: 'sliders-horizontal',
    href: '/you/settings',
  },
  {
    label: 'Your data',
    sub: 'Back up or clear what is stored on this device.',
    icon: 'download',
    href: '/you/data',
  },
  {
    label: 'About',
    sub: 'The app, and the content build it runs on.',
    icon: 'info',
    href: '/you/about',
  },
];

export default function You() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const walkedOn = useProgress(s => s.progress?.walkedOn.length ?? 0);

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-2 px-5 pb-8" style={{paddingTop: insets.top}}>
        <View className="items-center gap-1 py-6">
          <Text accessibilityRole="header" className="type-heading text-fg-heading">
            {`Days walking · ${walkedOn}`}
          </Text>
        </View>
        <View className="gap-2">
          {DESTINATIONS.map(destination => (
            <ListRow
              key={destination.href}
              label={destination.label}
              sub={destination.sub}
              icon={destination.icon}
              onPress={() => router.push(destination.href)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
