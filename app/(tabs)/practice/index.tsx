/**
 * @fileoverview Practice — the practice home (Q1), the pool picker and nothing
 * else.
 *
 * A list, not a hub: a leading row for everything worth another look, then one
 * row per district the learner has met, in journey order (docs/02 "Practice";
 * docs/07 2026-08-15). Every row hands a pool to the drill machine — row 0 to
 * the worth-another-look list (Q5), a district row to the picker (Q8) — and
 * the screen runs nothing itself. A district not yet met is absent — never
 * greyed, never locked — and the current district is tinted with the place
 * marker in its gutter, per the board's Q1 frame. The empty state is the whole
 * screen on a first launch.
 *
 * One guest above the rows: N4's quiet nudge, push's in-app equivalent when
 * permission was declined. Dismissible, at most once a day, and only after a
 * day with no activity — never loss-framed, per the board's N4 frame.
 */

import {useRouter} from 'expo-router';
import {useEffect, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Card} from '../../../src/components/core/card';
import {IconButton} from '../../../src/components/core/icon-button';
import {ListRow} from '../../../src/components/core/list-row';
import {EmptyState} from '../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../src/components/feedback/skeleton';
import {appState} from '../../../src/composition/container';
import {reminderPermission} from '../../../src/composition/notifications';
import {toIsoDate} from '../../../src/domain/date';
import type {District, PhraseItem, Stop, VocabularyItem} from '../../../src/ports/content-model';
import type {Progress} from '../../../src/ports/progress-store';
import {color} from '../../../src/theme/tokens.generated';

import {selectStillGetting, selectStopDone, useProgress} from '../../../src/store/progress';
import {useContent} from '../../../src/store/use-content';
import {poolParam} from '../../../src/usecases/drill-pool';

/** One district, with what the met-check and the row figures read. */
type DistrictStops = {
  readonly district: District;
  readonly stops: readonly Stop[];
  readonly vocabulary: readonly VocabularyItem[];
  readonly phrases: readonly PhraseItem[];
};

