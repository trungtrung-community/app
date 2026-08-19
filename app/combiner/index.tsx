/**
 * @fileoverview L7 — the combiner index: the seven that attach, as records.
 *
 * Four subscripts under the root, three superscripts on top, each drawn as a
 * card rather than a table row. The effect line is the preview that makes the
 * sheet worth entering. Every count is read off the combiner records, none is
 * typed. Each card opens the combiner sheet (L8).
 */

import {useRouter} from 'expo-router';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Tag} from '../../src/components/core/tag';
import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {LetterTile} from '../../src/components/learning/letter-tile';
import {mixedTibetan, TibetanText} from '../../src/components/learning/tibetan-text';
import type {Combiner} from '../../src/ports/content-model';

import {useContent} from '../../src/store/use-content';

export default function CombinerIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const load = useContent(source => source.listCombiners(), []);

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-4 px-5 pb-8" style={{paddingTop: insets.top}}>
        <View className="gap-1 pt-3">
          <Text accessibilityRole="header" className="type-title text-fg-heading">
            The seven that attach
          </Text>
          <Text className="type-body text-fg-muted">
            Four sit under the root, three sit on top. Each one changes the sound in its own way.
          </Text>
        </View>
        {load.status === 'loading' ? <IndexSkeleton /> : null}
        {load.status === 'error' ? (
          <EmptyState title="The combiners are off the shelf">Try opening them again.</EmptyState>
        ) : null}
        {load.status === 'ready' ? (
          <>
            <Group
              label="Below the root"
              nameBo="འདོགས་ཅན་"
              roman="dok-chen"
              combiners={load.data.filter(combiner => combiner.kind === 'subscript')}
              onOpen={id => router.push(`/combiner/${id}`)}
            />
            <Group
              label="On top of the root"
              nameBo="མགོ་ཅན་"
              roman="go-chen"
              combiners={load.data.filter(combiner => combiner.kind === 'superscript')}
              onOpen={id => router.push(`/combiner/${id}`)}
            />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

type GroupProps = {
  label: string;
  /** The traditional name of the group, pending native review on the board. */
  nameBo: string;
  roman: string;
  combiners: readonly Combiner[];
  onOpen: (id: string) => void;
};

function Group({label, nameBo, roman, combiners, onOpen}: GroupProps) {
  if (combiners.length === 0) {
    return null;
  }
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap items-baseline gap-2">
        <Text className="type-label text-fg-muted uppercase">{label}</Text>
        <TibetanText inline size="xs">
          {nameBo}
        </TibetanText>
        <Text className="type-caption text-fg-subtle">{`${roman} · ${combiners.length}`}</Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {combiners.map(combiner => (
          <CombinerCard key={combiner.id} combiner={combiner} onOpen={onOpen} />
        ))}
      </View>
    </View>
  );
}

type CombinerCardProps = {
  combiner: Combiner;
  onOpen: (id: string) => void;
};

function CombinerCard({combiner, onOpen}: CombinerCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={combiner.name}
      onPress={() => onOpen(combiner.id)}
      className="w-[48%] gap-2 rounded-lg bg-surface-card p-3"
    >
      <View className="flex-row">
        <Tag size="sm">{`${combiner.stackIds.length} stacks`}</Tag>
      </View>
      {combiner.specimen !== null ? <LetterTile glyph={combiner.specimen} size="md" /> : null}
      {combiner.nameBo !== null ? (
        <TibetanText inline size="xs">
          {combiner.nameBo}
        </TibetanText>
      ) : null}
      <Text className="type-body-strong text-fg-accent">{combiner.name}</Text>
      {combiner.effect !== null ? (
        <Text className="type-caption text-fg-muted">{mixedTibetan(combiner.effect)}</Text>
      ) : null}
    </Pressable>
  );
}

/** Loading keeps the ready layout's shape: a heading, then two card groups. */
function IndexSkeleton() {
  return (
    <View className="gap-3">
      <Skeleton shape="text" width={160} />
      <View className="flex-row gap-2">
        <Skeleton shape="block" width={160} height={180} />
        <Skeleton shape="block" width={160} height={180} />
      </View>
    </View>
  );
}
