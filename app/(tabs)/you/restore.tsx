/**
 * @fileoverview Restore (U3), and the conflict the board calls U4.
 *
 * The policy this screen sequences is fixed by `docs/06` §2: the summary of
 * what the file actually holds is shown before anything is applied, and a
 * backup older than the device state shows both sides — the learner chooses,
 * nothing recommends, nothing is restored silently. The pieces are the pure
 * functions in `src/usecases/restore-progress.ts`; this file only orders them.
 *
 * Reachable from U1, and — through the S1 quiet line — from before onboarding:
 * `?from=onboarding` marks that entry, and a completed restore then stamps
 * `onboardedOn` and replaces to the journey, because a restored walk skips
 * onboarding (`docs/02`). The param was chosen over a callback because it
 * survives the route boundary with no shared module state.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../../src/components/core/button';

import {backup, progress as progressStore} from '../../../src/composition/container';
import {toIsoDate} from '../../../src/domain/date';
import type {Progress} from '../../../src/ports/progress-store';
import {useProgress} from '../../../src/store/progress';
import {useSettings} from '../../../src/store/settings';
import {
  applyBackup,
  compareBackup,
  parseBackup,
  summariseBackup,
  type BackupSummary,
} from '../../../src/usecases/restore-progress';

/** The screen walks these states forward; only `apply` writes anything. */
type Phase =
  | {kind: 'idle'}
  | {kind: 'error'; error: 'unreadable' | 'not-a-backup'}
  | {kind: 'summary'; name: string; progress: Progress}
  | {kind: 'conflict'; backup: Progress; device: Progress}
  | {kind: 'done'};

/** The two U3 error states, named in plain language. The board draws no copy
 * for them, so these lines follow its voice: what happened, stated flat. */
const ERROR_COPY = {
  unreadable: 'This file could not be read. It may have been damaged on the way here.',
  'not-a-backup': 'This file is readable, but it is not a Trungtrung backup.',
} as const;

export default function Restore() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {from} = useLocalSearchParams<{from?: string}>();
  const fromOnboarding = from === 'onboarding';
  const [phase, setPhase] = useState<Phase>({kind: 'idle'});

  async function pick(): Promise<void> {
    const picked = await (await backup()).pick();
    if (picked === null) {
      return;
    }
    const parsed = parseBackup(picked.contents);
    setPhase(
      'error' in parsed
        ? {kind: 'error', error: parsed.error}
        : {kind: 'summary', name: picked.name, progress: parsed.progress},
    );
  }

  async function restore(next: Progress): Promise<void> {
    const store = await progressStore();
    const device = await store.load();
    if (compareBackup(device, next) === 'backup-older') {
      setPhase({kind: 'conflict', backup: next, device});
      return;
    }
    await apply(next);
  }

  async function apply(next: Progress): Promise<void> {
    const store = await progressStore();
    useProgress.getState().apply(await applyBackup({store}, next));
    if (fromOnboarding) {
      // A restored walk skips onboarding (docs/02) — the restore is the finish.
      await useSettings.getState().set({onboardedOn: toIsoDate(new Date())});
    }
    setPhase({kind: 'done'});
  }

  function leave(): void {
    if (fromOnboarding && phase.kind === 'done') {
      router.replace('/journey');
      return;
    }
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-4 px-5 pb-8" style={{paddingTop: insets.top}}>
        <Text accessibilityRole="header" className="type-title text-fg-heading">
          Restore
        </Text>
        {phase.kind === 'idle' ? (
          <>
            <Text className="type-body text-fg-body">
              Pick the backup file you made. Nothing is restored until you have seen what it holds.
            </Text>
            <Button size="lg" fullWidth onPress={() => void pick()}>
              Choose a backup file
            </Button>
            <Button variant="ghost" fullWidth onPress={leave}>
              Cancel
            </Button>
          </>
        ) : null}
        {phase.kind === 'error' ? (
          <>
            <Text className="type-body text-fg-body">{ERROR_COPY[phase.error]}</Text>
            <Button size="lg" fullWidth onPress={() => void pick()}>
              Choose another file
            </Button>
            <Button variant="ghost" fullWidth onPress={leave}>
              Cancel
            </Button>
          </>
        ) : null}
        {phase.kind === 'summary' ? (
          <>
            <Text
              className="type-body-strong text-fg-heading"
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {phase.name}
            </Text>
            <SummaryLines heading="This file holds" summary={summariseBackup(phase.progress)} />
            <Button size="lg" fullWidth onPress={() => void restore(phase.progress)}>
              Restore this
            </Button>
            <Button variant="ghost" fullWidth onPress={leave}>
              Cancel
            </Button>
          </>
        ) : null}
        {phase.kind === 'conflict' ? (
          <>
            <Text className="type-body text-fg-body">
              This phone has more on it than the backup does. Nothing is merged, so one of them
              wins.
            </Text>
            <SummaryLines heading="On this phone" summary={summariseBackup(phase.device)} />
            <SummaryLines heading="In the backup" summary={summariseBackup(phase.backup)} />
            <Button variant="secondary" size="lg" fullWidth onPress={leave}>
              {"Keep what's on this phone"}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onPress={() => void apply(phase.backup)}
            >
              Use the backup
            </Button>
          </>
        ) : null}
        {phase.kind === 'done' ? (
          <>
            <Text className="type-body text-fg-body">Your walk is back on this phone.</Text>
            <Button size="lg" fullWidth onPress={leave}>
              Done
            </Button>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

/** One side's state, in the terms the learner knows from the You tab. */
function SummaryLines({heading, summary}: {heading: string; summary: BackupSummary}) {
  return (
    <View className="gap-1">
      <Text className="type-body-strong text-fg-heading">{heading}</Text>
      <Text className="type-body text-fg-body">
        {`${summary.daysWalking} days walking · ${summary.itemsMet} words and phrases · ` +
          `${summary.stopsDone} stops completed`}
      </Text>
      {summary.newestDay !== null ? (
        <Text className="type-caption text-fg-muted">{`Last walked ${summary.newestDay}.`}</Text>
      ) : null}
    </View>
  );
}