export default function Practice() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const progress = useProgress(state => state.progress);
  const [nudge, setNudge] = useState<NudgePhase>('quiet');

  // N4's gate, every condition from the board's frame: push declined (denied,
  // not merely never asked), a day with no activity behind the learner, and not
  // already shown today. The day is stamped the moment it is shown, so a
  // re-mount the same day stays quiet even if the learner never dismissed.
  useEffect(() => {
    if (nudge !== 'quiet' || progress === null) {
      return;
    }
    const today = toIsoDate(new Date());
    if (!hadIdleDay(progress.walkedOn, today)) {
      return;
    }
    let cancelled = false;
    void (async () => {
      if ((await reminderPermission()) !== 'denied') {
        return;
      }
      const store = await appState();
      const state = await store.load();
      if (cancelled || state.lastNudgeOn === today) {
        return;
      }
      await store.save({...state, lastNudgeOn: today});
      if (!cancelled) {
        setNudge('shown');
      }
    })().catch(() => {
      // Failed bookkeeping loses one nudge, never the screen.
    });
    return () => {
      cancelled = true;
    };
  }, [nudge, progress]);

  // Stamped again on dismiss so the once-a-day promise holds even if the
  // show-time write was lost.
  const dismissNudge = () => {
    setNudge('dismissed');
    void appState()
      .then(async store =>
        store.save({...(await store.load()), lastNudgeOn: toIsoDate(new Date())}),
      )
      .catch(() => {});
  };

  const load = useContent(async source => {
    const districts = await source.listDistricts();
    return Promise.all(
      districts.map(async (district): Promise<DistrictStops> => ({
        district,
        stops: await source.listStopsByDistrict(district.slug),
        vocabulary: await source.listVocabularyByDistrict(district.slug),
        phrases: await source.listPhrasesByDistrict(district.slug),
      })),
    );
  }, []);

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      <ScrollView>
        <View className="gap-2 px-5 pb-8">
          {load.status === 'loading' ? <RowSkeletons /> : null}
          {load.status === 'error' ? <EmptyState title="Try opening practice again" /> : null}
          {load.status === 'ready' && nudge === 'shown' ? (
            <NudgeCard
              districts={load.data}
              progress={progress}
              onOpen={() => router.push('/journey')}
              onDismiss={dismissNudge}
            />
          ) : null}
          {load.status === 'ready' ? (
            <PracticeList
              districts={load.data}
              progress={progress}
              onStillGetting={() => router.push('/practice/still-getting')}
              onDistrict={slug =>
                router.push(
                  `/practice/picker?pool=${poolParam({kind: 'district', slug})}&entry=practice`,
                )
              }
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

/** The nudge's life on one mount: unresolved, on screen, or put away. */
type NudgePhase = 'quiet' | 'shown' | 'dismissed';

/**
 * True when the learner has walked before but not today — the board's "a day
 * with no activity" behind them. `walkedOn` is ascending ISO dates, so the last
 * entry is the most recent walk and plain comparison orders days. Empty means a
 * first launch, which the empty state owns; no nudge there.
 */
function hadIdleDay(walkedOn: readonly string[], today: string): boolean {
  const last = walkedOn.at(-1);
  return last !== undefined && last < today;
}

/**
 * The district the learner stopped in: the first met one not walked to the end,
 * or the last met one when everything met is finished. Null when nothing is met,
 * which keeps the card off a screen that is all empty state.
 */
function stoppedAt(districts: readonly DistrictStops[], progress: Progress | null): string | null {
  const met = districts.filter(({stops}) => stops.some(stop => selectStopDone(progress, stop.id)));
  const current = met.find(({stops}) => !stops.every(stop => selectStopDone(progress, stop.id)));
  return (current ?? met.at(-1))?.district.name ?? null;
}

type NudgeCardProps = {
  readonly districts: readonly DistrictStops[];
  readonly progress: Progress | null;
  readonly onOpen: () => void;
  readonly onDismiss: () => void;
};

/**
 * N4 — the quiet nudge above the list, push's in-app equivalent.
 *
 * One stated line naming where the learner stopped — never what was lost — and
 * a dismiss. The board's chevron is the card itself: tapping the line lands
 * where N2's plain daily line lands, the journey, so the nudge is actionable.
 * The X and the line are siblings rather than nested pressables, so a dismiss
 * can never also navigate.
 */
function NudgeCard({districts, progress, onOpen, onDismiss}: NudgeCardProps) {
  const name = stoppedAt(districts, progress);
  if (name === null) {
    return null;
  }
  return (
    <Card padding="none" testID="nudge-card">
      <View className="flex-row items-center gap-2 py-1 pl-4 pr-1">
        <Pressable accessibilityRole="button" onPress={onOpen} className="flex-1 py-3">
          <Text className="type-body-strong text-fg-heading">{`You stopped at ${name}.`}</Text>
        </Pressable>
        <IconButton icon="x" label="Dismiss" size="sm" onPress={onDismiss} />
      </View>
    </Card>
  );
}

type PracticeListProps = {
  readonly districts: readonly DistrictStops[];
  readonly progress: Progress | null;
  readonly onStillGetting: () => void;
  readonly onDistrict: (slug: string) => void;
};

/** Met items of one kind — the figures on a district row count these. */
function metCount(items: readonly {readonly id: string}[], progress: Progress | null): number {
  return items.filter(item => {
    const state = progress?.items[item.id]?.state;
    return state === 'met' || state === 'known';
  }).length;
}

/**
 * The rows themselves: the still-getting row, then one per met district.
 *
 * The still-getting row sits above the district rows (docs/02, docs/07
 * 2026-08-15) and appears only when its count is non-zero — no copy explains
 * its absence. `districts` arrives in map order already — `listDistricts`
 * sorts by number — so filtering to the met ones keeps that order without a
 * second sort. The current district — met but not yet finished — is tinted
 * with the place marker in its gutter, and nothing bolder.
 */
function PracticeList({districts, progress, onStillGetting, onDistrict}: PracticeListProps) {
  const met = districts.filter(({stops}) => stops.some(stop => selectStopDone(progress, stop.id)));
  const allTaughtIds = Object.keys(progress?.items ?? {});
  const stillGetting = selectStillGetting(progress, allTaughtIds, toIsoDate(new Date())).length;

  if (met.length === 0 && stillGetting === 0) {
    return (
      <EmptyState title="Practice grows as you walk">
        Each district you meet gathers here for review.
      </EmptyState>
    );
  }

  return (
    <>
      {stillGetting > 0 ? (
        <ListRow
          label={`Everything · ${stillGetting} you're still getting`}
          onPress={onStillGetting}
        />
      ) : null}
      {met.map(({district, stops, vocabulary, phrases}) => {
        const words = metCount(vocabulary, progress);
        const phraseCount = metCount(phrases, progress);
        const current = !stops.every(stop => selectStopDone(progress, stop.id));
        return (
          <ListRow
            key={district.id}
            label={district.name}
            value={`${words} ${words === 1 ? 'word' : 'words'} · ${phraseCount} ${
              phraseCount === 1 ? 'phrase' : 'phrases'
            }`}
            icon={current ? 'map-pin' : undefined}
            style={current ? {backgroundColor: color.surfaceAccentSoft} : undefined}
            onPress={() => onDistrict(district.slug)}
          />
        );
      })}
    </>
  );
}

/** Loading keeps the shape of the rows it becomes. */
function RowSkeletons() {
  return (
    <View className="gap-2">
      <Skeleton shape="text" />
      <Skeleton shape="text" />
      <Skeleton shape="text" />
    </View>
  );
}
