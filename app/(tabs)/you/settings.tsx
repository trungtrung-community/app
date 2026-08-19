/**
 * @fileoverview You — settings (P2).
 *
 * One control today: whether word and phrase sheets show the Wylie spelling
 * line. Hydrates on mount the same way the tab layout hydrates progress, so the
 * switch reflects a setting saved in an earlier session rather than the default.
 */

import {useEffect} from 'react';
import {ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Switch} from '../../../src/components/forms/switch';
import {useSettings} from '../../../src/store/settings';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings(s => s.settings);

  // Fire-and-forget: pre-hydration the switch reads the default, off, and a
  // platform without the native store keeps that answer rather than crashing.
  useEffect(() => {
    useSettings
      .getState()
      .hydrate()
      .catch(() => {});
  }, []);

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-2 px-5 pb-8" style={{paddingTop: insets.top}}>
        <Switch
          label="Spelled out (Wylie)"
          description="Show the Wylie spelling line on word and phrase sheets."
          checked={settings?.wylie ?? false}
          onChange={wylie => {
            useSettings.getState().set({wylie});
          }}
        />
      </View>
    </ScrollView>
  );
}
