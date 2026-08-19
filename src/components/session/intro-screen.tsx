/**
 * @fileoverview IntroScreen — the stop's front door.
 *
 * The stop's opening line, the outcome it promises, and the capabilities the
 * learner will leave with — rings, because none of them are met yet. One
 * button steps inside; nothing on this screen is graded.
 */

import {Text, View} from 'react-native';

import {Button} from '../core/button';
import {CapabilityList} from '../learning/capability-list';

export type IntroScreenProps = {
  /** The stop's opening line. */
  text: string;
  /** What the learner will be able to do afterwards; empty hides the line. */
  outcome: string;
  capabilities: readonly string[];
  onContinue: () => void;
};

/** The intro entry of a stop session. */
export function IntroScreen({text, outcome, capabilities, onContinue}: IntroScreenProps) {
  return (
    <View className="gap-6 py-6">
      <Text accessibilityRole="header" className="type-title text-fg-heading">
        {text}
      </Text>
      {outcome ? <Text className="type-body text-fg-body">{outcome}</Text> : null}
      <CapabilityList marker="ring" items={capabilities.map(capability => ({capability}))} />
      <Button onPress={onContinue}>Step inside</Button>
    </View>
  );
}
