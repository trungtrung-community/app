/**
 * @fileoverview RB11 — the stack sheet: one stack, its parts, its sound, and
 * where it turns up.
 *
 * The diagram is the record's own parsed slots; the reading register carries
 * `readsAlsoAs` where the glyph alone underdetermines the reading, said as the
 * data says it — "as root + suffix". The rules it obeys are the rule statements
 * through `getReadRule`. "Turns up in" is derived from the Read words whose
 * written syllables contain the glyph — the one honest lookup the ports serve
 * today; a dedicated appears-in query stays an upstream ask.
 *
 * The board's "Practise this stack" button waits on RB16: the drill machine
 * has no stack mode yet, so the door is absent rather than disabled.
 */

import {useLocalSearchParams} from 'expo-router';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {AudioButton} from '../../src/components/learning/audio-button';
import {StackDiagram, type StackPart} from '../../src/components/learning/stack-diagram';
import {mixedTibetan, TibetanText} from '../../src/components/learning/tibetan-text';
import type {StackId} from '../../src/ports/content-ids';
import type {ReadRule, ReadWord, Stack} from '../../src/ports/content-model';

import {playClip} from '../../src/composition/play';
import {useContent} from '../../src/store/use-content';

/** Enough to show the pattern without shelving the whole list on one sheet. */
const TURNS_UP_LIMIT = 6;

type SheetData = {
  stack: Stack;
  rules: readonly ReadRule[];
  /** The root letter's name, for the base caption. */
  rootName: string | null;
  /** Read words whose written syllables contain the glyph. */
  turnsUp: readonly ReadWord[];
};

export default function StackSheet() {
  const {id} = useLocalSearchParams<{id: string}>();
  const insets = useSafeAreaInsets();

  const load = useContent<SheetData>(
    async source => {
      // A route param is a raw string; the brand is restored here, at the boundary.
      const stack = await source.getStack(id as StackId);
      const [rules, letters, words] = await Promise.all([
        Promise.all(stack.ruleIds.map(ruleId => source.getReadRule(ruleId))),
        source.listLetters(),
        source.listReadWords(),
      ]);
      const rootName = letters.find(letter => letter.bo === stack.slots.root)?.name ?? null;
      const turnsUp = words
        .filter(word => word.syllables.some(syllable => syllable.includes(stack.bo)))
        .slice(0, TURNS_UP_LIMIT);
      return {stack, rules, rootName, turnsUp};
    },
    [id],
  );

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-4 px-5 pb-8" style={{paddingTop: insets.top}}>
        {load.status === 'loading' ? <SheetSkeleton /> : null}
        {load.status === 'error' ? (
          <EmptyState title="That stack is off the page">
            Search again from where you were.
          </EmptyState>
        ) : null}
        {load.status === 'ready' ? <Sheet data={load.data} /> : null}
      </View>
    </ScrollView>
  );
}

type SheetProps = {
  data: SheetData;
};

function Sheet({data}: SheetProps) {
  const {stack, rules, rootName, turnsUp} = data;
  return (
    <>
      <View className="items-center gap-4 py-6">
        <StackDiagram stack={stack.bo} roman={stack.reading ?? undefined} parts={parts(stack)} />
        <View className="flex-row items-center gap-4">
          <AudioButton
            size="lg"
            label={`Play ${stack.reading ?? stack.wylie}`}
            onPress={() => {
              if (stack.audio !== null) {
                void playClip(stack.audio);
              }
            }}
          />
          <AudioButton
            size="sm"
            speed="slow"
            label={`Play ${stack.reading ?? stack.wylie} slowly`}
            onPress={() => {
              if (stack.audio !== null) {
                void playClip(stack.audio, {rate: 'slow'});
              }
            }}
          />
        </View>
        {rootName !== null ? (
          <Text className="type-caption text-fg-subtle">
            {mixedTibetan(`base ${stack.slots.root} ${rootName}`)}
          </Text>
        ) : null}
      </View>

      {stack.readsAlsoAs.length > 0 ? (
        <View className="gap-2 rounded-lg bg-surface-card p-4">
          <Text className="type-label text-fg-accent uppercase">Reads more than one way</Text>
          {stack.reading !== null ? (
            <Text className="type-body text-fg-body">
              {[stack.reading, ...stack.readsAlsoAs.map(reading => reading.reading)].join(' · ')}
            </Text>
          ) : null}
          {stack.readsAlsoAs.map(reading => (
            <Text key={reading.wylie} className="type-caption text-fg-muted">
              {`${reading.reading} · as ${reading.as}`}
            </Text>
          ))}
        </View>
      ) : null}

      {rules.length > 0 ? (
        <View className="gap-2">
          <Text className="type-label text-fg-muted uppercase">The rules it obeys</Text>
          {rules.map(rule => (
            <Text key={rule.id} className="type-body text-fg-muted">
              {mixedTibetan(rule.statement)}
            </Text>
          ))}
        </View>
      ) : null}

      {turnsUp.length > 0 ? (
        <View className="gap-2">
          <Text className="type-label text-fg-muted uppercase">Appears in</Text>
          {turnsUp.map(word => (
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
      ) : null}
    </>
  );
}

/** The filled slots, in written order, as the diagram's parts. */
function parts(stack: Stack): readonly StackPart[] {
  const {slots} = stack;
  const list: StackPart[] = [];
  if (slots.prefix !== null) {
    list.push({glyph: slots.prefix, role: 'prefix'});
  }
  if (slots.superscript !== null) {
    list.push({glyph: slots.superscript, role: 'superscript'});
  }
  list.push({glyph: slots.root, role: 'root'});
  for (const subscript of slots.subscript ?? []) {
    list.push({glyph: subscript, role: 'subscript'});
  }
  if (slots.vowel !== null) {
    list.push({glyph: slots.vowel, role: 'vowel'});
  }
  if (slots.suffix !== null) {
    list.push({glyph: slots.suffix, role: 'suffix'});
  }
  if (slots.suffix2 !== null) {
    list.push({glyph: slots.suffix2, role: 'suffix2'});
  }
  return list;
}

/** Loading keeps the sheet's shape: the hero diagram, then blocks. */
function SheetSkeleton() {
  return (
    <View className="items-center gap-4 py-6">
      <Skeleton shape="block" width={200} height={160} />
      <Skeleton shape="text" width={140} />
      <Skeleton shape="text" width={180} />
    </View>
  );
}
