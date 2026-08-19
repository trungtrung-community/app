/**
 * @fileoverview The stop screen — the lesson loop's one route.
 *
 * Thin by design: the engine owns the queue and the verdicts, the use case owns
 * persistence, and this file only dispatches `queue[index]` by kind to the
 * renderers in src/components/session. Full-screen at the stack root, so the
 * tab bar stays out of a lesson.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {useEffect, useRef, useState} from 'react';
import {ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {content} from '../../src/composition/container';
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
import {FirstWordMoment} from '../../src/components/session/first-word-moment';
import {IntroScreen} from '../../src/components/session/intro-screen';
import {ItemCard} from '../../src/components/session/item-card';
import {MomentScreen} from '../../src/components/session/moment-screen';
import {NoteCard} from '../../src/components/session/note-card';
import {QuitDialog} from '../../src/components/session/quit-dialog';
import {ResumeIntro} from '../../src/components/session/resume-intro';
import {SecondLookIntro} from '../../src/components/session/second-look-intro';
import type {Items} from '../../src/components/session/types';
import type {ContentItemId, StopId, VocabId} from '../../src/ports/content-ids';
import type {ContentSource} from '../../src/ports/content-source';
import type {Progress} from '../../src/ports/progress-store';

import {useProgress} from '../../src/store/progress';
import {useStopSession} from '../../src/store/session';
import {readableWords} from '../../src/usecases/read-progress';
import type {SessionState} from '../../src/usecases/start-stop';
import type {Ceremony} from '../../src/usecases/stop-ceremony';
import type {CommitInput} from '../../src/usecases/submit-answer';

/** What B1 draws: the crossed word, and which of the two sentences it earned. */
type FirstWord = {
  readonly bo: string;
  readonly reading?: string;
  readonly gloss: string;
  readonly said: boolean;
  readonly waitsAt?: string;
};

/**
 * B1's once, derived rather than stored: the moment fires only when the words
 * readable before this stop numbered zero and more than zero after its ending
 * commit. That transition happens once per learner, so no flag is persisted —
 * the crossing stays a function of progress (spec §10.1).
 */
async function firstWordCrossing(
  before: Progress | null,
  after: Progress | null,
): Promise<FirstWord | null> {
  const source = await content();
  const deps = {walk: source, script: source, words: source};
  const beforeWords = await readableWords(deps, before);
  if (beforeWords.length > 0) {
    return null;
  }
  const [word] = await readableWords(deps, after);
  if (word === undefined) {
    return null;
  }
  // B1·n's split: the sentence switches on the Speak roster AND on having met
  // the word there — a rostered word never met still gets the honest line.
  const said = word.speakRef !== null && (after?.items[word.speakRef]?.state ?? 'new') !== 'new';
  return {
    bo: word.bo,
    reading: word.reading ?? undefined,
    gloss: word.glosses[0] ?? '',
    said,
    waitsAt: said ? undefined : await waitingPlace(source, word.speakRef),
  };
}

/** The district where an unsaid word's Speak entry waits, for B1·n's honest line. */
async function waitingPlace(
  source: ContentSource,
  speakRef: VocabId | null,
): Promise<string | undefined> {
  if (speakRef === null) {
    return undefined;
  }
  try {
    const vocab = await source.getVocabulary(speakRef);
    return (await source.getDistrict(vocab.district)).name;
  } catch {
    return undefined;
  }
}

