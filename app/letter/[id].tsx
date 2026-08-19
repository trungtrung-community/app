/**
 * @fileoverview L2 — the letter sheet: one letter, whole.
 *
 * The glyph large, its name, and its place in the script — the row and column
 * for one of the thirty, where the mark sits for a vowel, the value for a
 * numeral, recognition-only for the Sanskrit letters. Where the letter is also
 * a Speak word the learner knows, that word is a door.
 *
 * For one of the thirty, the reverse lookup: "what can attach" is counted from
 * the stack records whose root this letter is (prefixes, superscripts,
 * subscripts) and from the affix inventory (suffixes, which may follow any
 * root); the vowel row is the letter's slice of the `grid` syllable family,
 * shown where the adapter carries it; "appears in" is the Read words whose
 * base letters include this one, through the domain's own decomposition.
 *
 * Still absent rather than disabled: the "see the whole table" link (L5 has no
 * route) and the drill button (the drill machine has no letter mode scoped to
 * one letter yet).
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
import type {
  Affix,
  Letter,
  ReadWord,
  Stack,
  Syllable,
  VocabularyItem,
} from '../../src/ports/content-model';

import {lettersOf} from '../../src/domain/tibetan';
import {useContent} from '../../src/store/use-content';

/** Enough to show the pattern without shelving the whole word list on one sheet. */
const APPEARS_IN_LIMIT = 6;

/** One row of the reverse lookup: the role, and the letters that fill it. */
type AttachRow = {
  readonly label: string;
  readonly glyphs: readonly string[];
};

type SheetData = {
  letter: Letter;
  speak: VocabularyItem | null;
  /** What may attach to this root, counted from the records. Empty off the thirty. */
  attach: readonly AttachRow[];
  /** The letter's slice of the `grid` vowel family, where the adapter carries it. */
  vowelForms: readonly Syllable[];
  /** Read words whose base letters include this one. */
  appearsIn: readonly ReadWord[];
};

export default function LetterSheet() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const load = useContent<SheetData>(
    async source => {
      // A route param is a raw string; the brand is restored here, at the boundary.
      const letter = await source.getLetter(id as LetterId);
      const inThirty = letter.subtype === 'consonant' && letter.row !== null;
      const [speak, letters, stacks, affixes, sections, words] = await Promise.all([
        letter.speakRef === null ? null : source.getVocabulary(letter.speakRef),
        source.listLetters(),
        inThirty ? source.listStacks() : [],
        inThirty ? source.listAffixes() : [],
        inThirty ? source.listSections('read') : [],
        source.listReadWords(),
      ]);
      const lastSection = Math.max(0, ...sections.map(section => section.number));
      const vowelForms = inThirty
        ? (await source.listSyllables('grid', lastSection)).filter(
            syllable => syllable.root === letter.bo,
          )
        : [];
      const appearsIn = words
        .filter(word => lettersOf(word.bo).includes(letter.bo))
        .slice(0, APPEARS_IN_LIMIT);
      return {
        letter,
        speak,
        attach: inThirty ? attachRows(letter, stacks, affixes, letters) : [],
        vowelForms,
        appearsIn,
      };
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
            {load.data.attach.length > 0 ? <AttachBlock rows={load.data.attach} /> : null}
            {load.data.vowelForms.length > 0 ? (
              <VowelRow letter={load.data.letter} forms={load.data.vowelForms} />
            ) : null}
            {load.data.appearsIn.length > 0 ? <AppearsIn words={load.data.appearsIn} /> : null}
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

/**
 * The reverse lookup's rows, every count read off the records.
 *
 * Prefixes, superscripts and subscripts come from the stacks whose root this
 * letter is; suffixes from the affix inventory, where `mayFollowAnyRoot` is the
 * record's own answer to whether the row applies here. Letters are ordered as
 * the thirty orders them.
 */
function attachRows(
  letter: Letter,
  stacks: readonly Stack[],
  affixes: readonly Affix[],
  letters: readonly Letter[],
): readonly AttachRow[] {
  const order = new Map(
    letters
      .filter(candidate => candidate.row !== null)
      .map(candidate => [candidate.bo, (candidate.row ?? 0) * 100 + (candidate.column ?? 0)]),
  );
  const sorted = (glyphs: readonly string[]): readonly string[] =>
    [...new Set(glyphs)].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));

  const onRoot = stacks.filter(stack => stack.slots.root === letter.bo);
  const prefixes = sorted(onRoot.map(stack => stack.slots.prefix).filter(glyph => glyph !== null));
  const superscripts = sorted(
    onRoot.map(stack => stack.slots.superscript).filter(glyph => glyph !== null),
  );
  const subscripts = sorted(onRoot.flatMap(stack => stack.slots.subscript ?? []));
  const suffixes = affixes.filter(
    affix => affix.type === 'suffix' && affix.mayFollowAnyRoot === true,
  );

  const rows: AttachRow[] = [];
  if (prefixes.length > 0) {
    rows.push({label: `Prefixes · ${prefixes.length}`, glyphs: prefixes});
  }
  if (superscripts.length > 0) {
    rows.push({label: `Superscripts · ${superscripts.length}`, glyphs: superscripts});
  }
  if (subscripts.length > 0) {
    rows.push({label: `Subscripts · ${subscripts.length}`, glyphs: subscripts});
  }
  if (suffixes.length > 0) {
    rows.push({
      label: `Suffixes · all ${suffixes.length}`,
      glyphs: sorted(suffixes.map(affix => affix.bo)),
    });
  }
  return rows;
}

type AttachBlockProps = {
  rows: readonly AttachRow[];
};

/** "What can attach": the role rows, counted rather than approximated. */
function AttachBlock({rows}: AttachBlockProps) {
  return (
    <View className="gap-2">
      <Text className="type-label text-fg-muted uppercase">What can attach</Text>
      {rows.map(row => (
        <View key={row.label} className="flex-row items-baseline gap-3">
          <Text className="w-[112px] type-body-strong text-fg-heading">{row.label}</Text>
          <TibetanText inline size="sm">
            {row.glyphs.join(' ')}
          </TibetanText>
        </View>
      ))}
    </View>
  );
}

type VowelRowProps = {
  letter: Letter;
  forms: readonly Syllable[];
};

/** The letter with each vowel mark, from its slice of the grid family. */
function VowelRow({letter, forms}: VowelRowProps) {
  return (
    <View className="gap-2">
      <Text className="type-label text-fg-muted uppercase">{`With a vowel · ${forms.length}`}</Text>
      <View className="flex-row flex-wrap items-baseline gap-3">
        <TibetanText inline size="sm">
          {[letter.bo, ...forms.map(form => form.bo)].join(' ')}
        </TibetanText>
      </View>
    </View>
  );
}

type AppearsInProps = {
  words: readonly ReadWord[];
};

/** Read words this letter is written in, by the domain's own decomposition. */
function AppearsIn({words}: AppearsInProps) {
  return (
    <View className="gap-2">
      <Text className="type-label text-fg-muted uppercase">Appears in</Text>
      {words.map(word => (
        <View key={word.id} className="flex-row items-center gap-3">
          <TibetanText inline size="sm">
            {word.bo}
          </TibetanText>
          {word.reading !== null ? (
            <Text className="type-caption text-fg-accent">{word.reading}</Text>
          ) : null}
          {word.glosses.length > 0 ? (
            <Text className="type-caption text-fg-muted">{word.glosses.join(', ')}</Text>
          ) : null}
        </View>
      ))}
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
