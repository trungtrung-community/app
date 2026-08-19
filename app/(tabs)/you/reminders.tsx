/**
 * @fileoverview You — reminder settings (N3).
 *
 * The switch and the time, each writing the setting and re-syncing the schedule
 * in the same gesture, so what is pending on the device never lags what the
 * screen shows. Turning the switch on is the one place the system permission
 * prompt fires from Settings; `syncReminders` itself never asks.
 *
 * The board also draws a cadence card that honours the pace chosen in O2 — one
 * reminder a day for the small paces, maybe two for "as much as I can". That is
 * future work: the planner knows one cadence today, so drawing the card would
 * promise a behaviour the schedule does not have yet.
 */

import {useEffect} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Select} from '../../../src/components/forms/select';
import {Switch} from '../../../src/components/forms/switch';
import {requestReminderPermission, syncReminders} from '../../../src/composition/notifications';
import {DEFAULT_SETTINGS, type Settings} from '../../../src/ports/settings-store';
import {useSettings} from '../../../src/store/settings';

/** O4's four times, on the wall clock — the same list the learner first chose from. */
const TIMES = ['08:00', '13:00', '19:00', '21:30'] as const;

/** The reminder's wall-clock time in the option format, `HH:MM`. */
function toTimeValue(reminder: Settings['reminder']): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(reminder.hour)}:${pad(reminder.minute)}`;
}

export default function Reminders() {
  const insets = useSafeAreaInsets();
  const reminder = useSettings(s => s.settings?.reminder ?? DEFAULT_SETTINGS.reminder);

  // Fire-and-forget: pre-hydration the controls read the defaults, and a
  // platform without the native store keeps that answer rather than crashing.
  useEffect(() => {
    useSettings
      .getState()
      .hydrate()
      .catch(() => {});
  }, []);

  // Write, then re-sync, so the pending window follows the setting immediately.
  // A disabled reminder syncs too: the seam's empty plan is what clears it.
  const change = async (next: Settings['reminder']): Promise<void> => {
    await useSettings.getState().set({reminder: next});
    await syncReminders();
  };

  const toggle = (enabled: boolean): void => {
    void (async () => {
      if (enabled) {
        await requestReminderPermission();
      }
      await change({...reminder, enabled});
    })();
  };

  const changeTime = (time: string): void => {
    // The defaults are unreachable while `time` comes from TIMES; they satisfy
    // the indexed-access check without a non-null assertion.
    const [hour = 19, minute = 0] = time.split(':').map(Number);
    void change({...reminder, hour, minute});
  };

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="px-5 pb-8" style={{paddingTop: insets.top}}>
        <View className="items-center gap-1 py-6">
          <Text accessibilityRole="header" className="type-heading text-fg-heading">
            Reminders
          </Text>
        </View>
        <View className="gap-4">
          <Switch label="Remind me" checked={reminder.enabled} onChange={toggle} />
          <Select
            label="Time"
            value={toTimeValue(reminder)}
            options={TIMES}
            onChange={changeTime}
          />
        </View>
      </View>
    </ScrollView>
  );
}
