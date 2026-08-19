/**
 * @fileoverview V2 — the word sheet.
 *
 * The word whole: Tibetan, romanization, gloss, the register where it matters, the
 * "also written" row for a learner who met the THL spelling in a book, the district
 * the word meets you in, and the phrases it appears in.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Badge} from '../../src/components/core/badge';
import {Tag} from '../../src/components/core/tag';
import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {TibetanText} from '../../src/components/learning/tibetan-text';
import type {VocabId} from '../../src/ports/content-ids';

import {useSettings} from '../../src/store/settings';
import {useContent} from '../../src/store/use-content';

export default function Word() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useSettings(s => s.settings);

  const load = useContent(
    async source => {
      // A route param is a raw string; the brand is restored here, at the boundary.
      const word = await source.getVocabulary(id as VocabId);
      const district = await source.getDistrict(word.district);
      // searchPhrases cannot answer "which phrases hold this word" — the district's
      // own phrase list is filtered by chunk instead.
      const districtPhrases = await source.listPhrasesByDistrict(word.district);
      const appearsIn = districtPhrases.filter(phrase =>
        phrase.chunks.some(chunk => chunk.vocabRef === word.id),
      );
      return {word, district, appearsIn};
    },
    [id],
  );

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-4 px-5 pb-8" style={{paddingTop: insets.top}}>
        {load.status === 'loading' ? <SheetSkeleton /> : null}
        {load.status === 'error' ? (
          <EmptyState title="That word is off the map">
            Search again from where you were.
          </EmptyState>
        ) : null}
        {load.status === 'ready' ? (
          <>
            <View className="items-center gap-2 py-6">
              <TibetanText
                size="xl"
                align="center"
                unit="word"
                roman={load.data.word.roman}
                gloss={load.data.word.en}
                thl={load.data.word.thl ?? undefined}
                wylie={settings?.wylie ? (load.data.word.wylie ?? undefined) : undefined}
              >
                {load.data.word.bo}
              </TibetanText>
              {load.data.word.register === 'honorific' ? (
                <Badge tone="neutral">honorific</Badge>
              ) : null}
            </View>
            {load.data.word.enDefinition ? (
              <Text className="type-body text-fg-body">{load.data.word.enDefinition}</Text>
            ) : null}
            {load.data.word.culturalNote ? (
              <Text className="type-body text-fg-muted">{load.data.word.culturalNote}</Text>
            ) : null}
            {load.data.appearsIn.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {load.data.appearsIn.map(phrase => (
                  <Tag key={phrase.id} onPress={() => router.push(`/phrase/${phrase.id}`)}>
                    {phrase.roman}
                  </Tag>
                ))}
              </View>
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

/** Loading keeps the sheet's shape: a hero block, then lines. */
function SheetSkeleton() {
  return (
    <View className="items-center gap-4 py-6">
      <Skeleton shape="block" width={200} height={96} />
      <Skeleton shape="text" width={160} />
      <Skeleton shape="text" width={220} />
    </View>
  );
}
