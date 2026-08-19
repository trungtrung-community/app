/**
 * @fileoverview ItemCard — a card teaches one new thing.
 *
 * A WordCard with the session's framing around it: the eyebrow names what kind
 * of thing arrived, and one quiet Continue moves on. No confetti here — a card
 * reveal earns a quiet arrival, per docs/01.
 *
 * A stack takes SK1's shape instead: the assembled stack large through
 * StackDiagram, its reading beneath. The stack's slot parts are not drawn yet
 * — the item resolves through the exercise prompt today, which carries the
 * glyph and reading but not the decomposition; the ports task's StackSource
 * is what will fill the parts in.
 */

import {Text, View} from 'react-native';

import {Button} from '../core/button';
import {StackDiagram} from '../learning/stack-diagram';
import {WordCard} from '../learning/word-card';
import type {CardKind, Item} from './types';

export type ItemCardProps = {
  /** The taught item; undefined draws an empty card rather than crashing. */
  item: Item | undefined;
  card: CardKind;
  onContinue: () => void;
};

/** The eyebrow names what kind of thing arrived. */
function eyebrow(card: CardKind): string {
  switch (card) {
    case 'phrase':
      return 'New phrase';
    case 'letter':
      return 'New letter';
    case 'stack':
      return 'New stack';
    default:
      return 'New word';
  }
}

/** The card entry of a stop session. */
export function ItemCard({item, card, onContinue}: ItemCardProps) {
  if (card === 'stack') {
    return (
      <View className="gap-6 py-4">
        <Text className="type-label uppercase text-fg-subtle text-center">{eyebrow(card)}</Text>
        <StackDiagram stack={item?.bo ?? ''} roman={item?.roman} size="lg" showRoles={false} />
        <Button onPress={onContinue}>Continue</Button>
      </View>
    );
  }
  return (
    <View className="gap-6 py-4">
      <WordCard
        bo={item?.bo}
        roman={item?.roman}
        en={item?.en}
        eyebrow={eyebrow(card)}
        note={item !== undefined && 'usageNote' in item ? (item.usageNote ?? undefined) : undefined}
        registerMark={item !== undefined && 'register' in item && item.register === 'honorific'}
        audio={item !== undefined && 'audio' in item ? item.audio.available : false}
      />
      <Button onPress={onContinue}>Continue</Button>
    </View>
  );
}
