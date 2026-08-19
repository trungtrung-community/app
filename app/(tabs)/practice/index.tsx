/**
 * @fileoverview Practice — the practice home (Q1).
 *
 * Placeholder until the practice package lands. Q1 is a list, not a hub, and
 * its empty state is the screen — this copy stays close to that.
 */

import {View} from 'react-native';

import {EmptyState} from '../../../src/components/feedback/empty-state';

export default function Practice() {
  return (
    <View className="flex-1 items-center justify-center bg-surface-app">
      <EmptyState title="Practice grows as you walk">
        Each district you meet gathers here for review.
      </EmptyState>
    </View>
  );
}