export default function Stop() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slice = useStopSession();

  const [quitOpen, setQuitOpen] = useState(false);
  const [carriedOn, setCarriedOn] = useState(false);
  /** Set once the ending commit lands and the G4 sheet still has to run. */
  const [pendingCeremony, setPendingCeremony] = useState<Ceremony | null>(null);
  /** The crossed word, computed at the ending commit; null when B1 has nothing to say. */
  const [firstWord, setFirstWord] = useState<FirstWord | null>(null);
  /** Set while B1 stands between the G4 beat and the leave; holds where Keep going lands. */
  const [momentCeremony, setMomentCeremony] = useState<Ceremony | null>(null);
  /** Progress as it stood when this stop went ready — the crossing's "before". */
  const beforeStop = useRef<Progress | null>(null);
  const capturedFor = useRef<string | null>(null);

  // Adjusting state during render is React's documented pattern for reacting
  // to a changed prop — the same navigation that restarts the session below
  // must also re-arm the interstitials.
  const [seenId, setSeenId] = useState(id);
  if (seenId !== id) {
    setSeenId(id);
    setQuitOpen(false);
    setCarriedOn(false);
    setPendingCeremony(null);
    setFirstWord(null);
    setMomentCeremony(null);
  }

  useEffect(() => {
    // A route param is a raw string; the brand is restored at the boundary.
    void useStopSession.getState().start(id as StopId);
    return () => useStopSession.getState().reset();
  }, [id]);

  // The "before" is cut when the session goes ready, ahead of any commit, so a
  // word crossed mid-stop still counts as crossed BY this stop at its end.
  useEffect(() => {
    if (slice.status === 'ready' && capturedFor.current !== id) {
      capturedFor.current = id;
      beforeStop.current = useProgress.getState().progress;
    }
  }, [slice.status, id]);

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
      .then(async ceremony => {
        // A crossing that cannot be computed does not run — the stop still
        // closes normally, the same stance `finish` takes on the ceremony.
        const crossing = await firstWordCrossing(
          beforeStop.current,
          useProgress.getState().progress,
        ).catch((): FirstWord | null => null);
        setFirstWord(crossing);
        // G4 first where the stop holds a card, then B1, then the leave;
        // S8·nc with no crossing goes straight through.
        if (useStopSession.getState().artifactCards.length > 0) {
          setPendingCeremony(ceremony);
        } else if (crossing !== null) {
          setMomentCeremony(ceremony);
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

  // B1 is its own frame: the crossing replaces the stop chrome until Keep going.
  if (momentCeremony !== null && firstWord !== null) {
    return (
      <View
        className="flex-1 bg-surface-app"
        style={{paddingTop: insets.top, paddingBottom: insets.bottom}}
      >
        <FirstWordMoment
          bo={firstWord.bo}
          reading={firstWord.reading}
          gloss={firstWord.gloss}
          said={firstWord.said}
          waitsAt={firstWord.waitsAt}
          onKeepGoing={() => leaveTo(momentCeremony)}
        />
      </View>
    );
  }

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
          // B1 stands after the G4 beat and before the ceremony routing.
          if (firstWord !== null) {
            setMomentCeremony(ceremony ?? {kind: 'none'});
          } else {
            leaveTo(ceremony ?? {kind: 'none'});
          }
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
      return <NoteCard text={position.text} note={position.note} onContinue={onContinue} />;
    case 'exercise':
      return (
        <ExerciseFrame
          entry={entry}
          answered={state.answered}
          matched={state.matched}
          filled={state.filled}
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
          recap={position.recap}
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
  // Where the rule is the lesson the sentence rides the headline (docs/03 §2,
  // amended 2026-08-16): the answered exercise's `reason` is the band's text,
  // verdict and rule at once, and it displaces the answer line.
  const entry = state.queue[state.index];
  const reason =
    entry?.position.kind === 'exercise' && entry.key === answered.key
      ? entry.position.exercise.reason
      : undefined;
  // S7·✓: the count rides above the correct band, from three in a row only,
  // and never leaves the session — the engine already resets it on a wrong.
  const mark =
    answered.verdict === 'correct' && state.run >= 3 ? `${state.run} in a row` : undefined;
  return (
    <AnswerBand
      tone={answered.verdict === 'correct' ? 'correct' : 'wrong'}
      roman={reason === undefined ? item?.roman : undefined}
      audio={false}
      pinned
      mark={mark}
      onAction={onNext}
    >
      {reason ?? item?.bo ?? ''}
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
