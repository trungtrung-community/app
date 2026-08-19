/**
 * @fileoverview NoteCard — an aside between entries.
 *
 * A paragraph of context the walk wants said out loud — usage, register, a
 * cultural beat — and a Continue. Nothing to answer.
 */

import {Text, View} from 'react-native';

import {Button} from '../core/button';

export type NoteCardProps = {
  text: string;
  onContinue: () => void;
};

/** The note entry of a stop session. */
export function NoteCard({text, onContinue}: NoteCardProps) {
  return (
    <View className="gap-6 py-6">
      <Text className="type-body text-fg-body">{text}</Text>
      <Button onPress={onContinue}>Continue</Button>
    </View>
  );
}
