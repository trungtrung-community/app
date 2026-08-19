/**
 * @fileoverview MicPrimer — M1, the one screen before the system dialog.
 *
 * One reason and the privacy sentence, exactly as the board words them: the
 * system's microphone prompt names no purpose, so this screen carries the
 * purpose and the promise that decides the answer — nothing is sent, nothing
 * is kept. It renders in place of the exercise, once per device ever; the
 * caller persists `micPrimerSeen` so a learner is never primed twice.
 *
 * The board draws the crane above the copy; the mascot asset is not vendored
 * into the app yet, and the copy stands without it — the illustration follows
 * when the asset pipeline lands.
 */

import {Text, View} from 'react-native';

import {Button} from '../core/button';

export type MicPrimerProps = {
  /** The learner agreed — raise the system dialog now. */
  onAllow: () => void;
  /** The learner declined — back to the exercise, listening only. */
  onNotNow: () => void;
};

/** The microphone primer, shown before the system dialog ever appears. */
export function MicPrimer({onAllow, onNotNow}: MicPrimerProps) {
  return (
    <View className="gap-6 py-6">
      <Text className="type-title text-fg-heading">
        To compare your voice with a native speaker’s, the app needs the microphone.
      </Text>
      <Text className="type-body text-fg-body">
        Nothing is sent anywhere — and nothing is kept. Your recording plays once, for you, and is
        gone.
      </Text>
      <View className="gap-3">
        <Button onPress={onAllow}>Allow the microphone</Button>
        <Button variant="ghost" onPress={onNotNow}>
          Not now — just listen and repeat
        </Button>
      </View>
    </View>
  );
}
