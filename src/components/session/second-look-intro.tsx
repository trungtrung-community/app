/**
 * @fileoverview SecondLookIntro — the mascot announces the requeue round.
 *
 * "Two worth another look", worded rather than numeric, because this beat is
 * information and never a grade — the same clause that gives the end screen's
 * unmet list a ring instead of a cross.
 */

import {View} from 'react-native';

import {Button} from '../core/button';
import {MascotSpeech} from '../feedback/mascot-speech';

/** The counts the second-look line words, one through ten. */
const WORDED = [
  'None',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
] as const;

function worded(count: number): string {
  return WORDED[count] ?? `${count}`;
}

export type SecondLookIntroProps = {
  /** How many items come back for another look. */
  count: number;
  onContinue: () => void;
};

/** The second-look-intro entry of a stop session. */
export function SecondLookIntro({count, onContinue}: SecondLookIntroProps) {
  return (
    <View className="gap-6 py-6">
      <MascotSpeech>{`${worded(count)} worth another look.`}</MascotSpeech>
      <Button onPress={onContinue}>Carry on</Button>
    </View>
  );
}
