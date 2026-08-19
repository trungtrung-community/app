/**
 * @fileoverview ResumeIntro — re-entry carries on (S4·r).
 *
 * Shown once, before the queue, when a parked session was restored. The bar
 * above it already stands part-filled from the restored index; this frame only
 * says so and offers one way forward. The capabilities keep the ring marker —
 * none of them are met yet, exactly as the fresh intro draws them.
 */

import {Text, View} from 'react-native';

import {Button} from '../core/button';
import {CapabilityList} from '../learning/capability-list';

export type ResumeIntroProps = {
  stopName: string;
  capabilities: readonly string[];
  onCarryOn: () => void;
};

/** The S4·r interstitial, worded from the board frame. */
export function ResumeIntro({stopName, capabilities, onCarryOn}: ResumeIntroProps) {
  return (
    <View className="gap-6 py-6">
      <Text accessibilityRole="header" className="type-title text-fg-heading">
        {stopName}
      </Text>
      <Text className="type-body text-fg-muted">Carrying on where you left off.</Text>
      <CapabilityList marker="ring" items={capabilities.map(capability => ({capability}))} />
      <Button onPress={onCarryOn}>Carry on</Button>
    </View>
  );
}
