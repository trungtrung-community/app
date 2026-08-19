/**
 * @fileoverview Journey — the map (S2 ⇄ R1).
 *
 * Placeholder until the map package lands. The copy points forward per the
 * `EmptyState` rule: it says what arrives, never that something is missing.
 */

import {View} from 'react-native';

import {EmptyState} from '../../../src/components/feedback/empty-state';

export default function Journey() {
  return (
    <View className="flex-1 items-center justify-center bg-surface-app">
      <EmptyState title="The walk starts here">
        The map of Lhasa arrives next, district by district.
      </EmptyState>
    </View>
  );
}
