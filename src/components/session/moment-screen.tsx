/**
 * @fileoverview MomentScreen — the stop completes, and the one confetti falls.
 *
 * S12, the single signed exception to the no-confetti clause (docs/07,
 * 2026-08-08). The stop's name stands as the headline and the outcome reads
 * back as something now done. Mounting Confetti anywhere else breaks that
 * clause; this screen is its one home.
 */

import {useEffect} from 'react';
import {Text, View} from 'react-native';

import {cue} from '../../composition/cue';
import {Button} from '../core/button';
import {Confetti} from '../feedback/confetti';

export type MomentScreenProps = {
  stopName: string;
  /** The stop's outcome, read back in past achievement; empty hides the line. */
  outcome: string;
  onContinue: () => void;
};

/** The moment entry of a stop session. */
export function MomentScreen({stopName, outcome, onContinue}: MomentScreenProps) {
  // Once on mount, beside the one confetti: the parent mounts this entry
  // exactly once per session, so the cue fires exactly once per stop.
  useEffect(() => {
    cue('stop-complete');
  }, []);

  return (
    <View className="items-center gap-6 py-10">
      <Confetti />
      <Text accessibilityRole="header" className="type-title text-fg-heading text-center">
        {stopName}
      </Text>
      {outcome ? <Text className="type-body text-fg-body text-center">{outcome}</Text> : null}
      <Button onPress={onContinue}>Continue</Button>
    </View>
  );
}
