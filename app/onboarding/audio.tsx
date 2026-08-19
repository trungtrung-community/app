/**
 * @fileoverview O3 Audio primer — the brand moment, one Continue.
 *
 * Human recordings, all on the device from first launch. No download talk and
 * no size talk: the App Store listing owns the megabytes.
 *
 * The board draws a play control beside the greeting, keyed on the recording's
 * `available` flag — and that flag is false on every item today, because the
 * audio manifest lists only takes whose checksum verified (see
 * src/ports/content-ids.ts). A control that is hidden when there is no
 * recording is the design; one that is shown and fails, or shown disabled, is
 * not. When takes ship, the control returns with them.
 */

import {useRouter} from 'expo-router';
import {Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../src/components/core/button';
import {TibetanText} from '../../src/components/learning/tibetan-text';

export default function AudioPrimer() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-surface-app px-5"
      style={{paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24}}
    >
      <Text accessibilityRole="header" className="type-title text-fg-heading">
        Every word is recorded by a person.
      </Text>
      <Text className="type-body text-fg-body mt-3h" style={{maxWidth: 300}}>
        {"It's all on your phone — it works on the plane, up the pass, anywhere."}
      </Text>
      <View className="mt-6">
        <TibetanText size="md" roman="trashi delek" gloss="hello">
          {'བཀྲ་ཤིས་བདེ་ལེགས།'}
        </TibetanText>
      </View>
      <View className="flex-1" />
      <Button size="lg" fullWidth onPress={() => router.push('/onboarding/reminder')}>
        Continue
      </Button>
    </View>
  );
}
