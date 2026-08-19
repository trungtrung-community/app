/**
 * @fileoverview L2 — the letter sheet: one letter, whole.
 *
 * The glyph large, its name, and its place in the script — the row and column
 * for one of the thirty, where the mark sits for a vowel, the value for a
 * numeral, recognition-only for the Sanskrit letters. Where the letter is also
 * a Speak word the learner knows, that word is a door.
 *
 * The board's fuller sheet — "what can attach" with its per-root counts,
 * "appears in" with decodable words, and the drill button — is the reverse
 * lookup over stacks, affixes and read-words, which needs port capabilities
 * the content source does not serve yet. Those blocks arrive with the ports
 * task; a consonant's vowel combinations are part of the same lookup and wait
 * with them.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Tag} from '../../src/components/core/tag';
import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {AudioButton} from '../../src/components/learning/audio-button';
import {TibetanText} from '../../src/components/learning/tibetan-text';
import type {LetterId} from '../../src/ports/content-ids';
import type {Letter, VocabularyItem} from '../../src/ports/content-model';

import {useContent} from '../../src/store/use-content';

export default function LetterSheet() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const load = useContent(
    async source => {
      // A route param is a raw string; the brand is restored here, at the boundary.
      const letter = await source.getLetter(id as LetterId);
      const speak = letter.speakRef === null ? null : await source.getVocabulary(letter.speakRef);
      return {letter, speak};
    },
    [id],
  );

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-4 px-5 pb-8" style={{paddingTop: insets.top}}>
        {load.status === 'loading' ? <SheetSkeleton /> : null}
        {load.status === 'error' ? (
          <EmptyState title="That letter is off the page">
            Search again from where you were.
          </EmptyState>
        ) : null}
        {load.status === 'ready' ? (
          <>
            <View className="items-center gap-2 py-6">
              <TibetanText size="xl" align="center" unit="letter">
                {load.data.letter.bo}
              </TibetanText>
              {load.data.letter.name !== null ? (
                <Text className="type-body-strong text-fg-accent">{load.data.letter.name}</Text>
              ) : null}
              {placeLine(load.data.letter) !== null ? (
                <Text className="type-caption text-fg-muted">{placeLine(load.data.letter)}</Text>
              ) : null}
              {load.data.letter.audio?.available ? <AudioButton /> : null}
            </View>
            {load.data.speak !== null ? (
              <SpeakDoor word={load.data.speak} onOpen={wordId => router.push(`/word/${wordId}`)} />
            ) : null}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

type SpeakDoorProps = {
  word: VocabularyItem;
  onOpen: (wordId: string) => void;
};

/** The Speak word this letter also is, as a door to the word sheet. */
function SpeakDoor({word, onOpen}: SpeakDoorProps) {
  return (
    <View className="gap-2">
      <Text className="type-label text-fg-muted uppercase">Also a word you know</Text>
      <Tag onPress={() => onOpen(word.id)}>{`${word.roman} · ${word.en}`}</Tag>
    </View>
  );
}

/** Where this letter sits in the script, from what the record itself carries. */
function placeLine(letter: Letter): string | null {
  if (letter.row !== null) {
    return letter.columnName === null
      ? `row ${letter.row}`
      : `row ${letter.row}, ${letter.columnName}`;
  }
  if (letter.subtype === 'vowel' && letter.position !== null) {
    return `vowel mark · sits ${letter.position}`;
  }
  if (letter.subtype === 'numeral' && letter.value !== null) {
    return `numeral · ${letter.value}`;
  }
  if (letter.subtype === 'sanskrit') {
    return 'recognition only';
  }
  return null;
}

/** Loading keeps the sheet's shape: a hero block, then lines. */
function SheetSkeleton() {
  return (
    <View className="items-center gap-4 py-6">
      <Skeleton shape="block" width={140} height={96} />
      <Skeleton shape="text" width={120} />
      <Skeleton shape="text" width={180} />
    </View>
  );
}
