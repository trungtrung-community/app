/**
 * @fileoverview L1 — the script browser: a cheatsheet, not a syllabus.
 *
 * The thirty as the spine, drawn in grid order from each letter's `row` and
 * `column`, then the four vowels. Met and not-yet are the learner's own
 * progress; the filter tags narrow the grid to either. Every tile opens the
 * letter sheet (L2).
 *
 * The board also draws collapsed "what combines with them" rows — prefixes,
 * suffixes, second suffixes, superscripts, subscripts, numerals — as chevrons
 * into the combiner index (L7). L7 needs port capabilities the content source
 * does not serve yet, and a chevron row that opens nothing would be a disabled
 * door, so those rows are absent until the ports task lands them.
 */

import {useRouter} from 'expo-router';
import {useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {IconButton} from '../../src/components/core/icon-button';
import {Tag} from '../../src/components/core/tag';
import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {LetterTile} from '../../src/components/learning/letter-tile';
import type {Letter} from '../../src/ports/content-model';
import type {Progress} from '../../src/ports/progress-store';

import {selectItemState, useProgress} from '../../src/store/progress';
import {useContent} from '../../src/store/use-content';

type MetFilter = 'all' | 'met' | 'notYet';

export default function Script() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useProgress(s => s.progress);
  const [filter, setFilter] = useState<MetFilter>('all');

  const load = useContent(source => source.listLetters(), []);

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      <View className="flex-row items-center justify-between px-5 py-3">
        <Text accessibilityRole="header" className="type-title text-fg-heading">
          The script
        </Text>
        <IconButton
          icon="search"
          label="Search the script"
          onPress={() => router.push('/search')}
        />
      </View>
      {load.status === 'loading' ? <ScriptSkeleton /> : null}
      {load.status === 'error' ? (
        <View className="px-5 pt-6">
          <EmptyState title="The script is off the shelf">Try opening it again.</EmptyState>
        </View>
      ) : null}
      {load.status === 'ready' ? (
        <Browser
          letters={load.data}
          progress={progress}
          filter={filter}
          onFilter={setFilter}
          onLetter={id => router.push(`/letter/${id}`)}
        />
      ) : null}
    </View>
  );
}

type BrowserProps = {
  letters: readonly Letter[];
  progress: Progress | null;
  filter: MetFilter;
  onFilter: (filter: MetFilter) => void;
  onLetter: (id: string) => void;
};

function Browser({letters, progress, filter, onFilter, onLetter}: BrowserProps) {
  const thirty = letters
    .filter(letter => letter.subtype === 'consonant' && letter.row !== null)
    .sort((a, b) => (a.row ?? 0) - (b.row ?? 0) || (a.column ?? 0) - (b.column ?? 0));
  // The four marks, in the mark's own codepoint order: i, u, e, o.
  const vowels = letters
    .filter(letter => letter.subtype === 'vowel')
    .sort((a, b) => (a.markCodePoint ?? '').localeCompare(b.markCodePoint ?? ''));

  const isMet = (letter: Letter): boolean => selectItemState(progress, letter.id) !== 'new';
  const shown = (letter: Letter): boolean =>
    filter === 'all' || (filter === 'met' ? isMet(letter) : !isMet(letter));

  return (
    <ScrollView>
      <View className="gap-2 px-5 pb-8">
        <View className="flex-row flex-wrap gap-2 pb-2">
          <Tag size="sm" selected={filter === 'all'} onPress={() => onFilter('all')}>
            {`All ${thirty.length}`}
          </Tag>
          <Tag size="sm" selected={filter === 'met'} onPress={() => onFilter('met')}>
            Met
          </Tag>
          <Tag size="sm" selected={filter === 'notYet'} onPress={() => onFilter('notYet')}>
            Not yet
          </Tag>
        </View>
        {groupByRow(thirty).map(row => {
          const cells = row.letters.filter(shown);
          if (cells.length === 0) {
            return null;
          }
          return (
            <View key={row.number} className="flex-row gap-2">
              {cells.map(letter => (
                <LetterCell
                  key={letter.id}
                  letter={letter}
                  met={isMet(letter)}
                  onPress={() => onLetter(letter.id)}
                />
              ))}
            </View>
          );
        })}
        {vowels.some(shown) ? (
          <>
            <Text className="type-label text-fg-muted pt-4 uppercase">The vowels</Text>
            <View className="flex-row gap-2">
              {vowels.filter(shown).map(letter => (
                <LetterCell
                  key={letter.id}
                  letter={letter}
                  met={isMet(letter)}
                  onPress={() => onLetter(letter.id)}
                />
              ))}
            </View>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

type Row = {readonly number: number; readonly letters: readonly Letter[]};

/** The grid's rows, from the letters' own `row` field. Input is already sorted. */
function groupByRow(thirty: readonly Letter[]): readonly Row[] {
  const rows: Row[] = [];
  for (const letter of thirty) {
    const last = rows[rows.length - 1];
    if (last && last.number === letter.row) {
      rows[rows.length - 1] = {...last, letters: [...last.letters, letter]};
      continue;
    }
    rows.push({number: letter.row ?? 0, letters: [letter]});
  }
  return rows;
}

type LetterCellProps = {
  letter: Letter;
  met: boolean;
  onPress: () => void;
};

function LetterCell({letter, met, onPress}: LetterCellProps) {
  return (
    <LetterTile
      glyph={letter.bo}
      roman={letter.name ?? undefined}
      state={met ? 'learned' : 'notYet'}
      size="md"
      onPress={onPress}
    />
  );
}

/** Loading keeps the ready layout's shape: tags, then rows of tiles. */
function ScriptSkeleton() {
  return (
    <View className="gap-3 px-5">
      <Skeleton shape="text" width={180} />
      <View className="flex-row gap-2">
        <Skeleton shape="block" width={64} height={64} />
        <Skeleton shape="block" width={64} height={64} />
        <Skeleton shape="block" width={64} height={64} />
        <Skeleton shape="block" width={64} height={64} />
      </View>
    </View>
  );
}
