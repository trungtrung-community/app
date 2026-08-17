/**
 * @fileoverview The app's entry route.
 *
 * A placeholder while the design system is ported. The four real destinations —
 * Journey, Practice, Collection, You — arrive as a tab group once the components a
 * lesson stop needs exist.
 *
 * The Phase 0 Tibetan spike used to live here. Its findings are recorded in
 * docs/spikes/2026-08-17-tibetan-rendering.md and its specimens are now proper
 * gallery entries, so the throwaway screen is gone.
 */

import {Link} from 'expo-router';
import {Text, View} from 'react-native';

import {TibetanText} from '../src/components/learning/tibetan-text';

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-surface-app p-5">
      <TibetanText size="xl" align="center" roman="trashi delek" gloss="hello / greetings">
        བཀྲ་ཤིས་བདེ་ལེགས
      </TibetanText>
      <Link href="/_ds" className="type-body text-fg-link">
        <Text className="type-body text-fg-link">Design system →</Text>
      </Link>
    </View>
  );
}
