/**
 * @fileoverview The stop screen — the lesson loop's one route.
 *
 * Thin by design: the engine owns the queue and the verdicts, the use case owns
 * persistence, and this file only dispatches `queue[index]` by kind to the
 * renderers in src/components/session. Full-screen at the stack root, so the
 * tab bar stays out of a lesson.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {useEffect, useState} from 'react';
import {ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {cue} from '../../src/composition/cue';
import {Badge} from '../../src/components/core/badge';
import {IconButton} from '../../src/components/core/icon-button';
import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {AnswerBand} from '../../src/components/learning/answer-band';
import {ProgressBar} from '../../src/components/learning/progress-bar';
import {ArtifactSheet, type ArtifactPage} from '../../src/components/session/artifact-sheet';
import {EndScreen} from '../../src/components/session/end-screen';
import {ExerciseFrame} from '../../src/components/session/exercise-frame';
import {IntroScreen} from '../../src/components/session/intro-screen';
import {ItemCard} from '../../src/components/session/item-card';
import {MomentScreen} from '../../src/components/session/moment-screen';
import {NoteCard} from '../../src/components/session/note-card';
import {QuitDialog} from '../../src/components/session/quit-dialog';
import {ResumeIntro} from '../../src/components/session/resume-intro';
import {SecondLookIntro} from '../../src/components/session/second-look-intro';
import type {Items} from '../../src/components/session/types';
import type {ContentItemId, StopId} from '../../src/ports/content-ids';

import {useStopSession} from '../../src/store/session';
import type {SessionState} from '../../src/usecases/start-stop';
import type {Ceremony} from '../../src/usecases/stop-ceremony';
import type {CommitInput} from '../../src/usecases/submit-answer';

export default function Stop() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slice = useStopSession();

  const [quitOpen, setQuitOpen] = useState(false);
  const [carriedOn, setCarriedOn] = useState(false);
  /** Set once the ending commit lands and the G4 sheet still has to run. */
  const [pendingCeremony, setPendingCeremony] = useState<Ceremony | null>(null);

  // Adjusting state during render is React's documented pattern for reacting
  // to a changed prop — the same navigation that restarts the session below
  // must also re-arm the interstitials.
  const [seenId, setSeenId] = useState(id);
  if (seenId !== id) {
    setSeenId(id);
    setQuitOpen(false);
    setCarriedOn(false);
    setPendingCeremony(null);
  }

  useEffect(() => {
    // A route param is a raw string; the brand is restored at the boundary.
    void useStopSession.getState().start(id as StopId);
    return () => useStopSession.getState().reset();
  }, [id]);

  const state = slice.state;
  const entry = state?.queue[state.index];

  /** Where a closed stop goes: docs/04's leave grammar, or the earned ceremony. */
  const leaveTo = (ceremony: Ceremony) => {
    switch (ceremony.kind) {
      case 'district-finished':
        router.replace({
          pathname: '/ceremony/district',
          params: {slug: ceremony.slug, circuit: String(ceremony.circuit)},
        });
        break;
      case 'first-walk-complete':
        router.replace('/ceremony/first-walk');
        break;
      case 'both-walks-complete':
        router.replace('/ceremony/finale');
        break;
      default:
        router.back();
    }
  };

  const onDone = () => {
    void useStopSession
      .getState()
      .finish()
      .then(ceremony => {
        // G4 first where the stop holds a card; S8·nc goes straight through.
        if (useStopSession.getState().artifactCards.length > 0) {
          setPendingCeremony(ceremony);
        } else {
          leaveTo(ceremony);
        }
      });
  };

  // G4's pages: the artifact drawn from the session's own resolution, and the
  // shelf address the card route wants.
  const artifactPages: readonly ArtifactPage[] = slice.artifactCards.map(found => {
    const item =
      found.card.itemId === null
        ? undefined
        : slice.itemsById.get(found.card.itemId as ContentItemId);
    return {
      bo: item?.bo ?? '',
      roman: item?.roman,
      gloss: item?.en ?? '',
      collectionId: found.collection.id,
      ordinal: found.ordinal,
    };
  });

  // One cue per band: the effect keys on the answered entry's identity plus its
  // verdict, so a re-render of the same band cannot fire twice and the next
  // band fires again. `partial` shows no band and marks no moment.
  const answered = state?.answered ?? null;
  const bandCue =
    answered === null || answered.verdict === 'partial'
      ? null
      : `${answered.key}:${answered.verdict}`;
  useEffect(() => {
    if (bandCue === null) {
      return;
    }
    cue(bandCue.endsWith(':correct') ? 'correct' : 'wrong');
  }, [bandCue]);

  // The run cue marks the moment the run REACHES three — the clip ships silent
  // by decision (docs/09 #17), and the call stands so the moment is marked.
  const run = state?.run ?? 0;
  useEffect(() => {
    if (run === 3) {
      cue('run');
    }
  }, [run]);

  // S11: the chip beside the bar is the warm-up's only new chrome.
  const warmUp = entry?.position.kind === 'exercise' && entry.position.exercise.warmUp === true;

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      <View className="flex-row items-center gap-3 px-5 py-2">
        <IconButton icon="x" label="Leave the stop" onPress={() => setQuitOpen(true)} />
        <View className="flex-1">
          <ProgressBar
            testID="stop-progress"
            value={state?.index ?? 0}
            max={state?.queue.length ?? 1}
          />
        </View>
        {warmUp ? <Badge tone="soft">Warm-up</Badge> : null}
      </View>
      {slice.status === 'error' ? (
        <View className="px-5 pt-6">
          <EmptyState title="That stop is off the map">
            Head back to the district and pick the walk up from there.
          </EmptyState>
        </View>
      ) : slice.status !== 'ready' ||
        state === undefined ||
        state === null ||
        entry === undefined ? (
        <StopSkeleton />
      ) : slice.resumed && !carriedOn ? (
        <ScrollView className="flex-1">
          <View className="gap-4 px-5 pb-32 pt-4">
            <ResumeIntro
              stopName={slice.stop?.name ?? ''}
              capabilities={slice.stop?.capabilities ?? []}
              onCarryOn={() => setCarriedOn(true)}
            />
          </View>
        </ScrollView>
      ) : (
        <ScrollView className="flex-1">
          <View className="gap-4 px-5 pb-32 pt-4">
            <Entry
              key={entry.key}
              state={state}
              itemsById={slice.itemsById}
              stopName={slice.stop?.name ?? ''}
              outcome={slice.stop?.outcome ?? ''}
              onCommit={input => void slice.commit(input)}
              onDone={onDone}
            />
          </View>
        </ScrollView>
      )}
      {state?.answered && state.answered.verdict !== 'partial' ? (
        <Band
          state={state}
          itemsById={slice.itemsById}
          onNext={() => void slice.commit({kind: 'continue'})}
        />
      ) : null}
      <QuitDialog
        open={quitOpen}
        onKeepGoing={() => setQuitOpen(false)}
        onLeave={() => {
          setQuitOpen(false);
          router.back();
        }}
      />
      <ArtifactSheet
        open={pendingCeremony !== null}
        pages={artifactPages}
        onSeeCard={page => router.push(`/card/${page.collectionId}/${page.ordinal}`)}
        onKeepGoing={() => {
          const ceremony = pendingCeremony;
          setPendingCeremony(null);
          leaveTo(ceremony ?? {kind: 'none'});
        }}
      />
    </View>
  );
}

