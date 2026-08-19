/**
 * @fileoverview You — the profile hub (P1), with the crossing's B4 block.
 *
 * Six doors: what has been learned, where, and the controls over how it is shown
 * and kept. Days walking sits above them because it is the one count every other
 * number on this tab is built from.
 *
 * B4 draws combined progress as one walk with two bands — Speak stops walked,
 * letters met — with the crossing counted between them. Every number is computed
 * from the snapshot and the content; the readable count is `readableWords()`,
 * the same function RBH's block binds (one definition, per the board). The block
 * is absent entirely while the Read track is untouched: a band at zero would
 * draw a claim about a track the learner never opened.
 */

import {useRouter} from 'expo-router';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../../src/components/core/button';
import {Card} from '../../../src/components/core/card';
import type {IconName} from '../../../src/components/core/icon';
import {ListRow} from '../../../src/components/core/list-row';
import {ProgressBar} from '../../../src/components/learning/progress-bar';
import type {Progress} from '../../../src/ports/progress-store';

import {selectItemState, useProgress} from '../../../src/store/progress';
import {useContent} from '../../../src/store/use-content';
import {deriveReadState, readableWords} from '../../../src/usecases/read-progress';

type Destination = {
  readonly label: string;
  /** One sentence. `ListRow.sub` allows no more. */
  readonly sub: string;
  readonly icon: IconName;
  readonly href: string;
};

const DESTINATIONS: readonly Destination[] = [
  {
    label: 'Stats',
    sub: 'Words met and known, and stops completed.',
    icon: 'gauge',
    href: '/you/stats',
  },
  {
    label: 'District progress',
    sub: 'How each district is going.',
    icon: 'route',
    href: '/you/districts',
  },
  {label: 'Search', sub: 'Find any word or phrase you have met.', icon: 'search', href: '/search'},
  {
    label: 'Settings',
    sub: 'The spelled-out Wylie line, and what follows it.',
    icon: 'sliders-horizontal',
    href: '/you/settings',
  },
  {
    label: 'Your data',
    sub: 'Back up or clear what is stored on this device.',
    icon: 'download',
    href: '/you/data',
  },
  {
    label: 'About',
    sub: 'The app, and the content build it runs on.',
    icon: 'info',
    href: '/you/about',
  },
];

export default function You() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const walkedOn = useProgress(s => s.progress?.walkedOn.length ?? 0);
  const progress = useProgress(s => s.progress);

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-2 px-5 pb-8" style={{paddingTop: insets.top}}>
        <View className="items-center gap-1 py-6">
          <Text accessibilityRole="header" className="type-heading text-fg-heading">
            {`Days walking · ${walkedOn}`}
          </Text>
        </View>
        <CombinedProgress progress={progress} onRead={() => router.push('/journey')} />
        <View className="gap-2">
          {DESTINATIONS.map(destination => (
            <ListRow
              key={destination.href}
              label={destination.label}
              sub={destination.sub}
              icon={destination.icon}
              onPress={() => router.push(destination.href)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

/** B4's numbers, every one computed. Null while the Read track is untouched. */
type WalkBands = {
  readonly speakDone: number;
  readonly speakTotal: number;
  readonly lettersMet: number;
  readonly lettersTotal: number;
  /** Districts walked in Speak whose words are also readable — the crossing. */
  readonly crossedDistricts: number;
  readonly readableCount: number;
};

/**
 * B4 — one walk, two bands, the crossings marked.
 *
 * Absent (null data) while no letter has been met, per the block's rule. The
 * fixture adapter may not carry every `speakRef`'s record, so the crossing
 * resolves what it can and counts only that — honest inside the subset.
 */
function CombinedProgress({progress, onRead}: {progress: Progress | null; onRead: () => void}) {
  const load = useContent<WalkBands | null>(
    async source => {
      const state = await deriveReadState({walk: source, script: source}, progress);
      if (state.metLetterBos.size === 0) {
        return null;
      }
      const [words, letters, districts] = await Promise.all([
        readableWords({walk: source, script: source, words: source}, progress),
        source.listLetters(),
        source.listDistricts(),
      ]);
      const stopsPerDistrict = await Promise.all(
        districts.map(district => source.listStopsByDistrict(district.slug)),
      );
      const speakStopIds = new Set(stopsPerDistrict.flat().map(stop => stop.id as string));
      const speakDone = (progress?.completedStops ?? []).filter(id => speakStopIds.has(id)).length;
      const metRefs = [
        ...new Set(words.map(word => word.speakRef).filter(ref => ref !== null)),
      ].filter(ref => selectItemState(progress, ref) !== 'new');
      const resolved = await Promise.allSettled(metRefs.map(ref => source.getVocabulary(ref)));
      const crossedDistricts = new Set(
        resolved
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value.districtNumber),
      ).size;
      return {
        speakDone,
        speakTotal: speakStopIds.size,
        lettersMet: state.metLetterBos.size,
        lettersTotal: letters.length,
        crossedDistricts,
        readableCount: words.length,
      };
    },
    [progress],
  );

  if (load.status !== 'ready' || load.data === null) {
    return null;
  }
  const bands = load.data;
  const crossingLine =
    bands.crossedDistricts === 1
      ? `${bands.crossedDistricts} district sits under both bands.`
      : `${bands.crossedDistricts} districts sit under both bands.`;

  return (
    <Card>
      <View className="gap-3">
        <Text accessibilityRole="header" className="type-title text-fg-heading">
          The walk
        </Text>
        <ProgressBar label="Speak" value={bands.speakDone} max={bands.speakTotal} />
        <ProgressBar label="Read" value={bands.lettersMet} max={bands.lettersTotal} tone="reward" />
        <Text className="type-body text-fg-muted">{crossingLine}</Text>
        {bands.readableCount > 0 ? (
          <Button variant="secondary" fullWidth onPress={onRead}>
            {`Read the ${bands.readableCount}`}
          </Button>
        ) : null}
      </View>
    </Card>
  );
}
