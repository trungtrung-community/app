/**
 * @fileoverview TabBar — the app's four destinations.
 *
 * Four, and it never grows. Speak and Read are not tabs: they are a `SegmentedControl`
 * inside Journey, which is the decision that keeps this bar at four forever.
 *
 * A filled white bar with no top border and no translucency — the protection gradient
 * above it does the separating, in keeping with a system that separates by fill value.
 */

import {Pressable, Text, View, type StyleProp, type ViewStyle} from 'react-native';

import {color, fontSize, layout, tracking} from '../../theme/tokens.generated';
import {Icon, type IconName} from './icon';

export type Tab = {
  id: string;
  icon: IconName;
  label: string;
};

/** The four destinations, in order. */
export const TABS: readonly Tab[] = [
  {id: 'journey', icon: 'route', label: 'Journey'},
  {id: 'practice', icon: 'gauge', label: 'Practice'},
  {id: 'collection', icon: 'sparkles', label: 'Collection'},
  {id: 'you', icon: 'user', label: 'You'},
];

/** `--tracking-caps` is 0.08em; React Native needs it in points at the label's size. */
const CAPS_TRACKING = parseFloat(tracking.caps) * fontSize['2xs'];

export type TabBarProps = {
  active?: string;
  tabs?: readonly Tab[];
  onSelect?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The bottom bar.
 *
 * @example <TabBar active="journey" onSelect={go} />
 */
export function TabBar({active = 'journey', tabs = TABS, onSelect, style, testID}: TabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      className="w-full flex-none flex-row items-stretch bg-surface-card"
      style={[BAR_HEIGHT, style]}
      testID={testID}
    >
      {tabs.map(tab => {
        const on = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{selected: on}}
            accessibilityLabel={tab.label}
            onPress={onSelect ? () => onSelect(tab.id) : undefined}
            className="flex-1 items-center justify-center gap-[3px]"
          >
            <Icon name={tab.icon} size={28} color={on ? ACTIVE : INACTIVE} />
            <Text
              className={`type-label uppercase ${on ? 'text-fg-accent' : 'text-fg-muted'}`}
              style={{letterSpacing: CAPS_TRACKING}}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const ACTIVE = color.teal700;
const INACTIVE = color.ink400;
const BAR_HEIGHT: ViewStyle = {height: layout.tabbarHeight};
