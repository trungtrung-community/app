/**
 * @fileoverview You — settings (P2).
 *
 * Only what changes how the app behaves lives here. Sound and vibration share
 * one row, exactly as the board draws them. The reminder row (N3) is not drawn
 * yet; it lands with notifications. Rows whose flows are unbuilt are absent,
 * never greyed. Hydrates on mount the same way the tab layout hydrates
 * progress, so each control reflects a setting saved in an earlier session
 * rather than the default.
 */

import {useRouter} from 'expo-router';
import {useEffect} from 'react';
import {ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ListRow} from '../../../src/components/core/list-row';
import {Switch} from '../../../src/components/forms/switch';
import {DEFAULT_SETTINGS, type Settings} from '../../../src/ports/settings-store';
import {useSettings} from '../../../src/store/settings';

/** What the tracks row already knows and can show without being opened. */
const TRACK_VALUES: Record<Settings['track'], string> = {
  speak: 'Speak',
  read: 'Read',
  both: 'Both',
};

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useSettings(s => s.settings);
  const current = settings ?? DEFAULT_SETTINGS;

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
      <View className="px-5 pb-8" style={{paddingTop: insets.top}}>
        <View className="gap-2">
          <Switch
            label="Spelled out (Wylie)"
            description="Show the Wylie spelling line on word and phrase sheets."
            checked={settings?.wylie ?? false}
            onChange={wylie => {
              useSettings.getState().set({wylie});
            }}
          />
          <Switch
            label="Sound and vibration on a right answer"
            checked={current.sound}
            onChange={on => {
              // One row moves both fields, as the board draws it: the off-switch
              // for the interface cues, never for the teaching recordings.
              useSettings.getState().set({sound: on, haptics: on});
            }}
          />
        </View>
        <View className="mt-4 gap-2">
          <Switch
            label="Practice without audio"
            description="Listening exercises run as their reading twins, and nothing marks the difference."
            checked={current.audioFree}
            onChange={audioFree => {
              useSettings.getState().set({audioFree});
            }}
          />
          <ListRow
            label="Your tracks"
            value={TRACK_VALUES[current.track]}
            onPress={() => router.push('/you/tracks')}
          />
        </View>
      </View>
    </ScrollView>
  );
}
