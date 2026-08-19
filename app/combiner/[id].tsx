/**
 * @fileoverview L8 — the combiner sheet: one combiner, three steps.
 *
 * The board's order: ① the shape and its name, ② the full set of stacks it
 * forms, ③ how each one is said. Step ③ expands step ② rather than listing
 * both twice, and every spell-out row carries its own play control — the row
 * states how the stack is said, so the sound belongs on the row and not one
 * screen away. `playClip` is silent today; the control is live the day the
 * recordings land, with no caller changing.
 *
 * A subscript adds to its base, so its rows are additive; a superscript is
 * silent, so its rows are the spoken procedure. Exceptions are rendered where
 * the record carries them. The reading rule is the rule statement itself,
 * through `getReadRule` — wording from data.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Icon} from '../../src/components/core/icon';
import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {AudioButton} from '../../src/components/learning/audio-button';
import {LetterTile} from '../../src/components/learning/letter-tile';
import {StackDiagram} from '../../src/components/learning/stack-diagram';
import {mixedTibetan, TibetanText} from '../../src/components/learning/tibetan-text';
import type {CombinerId} from '../../src/ports/content-ids';
import type {Combiner, ReadRule, Stack} from '../../src/ports/content-model';

import {playClip} from '../../src/composition/play';
import {useContent} from '../../src/store/use-content';

type SheetData = {
  combiner: Combiner;
  /** The stacks behind the combiner's row, resolved through `StackSource`. */
  stacks: readonly Stack[];
  rules: readonly ReadRule[];
  /** The other combiners of the same kind, for the group's cross-links. */
  siblings: readonly Combiner[];
  /** Letter names by glyph, for the additive rows' base captions. */
  letterNames: ReadonlyMap<string, string>;
};

export default function CombinerSheet() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const load = useContent<SheetData>(
    async source => {
      // A route param is a raw string; the brand is restored here, at the boundary.
      const combiner = await source.getCombiner(id as CombinerId);
      const [stacks, rules, all, letters] = await Promise.all([
        Promise.all(combiner.stackIds.map(stackId => source.getStack(stackId))),
        Promise.all(combiner.ruleIds.map(ruleId => source.getReadRule(ruleId))),
        source.listCombiners(),
        source.listLetters(),
      ]);
      const siblings = all.filter(
        candidate => candidate.kind === combiner.kind && candidate.id !== combiner.id,
      );
      const letterNames = new Map(
        letters
          .filter(letter => letter.name !== null)
          .map(letter => [letter.bo, letter.name ?? '']),
      );
      return {combiner, stacks, rules, siblings, letterNames};
    },
    [id],
  );

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-4 px-5 pb-8" style={{paddingTop: insets.top}}>
        {load.status === 'loading' ? <SheetSkeleton /> : null}
        {load.status === 'error' ? (
          <EmptyState title="That combiner is off the page">
            Search again from where you were.
          </EmptyState>
        ) : null}
        {load.status === 'ready' ? (
          <Sheet data={load.data} onSibling={siblingId => router.push(`/combiner/${siblingId}`)} />
        ) : null}
      </View>
    </ScrollView>
  );
}

type SheetProps = {
  data: SheetData;
  onSibling: (id: string) => void;
};

function Sheet({data, onSibling}: SheetProps) {
  const {combiner, stacks, rules, siblings, letterNames} = data;
  const kindLabel = combiner.kind === 'superscript' ? 'Superscript' : 'Subscript';

  return (
    <>
      <View className="gap-1 pt-3">
        <Text className="type-label text-fg-accent uppercase">{kindLabel}</Text>
        <View className="flex-row items-baseline justify-between">
          {combiner.nameBo !== null ? (
            <TibetanText inline size="sm">
              {combiner.nameBo}
            </TibetanText>
          ) : (
            <Text className="type-title text-fg-heading">{combiner.name}</Text>
          )}
          {combiner.specimen !== null ? (
            <TibetanText inline size="sm">
              {combiner.specimen}
            </TibetanText>
          ) : null}
        </View>
      </View>

      <ShapeStep combiner={combiner} specimenStack={findSpecimen(combiner, stacks)} />

      {rules.length > 0 ? (
        <View className="gap-1 rounded-lg bg-surface-card p-4">
          <Text className="type-label text-fg-accent uppercase">Reading rule</Text>
          {rules.map(rule => (
            <Text key={rule.id} className="type-body text-fg-muted">
              {mixedTibetan(rule.statement)}
            </Text>
          ))}
        </View>
      ) : null}

      <View className="gap-3">
        <Text className="type-label text-fg-muted uppercase">
          {`② All ${stacks.length} stacks`}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {stacks.map(stack => (
            <LetterTile
              key={stack.id}
              glyph={stack.bo}
              roman={stack.reading ?? undefined}
              base={stack.slots.root}
              size="sm"
            />
          ))}
        </View>
      </View>

      <View className="gap-3">
        <Text className="type-label text-fg-muted uppercase">
          {`③ How each one is read · ${stacks.length}`}
        </Text>
        {combiner.kind === 'superscript' ? (
          <Text className="type-caption text-fg-muted">
            Say the head letter, then the base, then the joined sound.
          </Text>
        ) : null}
        <View className="gap-2 rounded-lg bg-surface-card px-4 py-2">
          {stacks.map(stack => (
            <SpellOutRow
              key={stack.id}
              stack={stack}
              combiner={combiner}
              letterNames={letterNames}
            />
          ))}
        </View>
        {combiner.exceptions.map(exception => (
          <Text key={exception.bo} className="type-caption text-fg-muted">
            {mixedTibetan(exception.note)}
          </Text>
        ))}
      </View>

      {siblings.length > 0 ? (
        <View className="gap-2">
          <Text className="type-label text-fg-muted uppercase">The others in this group</Text>
          {siblings.map(sibling => (
            <SiblingRow key={sibling.id} sibling={sibling} onOpen={onSibling} />
          ))}
        </View>
      ) : null}
    </>
  );
}

