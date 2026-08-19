/**
 * @fileoverview EndScreen — the stop closes on what the learner can now do.
 *
 * Capabilities first, with the filled check, because abilities are the unit
 * the product counts in. The word-and-phrase line is a quiet tally under it,
 * and the still-missed list is information with a Tibetan reading each — never
 * a grade. One Done hands control back to the route.
 *
 * A Read stop that ends on a contrast carries the R11 recap: every
 * combination this stop taught, one row per pair, bare beside affixed, the
 * changed ones marked. The system seen whole, once, at the moment the learner
 * has earned it — never padded to the full set, never scored.
 */

import {Text, View} from 'react-native';

import {Button} from '../core/button';
import {CapabilityList} from '../learning/capability-list';
import {ChangeRow} from '../learning/change-row';
import {TibetanText} from '../learning/tibetan-text';
import type {ContentItemId} from '../../ports/content-ids';
import type {Items, RecapPair} from './types';

export type EndScreenProps = {
  /** Item ids taught this session, words and phrases together. */
  taught: readonly string[];
  /** Item ids still missed after the second look. */
  stillMissed: readonly string[];
  capabilities: readonly string[];
  /** The R11 rows, for a Read stop that ends on a contrast. */
  recap?: readonly RecapPair[];
  itemsById: Items;
  onDone: () => void;
};

/** The end entry of a stop session. */
export function EndScreen({
  taught,
  stillMissed,
  capabilities,
  recap,
  itemsById,
  onDone,
}: EndScreenProps) {
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
      {recap !== undefined && recap.length > 0 ? (
        // R11: exactly the stop's own rows — never padded, never scored. The
        // screen scrolls with the route when the set is long.
        <View className="gap-3">
          <Text className="type-heading text-fg-heading">All of them, together</Text>
          {recap.map(pair => (
            <ChangeRow
              key={pair.itemId}
              bare={pair.bareBo}
              bareRoman={pair.bareRoman}
              to={pair.bo}
              toRoman={pair.roman}
              change={pair.changed ? 'changed' : 'unchanged'}
              size="md"
              audio={false}
            />
          ))}
        </View>
      ) : null}
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
