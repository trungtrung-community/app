/**
 * @fileoverview NoteCard — an aside between entries, in four registers.
 *
 * The Read track's teaching surfaces are not one paragraph: a rule card is a
 * keepsake being handed over, a rule statement (RS1) is the rule arriving
 * before the items that need it, a reprise (RR1) is something the learner
 * already owns coming back, and a tip is a quiet observation. The prose
 * contract (docs/04) binds the rule surfaces: one sentence, stated plainly —
 * anything longer is two rules or not understood yet. Nothing here is
 * answered; one Continue moves on.
 */

import {Text, View, type ViewStyle} from 'react-native';

import {Badge} from '../core/badge';
import {Button} from '../core/button';
import {mixedTibetan} from '../learning/tibetan-text';
import {color, radius, space} from '../../theme/tokens.generated';
import type {NoteKind} from './types';

export type NoteCardProps = {
  text: string;
  /** Which register the note speaks in. Defaults to the tip's quiet one. */
  note?: NoteKind;
  onContinue: () => void;
};

/** The rule spoken as RS1 draws it: the eyebrow, then the one sentence. */
function RuleBody({eyebrow, text}: {eyebrow: string; text: string}) {
  return (
    <View className="gap-3">
      <Text className="type-label uppercase text-fg-subtle">{eyebrow}</Text>
      <Text className="type-heading text-fg-heading">{mixedTibetan(text, 'md')}</Text>
    </View>
  );
}

/** The note entry of a stop session. */
export function NoteCard({text, note = 'tip', onContinue}: NoteCardProps) {
  return (
    <View className="gap-6 py-6">
      {note === 'rule-card' ? (
        // The keepsake register: the same sentence, framed as a card the
        // learner can come back to.
        <View style={CARD}>
          <RuleBody eyebrow="The rule" text={text} />
        </View>
      ) : note === 'rule-statement' ? (
        <RuleBody eyebrow="The rule" text={text} />
      ) : note === 'rule-reprise' ? (
        <View className="gap-3">
          <Badge tone="soft">You know this one</Badge>
          <Text className="type-heading text-fg-heading">{mixedTibetan(text, 'md')}</Text>
        </View>
      ) : (
        <Text className="type-body text-fg-body">{mixedTibetan(text)}</Text>
      )}
      <Button onPress={onContinue}>Continue</Button>
    </View>
  );
}

const CARD: ViewStyle = {
  backgroundColor: color.surfaceCard,
  borderRadius: radius.xl,
  padding: space['5'],
};
