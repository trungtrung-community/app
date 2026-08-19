/**
 * @fileoverview S1 Onboarding — one screen, no login, no carousel.
 *
 * The name in both scripts, one line of promise, one Start. The quiet
 * "Restore a backup" line the board draws under Start is omitted until U3 lands
 * backup restore; it arrives with that task, not this one. The crane is absent
 * for the same reason `MascotSpeech` documents: no mascot art exists in the
 * repo yet.
 *
 * Settings hydrate here, fire-and-forget, so the steps that follow merge into
 * what an earlier partial run may have saved rather than into the defaults.
 */

import {useRouter} from 'expo-router';
import {useEffect} from 'react';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../src/components/core/button';
import {TibetanText} from '../../src/components/learning/tibetan-text';
import {useSettings} from '../../src/store/settings';
import {color} from '../../src/theme/tokens.generated';

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    useSettings
      .getState()
      .hydrate()
      .catch(() => {});
  }, []);

  return (
    <View
      className="flex-1 items-center bg-surface-app px-6"
      style={{paddingTop: insets.top, paddingBottom: insets.bottom + 20}}
    >
      <View className="flex-1" />
      <TibetanText size="sm" roman="trungtrung" textStyle={{color: color.textAccent}}>
        {'ཁྲུང་ཁྲུང་'}
      </TibetanText>
      <Text accessibilityRole="header" className="type-title text-fg-heading">
        Trungtrung
      </Text>
      <Text className="type-body text-fg-muted mt-2h text-center" style={{maxWidth: 280}}>
        Walk through Tibet. Learn what to say at every stop.
      </Text>
      <View className="flex-1" />
      <Button size="lg" fullWidth onPress={() => router.push('/onboarding/track')}>
        Start
      </Button>
    </View>
  );
}
