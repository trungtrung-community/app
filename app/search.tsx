/**
 * @fileoverview Y4 — search across words and phrases.
 *
 * One route at the stack root: search is reached from the You hub and from a
 * district hub's search icon, and a single deep-linkable screen serves both. Rows
 * push the word or phrase sheet.
 */

import {useRouter} from 'expo-router';
import {useDeferredValue, useState} from 'react';
import {ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {EmptyState} from '../src/components/feedback/empty-state';
import {Skeleton} from '../src/components/feedback/skeleton';
import {SearchField} from '../src/components/forms/search-field';
import {SectionHeader} from '../src/components/learning/section-header';
import {WordRow} from '../src/components/learning/word-row';
import type {PhraseItem, VocabularyItem} from '../src/ports/content-model';
import type {Progress} from '../src/ports/progress-store';

import {selectItemState, useProgress} from '../src/store/progress';
import {useContent} from '../src/store/use-content';

/** Below this the adapters would prefix-match half the dictionary. */
const MIN_QUERY = 2;
const RESULT_LIMIT = 25;

type Results = {
  readonly words: readonly VocabularyItem[];
  readonly phrases: readonly PhraseItem[];
};

export default function Search() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const settled = useDeferredValue(query);
  const progress = useProgress(s => s.progress);

  const load = useContent<Results | null>(
    async source => {
      const q = settled.trim();
      if (q.length < MIN_QUERY) {
        return null;
      }
      const [words, phrases] = await Promise.all([
        source.searchVocabulary(q, RESULT_LIMIT),
        source.searchPhrases(q, RESULT_LIMIT),
      ]);
      return {words, phrases};
    },
    [settled],
  );

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      <View className="px-5 py-3">
        <SearchField value={query} onChange={setQuery} onClear={() => setQuery('')} />
      </View>
      <ScrollView>
        <View className="gap-2 px-5 pb-8">
          {load.status === 'loading' ? <ResultSkeletons /> : null}
          {load.status === 'error' ? <EmptyState title="Try that search again" /> : null}
          {load.status === 'ready' && load.data === null ? (
            <EmptyState title="Every word on the walk is here">
              Search the Tibetan, the romanization, or the English.
            </EmptyState>
          ) : null}
          {load.status === 'ready' && load.data !== null ? (
            <ResultList
              results={load.data}
              progress={progress}
              onWord={id => router.push(`/word/${id}`)}
              onPhrase={id => router.push(`/phrase/${id}`)}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function ResultList({
  results,
  progress,
  onWord,
  onPhrase,
}: {
  results: Results;
  progress: Progress | null;
  onWord: (id: string) => void;
  onPhrase: (id: string) => void;
}) {
  const {words, phrases} = results;
  if (words.length === 0 && phrases.length === 0) {
    return (
      <EmptyState title="Nothing by that name yet">
        Try the romanization, or part of the English.
      </EmptyState>
    );
  }
  return (
    <>
      {words.length > 0 ? <SectionHeader align="start">Words</SectionHeader> : null}
      {words.map(word => (
        <WordRow
          key={word.id}
          bo={word.bo}
          roman={word.roman}
          en={word.en}
          status={selectItemState(progress, word.id)}
          register={word.register}
          audio={word.audio.available}
          onPress={() => onWord(word.id)}
        />
      ))}
      {phrases.length > 0 ? <SectionHeader align="start">Phrases</SectionHeader> : null}
      {phrases.map(phrase => (
        <WordRow
          key={phrase.id}
          bo={phrase.bo}
          roman={phrase.roman}
          en={phrase.en}
          status={selectItemState(progress, phrase.id)}
          register={phrase.register}
          audio={phrase.audio.available}
          onPress={() => onPhrase(phrase.id)}
        />
      ))}
    </>
  );
}

/** Loading keeps the shape of the rows it becomes. */
function ResultSkeletons() {
  return (
    <View className="gap-2">
      <Skeleton shape="text" />
      <Skeleton shape="text" />
      <Skeleton shape="text" />
    </View>
  );
}
