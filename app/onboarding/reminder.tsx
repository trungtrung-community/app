/**
 * @fileoverview O4 A reminder — one ask, one sentence, 19:00 pre-selected.
 *
 * The decline is a ghost button, not a diminished pill: saying no is a full
 * choice, styled as one. Either answer finishes onboarding — the day is
 * stamped on `onboardedOn` and the flow replaces itself with the journey, so
 * back cannot walk into a finished flow.
 *
 * No system permission dialog fires here. That wiring lands with the
 * notifications work (N1's primer owns the ask); this screen only records what
 * the learner wants, and declining keeps the chosen time so a later change of
 * heart in Settings starts from it.
 */

import {useRouter} from 'expo-router';
import {useState} from 'react';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../src/components/core/button';
import {Select} from '../../src/components/forms/select';
import {toIsoDate} from '../../src/domain/date';
import {useSettings} from '../../src/store/settings';

/** The board's four times, on the wall clock. 19:00 is the pre-selection. */
const TIMES = ['08:00', '13:00', '19:00', '21:30'] as const;

export default function Reminder() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [time, setTime] = useState<string>('19:00');

  const finish = (enabled: boolean) => {
    // The defaults are unreachable while `time` comes from TIMES; they satisfy
    // the indexed-access check without a non-null assertion.
    const [hour = 19, minute = 0] = time.split(':').map(Number);
    void useSettings.getState().set({
      reminder: {enabled, hour, minute},
      onboardedOn: toIsoDate(new Date()),
    });
    router.replace('/journey');
  };

  return (
    <View
      className="flex-1 bg-surface-app px-5"
      style={{paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24}}
    >
      <Text accessibilityRole="header" className="type-title text-fg-heading">
        Want a nudge once a day?
      </Text>
      <View className="mt-6">
        <Select label="Time" value={time} options={TIMES} onChange={setTime} />
      </View>
      <View className="flex-1" />
      <View className="gap-2h">
        <Button size="lg" fullWidth onPress={() => finish(true)}>
          Yes, remind me
        </Button>
        <Button variant="ghost" size="lg" fullWidth onPress={() => finish(false)}>
          No thanks
        </Button>
      </View>
    </View>
  );
}
