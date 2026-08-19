/**
 * @fileoverview O2 How much a day — the smallest option first and pre-selected.
 *
 * A deliberate refusal of the growth-hacked default: the pace a learner can
 * always meet beats the one they were flattered into, so "A few minutes" leads
 * the list and arrives already picked. Changing it later lives in Settings.
 */

import {useRouter} from 'expo-router';
import {useState} from 'react';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../src/components/core/button';
import {Card} from '../../src/components/core/card';
import {Radio} from '../../src/components/forms/radio';
import type {Settings} from '../../src/ports/settings-store';
import {useSettings} from '../../src/store/settings';
import {space} from '../../src/theme/tokens.generated';

type Pace = Settings['pace'];

/** Smallest first — the order is the stance, not a sort. Labels from the board's O2 frame. */
const PACES: readonly {value: Pace; label: string}[] = [
  {value: 'p5', label: 'A few minutes'},
  {value: 'p10', label: 'About ten minutes'},
  {value: 'p20', label: 'Twenty minutes'},
  {value: 'open', label: 'As much as I can'},
];

export default function PaceChoice() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pace, setPace] = useState<Pace>('p5');

  const carryOn = () => {
    void useSettings.getState().set({pace});
    router.push('/onboarding/audio');
  };

  return (
    <View
      className="flex-1 bg-surface-app px-5"
      style={{paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24}}
    >
      <Text accessibilityRole="header" className="type-title text-fg-heading">
        How much a day?
      </Text>
      <Card padding="sm" style={STACK_GAP}>
        <View accessibilityRole="radiogroup">
          {PACES.map(option => (
            <Radio
              key={option.value}
              label={option.label}
              value={option.value}
              checked={pace === option.value}
              onChange={() => setPace(option.value)}
            />
          ))}
        </View>
      </Card>
      <Text className="type-caption text-fg-subtle mt-2h">
        {"This shapes the day's suggestion — change it any time in Settings."}
      </Text>
      <View className="flex-1" />
      <Button size="lg" fullWidth onPress={carryOn}>
        Carry on
      </Button>
    </View>
  );
}

const STACK_GAP = {marginTop: space[4]};
