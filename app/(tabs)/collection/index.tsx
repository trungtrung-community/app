/**
 * @fileoverview Collection — the shelves (G1).
 *
 * Placeholder until the collection package lands.
 */

import {View} from 'react-native';

import {EmptyState} from '../../../src/components/feedback/empty-state';

export default function Collection() {
  return (
    <View className="flex-1 items-center justify-center bg-surface-app">
      <EmptyState title="Artifacts wait along the walk">
        What you find in the districts is kept here.
      </EmptyState>
    </View>
  );
}