/** The stack record the specimen names, for the shape step's held-and-dimmed caption. */
function findSpecimen(combiner: Combiner, stacks: readonly Stack[]): Stack | null {
  return stacks.find(stack => stack.bo === combiner.specimen) ?? null;
}

type ShapeStepProps = {
  combiner: Combiner;
  specimenStack: Stack | null;
};

/**
 * Step zero on the board: the specimen glyph with the subject held at full ink.
 *
 * A subscript sheet holds the root and dims the combiner; a superscript sheet
 * holds the combiner, which is the letter the sheet is about. Both are the
 * specimen's first character on the line. The dimming is colour-only, so the
 * caption is what carries it for a reader who cannot see it.
 */
function ShapeStep({combiner, specimenStack}: ShapeStepProps) {
  const caption = shapeCaption(combiner, specimenStack);
  return (
    <View className="gap-2">
      <Text className="type-label text-fg-muted uppercase">{'① Symbol & name'}</Text>
      <View className="flex-row items-center gap-4 rounded-lg bg-surface-accent-soft p-4">
        <View className="items-center gap-1">
          {combiner.specimen !== null ? (
            <TibetanText
              size="hero"
              align="center"
              highlight={0}
              highlightUnit="char"
              highlightLabel={caption ?? undefined}
            >
              {combiner.specimen}
            </TibetanText>
          ) : null}
          {caption !== null ? (
            <Text className="type-caption text-fg-accent text-center">{mixedTibetan(caption)}</Text>
          ) : null}
        </View>
        <View className="flex-1 gap-1">
          {combiner.nameBo !== null ? (
            <TibetanText inline size="sm">
              {combiner.nameBo}
            </TibetanText>
          ) : null}
          <Text className="type-body-strong text-fg-accent">{combiner.name}</Text>
          <Text className="type-body text-fg-body">
            {combiner.kind === 'superscript'
              ? 'A letter that sits on top of the root.'
              : 'A letter that sits under the root.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** "root ཀ held; ya-tak dimmed" — or the superscript's inverse. Null without a specimen. */
function shapeCaption(combiner: Combiner, specimenStack: Stack | null): string | null {
  if (specimenStack === null) {
    return null;
  }
  if (combiner.kind === 'superscript') {
    const head = specimenStack.slots.superscript;
    return head === null
      ? null
      : `${combiner.name} ${head} held; the root ${specimenStack.slots.root} dimmed`;
  }
  return `root ${specimenStack.slots.root} held; ${combiner.name} dimmed`;
}

type SpellOutRowProps = {
  stack: Stack;
  combiner: Combiner;
  letterNames: ReadonlyMap<string, string>;
};

/** One stack said aloud, with the play control that says it. */
function SpellOutRow({stack, combiner, letterNames}: SpellOutRowProps) {
  const roman = stack.reading ?? undefined;
  return (
    <View className="flex-row items-center gap-3 py-2">
      {combiner.kind === 'superscript' ? (
        <StackDiagram
          layout="procedural"
          stack={stack.bo}
          head={stack.slots.superscript ?? undefined}
          base={stack.slots.root}
          roman={roman}
          style={FLEX_DIAGRAM}
        />
      ) : (
        <StackDiagram
          layout="additive"
          base={{glyph: stack.slots.root, roman: letterNames.get(stack.slots.root)}}
          combiner={{bo: combiner.nameBo ?? undefined, roman: combiner.name}}
          stack={stack.bo}
          roman={roman}
          style={FLEX_DIAGRAM}
        />
      )}
      <AudioButton
        size="sm"
        label={`Play ${stack.reading ?? stack.wylie}`}
        onPress={() => {
          if (stack.audio !== null) {
            void playClip(stack.audio);
          }
        }}
      />
    </View>
  );
}

const FLEX_DIAGRAM = {flex: 1, minWidth: 0} as const;

type SiblingRowProps = {
  sibling: Combiner;
  onOpen: (id: string) => void;
};

function SiblingRow({sibling, onOpen}: SiblingRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sibling.name}
      onPress={() => onOpen(sibling.id)}
      className="flex-row items-center gap-3 rounded-lg bg-surface-card p-3"
    >
      {sibling.specimen !== null ? (
        <TibetanText inline size="sm">
          {sibling.specimen}
        </TibetanText>
      ) : null}
      <View className="flex-1 gap-0.5">
        {sibling.nameBo !== null ? (
          <TibetanText inline size="xs">
            {sibling.nameBo}
          </TibetanText>
        ) : null}
        <Text className="type-caption text-fg-accent">{sibling.name}</Text>
      </View>
      <View style={CHEVRON_ROTATION}>
        <Icon name="chevron-down" size={20} />
      </View>
    </Pressable>
  );
}

/** The design system has no chevron-right; it rotates the down one, as ListRow does. */
const CHEVRON_ROTATION = {transform: [{rotate: '-90deg'}]} as const;

/** Loading keeps the sheet's shape: header, the shape card, then the rows. */
function SheetSkeleton() {
  return (
    <View className="gap-4 pt-3">
      <Skeleton shape="text" width={140} />
      <Skeleton shape="block" height={160} />
      <Skeleton shape="block" height={220} />
    </View>
  );
}
