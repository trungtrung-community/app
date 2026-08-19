/**
 * @fileoverview You — the profile hub (P1).
 *
 * Placeholder until the You package lands.
 */

import {View} from 'react-native';

import {EmptyState} from '../../../src/components/feedback/empty-state';

export default function You() {
  return (
    <View className="flex-1 items-center justify-center bg-surface-app">
      <EmptyState title="Your walk, kept">
        Days walking, words met, and settings arrive here.
      </EmptyState>
    </View>
  );
}
