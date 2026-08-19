/**
 * @fileoverview E2 — the phrase sheet.
 *
 * The phrase whole: Tibetan, romanization, gloss, the literal reading where the
 * parts do not add up, the usage note, and — where the content has chunked it —
 * the syllable transcript. A sheet for reading, nothing more: the V2→V3 practice
 * entry was removed by design on 2026-08-15.
 */

import {useLocalSearchParams} from 'expo-router';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {TibetanText} from '../../src/components/learning/tibetan-text';
import {TranscriptRow} from '../../src/components/learning/transcript-row';
import type {PhraseId} from '../../src/ports/content-ids';

import {useSettings} from '../../src/store/settings';
import {useContent} from '../../src/store/use-content';

export default function Phrase() {
  const {id} = useLocalSearchParams<{id: string}>();
  const insets = useSafeAreaInsets();
  const settings = useSettings(s => s.settings);

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
                wylie={settings?.wylie ? (load.data.phrase.wylie ?? undefined) : undefined}
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
            {load.data.phrase.chunks.length > 0 ? (
              <TranscriptRow
                testID="phrase-transcript"
                syllables={load.data.phrase.chunks.map(chunk => ({
                  bo: chunk.bo,
                  roman: chunk.roman ?? '',
                }))}
              />
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
