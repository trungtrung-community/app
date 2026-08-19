/**
 * @fileoverview ItemCard — a card teaches one new thing.
 *
 * A WordCard with the session's framing around it: the eyebrow names what kind
 * of thing arrived, and one quiet Continue moves on. No confetti here — a card
 * reveal earns a quiet arrival, per docs/01.
 */

import {View} from 'react-native';

import {Button} from '../core/button';
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
    default:
      return 'New word';
  }
}

/** The card entry of a stop session. */
export function ItemCard({item, card, onContinue}: ItemCardProps) {
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