type EntryProps = {
  state: SessionState;
  itemsById: Items;
  stopName: string;
  outcome: string;
  onCommit: (input: CommitInput) => void;
  onDone: () => void;
};

/** Dispatches the current queue entry to its renderer by position kind. */
function Entry({state, itemsById, stopName, outcome, onCommit, onDone}: EntryProps) {
  const entry = state.queue[state.index];
  if (entry === undefined) {
    return null;
  }
  const position = entry.position;
  const onContinue = () => onCommit({kind: 'continue'});

  switch (position.kind) {
    case 'intro':
      return (
        <IntroScreen
          text={position.text}
          outcome={position.outcome}
          capabilities={position.capabilities}
          onContinue={onContinue}
        />
      );
    case 'card':
      return (
        <ItemCard
          item={itemsById.get(position.itemId as ContentItemId)}
          card={position.card}
          onContinue={onContinue}
        />
      );
    case 'note':
      return <NoteCard text={position.text} onContinue={onContinue} />;
    case 'exercise':
      return (
        <ExerciseFrame
          entry={entry}
          answered={state.answered}
          matched={state.matched}
          itemsById={itemsById}
          onCommit={onCommit}
        />
      );
    case 'second-look-intro':
      return <SecondLookIntro count={position.count} onContinue={onContinue} />;
    case 'moment':
      return <MomentScreen stopName={stopName} outcome={outcome} onContinue={onContinue} />;
    case 'end':
      return (
        <EndScreen
          taught={state.taught}
          stillMissed={state.stillMissed}
          capabilities={position.capabilities}
          itemsById={itemsById}
          onDone={onDone}
        />
      );
    default:
      return null;
  }
}

type BandProps = {
  state: SessionState;
  itemsById: Items;
  onNext: () => void;
};

function Band({state, itemsById, onNext}: BandProps) {
  const answered = state.answered;
  if (answered === null) {
    return null;
  }
  const item =
    answered.answerItemId === null
      ? undefined
      : itemsById.get(answered.answerItemId as ContentItemId);
  // S7·✓: the count rides above the correct band, from three in a row only,
  // and never leaves the session — the engine already resets it on a wrong.
  const mark =
    answered.verdict === 'correct' && state.run >= 3 ? `${state.run} in a row` : undefined;
  return (
    <AnswerBand
      tone={answered.verdict === 'correct' ? 'correct' : 'wrong'}
      roman={item?.roman}
      audio={false}
      pinned
      mark={mark}
      onAction={onNext}
    >
      {item?.bo ?? ''}
    </AnswerBand>
  );
}

function StopSkeleton() {
  return (
    <View className="gap-4 px-5 pt-8">
      <Skeleton shape="text" width="60%" />
      <Skeleton shape="block" height={180} />
      <Skeleton shape="text" />
      <Skeleton shape="text" />
    </View>
  );
}
