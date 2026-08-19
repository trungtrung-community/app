/**
 * @fileoverview EndScreen — the stop closes on what the learner can now do.
 *
 * Capabilities first, with the filled check, because abilities are the unit
 * the product counts in. The word-and-phrase line is a quiet tally under it,
 * and the still-missed list is information with a Tibetan reading each — never
 * a grade. One Done hands control back to the route.
 */

import {Text, View} from 'react-native';

import {Button} from '../core/button';
import {CapabilityList} from '../learning/capability-list';
import {TibetanText} from '../learning/tibetan-text';
import type {ContentItemId} from '../../ports/content-ids';
import type {Items} from './types';

export type EndScreenProps = {
  /** Item ids taught this session, words and phrases together. */
  taught: readonly string[];
  /** Item ids still missed after the second look. */
  stillMissed: readonly string[];
  capabilities: readonly string[];
  itemsById: Items;
  onDone: () => void;
};

/** The end entry of a stop session. */
export function EndScreen({taught, stillMissed, capabilities, itemsById, onDone}: EndScreenProps) {
  const words = taught.filter(id => {
    const item = itemsById.get(id as ContentItemId);
    return item !== undefined && 'wordId' in item;
  }).length;
  const phrases = taught.length - words;

  const counts = [
    words > 0 ? `${words} ${words === 1 ? 'word' : 'words'} met` : null,
    phrases > 0 ? `${phrases} ${phrases === 1 ? 'phrase' : 'phrases'} met` : null,
    stillMissed.length > 0 ? `${stillMissed.length} worth another look` : null,
  ]
    .filter(part => part !== null)
    .join(' · ');

  return (
    <View className="gap-6 py-6">
      <Text accessibilityRole="header" className="type-title text-fg-heading">
        Stop complete
      </Text>
      <CapabilityList marker="check" items={capabilities.map(capability => ({capability}))} />
      {counts ? <Text className="type-body text-fg-body">{counts}</Text> : null}
      {stillMissed.length > 0 ? (
        <View className="gap-1">
          {stillMissed.map(id => {
            const item = itemsById.get(id as ContentItemId);
            return item !== undefined ? (
              <TibetanText key={id} size="sm" roman={item.roman} gloss={item.en}>
                {item.bo}
              </TibetanText>
            ) : null;
          })}
        </View>
      ) : null}
      <Button onPress={onDone}>Done</Button>
    </View>
  );
}
