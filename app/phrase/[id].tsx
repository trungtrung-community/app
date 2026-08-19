/**
 * @fileoverview E2 — the phrase sheet, minimal first pass.
 *
 * The phrase whole: Tibetan, romanization, gloss, the literal reading where the
 * parts do not add up, and the usage note. The transcript row (A4) and practice
 * entry arrive with the district-hub package.
 */

import {useLocalSearchParams} from 'expo-router';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {TibetanText} from '../../src/components/learning/tibetan-text';
import type {PhraseId} from '../../src/ports/content-ids';

import {useContent} from '../../src/store/use-content';

export default function Phrase() {
  const {id} = useLocalSearchParams<{id: string}>();
  const insets = useSafeAreaInsets();

  const load = useContent(
    async source => {
      // A route param is a raw string; the brand is restored here, at the boundary.
      const phrase = await source.getPhrase(id as PhraseId);
      const district = await source.getDistrict(phrase.district);
      return {phrase, district};
    },
    [id],
  );

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-4 px-5 pb-8" style={{paddingTop: insets.top}}>
        {load.status === 'loading' ? (
          <View className="items-center gap-4 py-6">
            <Skeleton shape="block" width={260} height={72} />
            <Skeleton shape="text" width={180} />
          </View>
        ) : null}
        {load.status === 'error' ? (
          <EmptyState title="That phrase is off the map">
            Search again from where you were.
          </EmptyState>
        ) : null}
        {load.status === 'ready' ? (
          <>
            <View className="items-center gap-2 py-6">
              <TibetanText
                size="lg"
                align="center"
                unit="auto"
                roman={load.data.phrase.roman}
                gloss={load.data.phrase.en}
              >
                {load.data.phrase.bo}
              </TibetanText>
            </View>
            {load.data.phrase.enLiteral ? (
              <Text className="type-body text-fg-muted">
                {`Literally: ${load.data.phrase.enLiteral}`}
              </Text>
            ) : null}
            {load.data.phrase.usageNote ? (
              <Text className="type-body text-fg-body">{load.data.phrase.usageNote}</Text>
            ) : null}
            <Text className="type-caption text-fg-muted">
              {`District ${load.data.district.number} · ${load.data.district.name}`}
            </Text>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}
