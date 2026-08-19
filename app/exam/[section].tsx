/**
 * @fileoverview The exam — X1 gate, X2 in progress, X3/X4 results, X5's wrong
 * band — as thin configuration over the drill machine (docs/07 2026-08-16).
 *
 * An exam is `useDrillSession.start` with the section as its pool, both
 * recognition modes mixed, and a sampled paper. Section exams end on a count
 * of what was right — no threshold, no percentage, no verdict word. The final
 * test (section 11) samples ~100 across everything met and is the one surface
 * in the product that shows a percentage, with its 90% mark stated in the
 * chrome from the first item. There is no mid-exam save: leaving drops the
 * session, and a retake draws a different paper.
 *
 * Not built here, a follow-up: the X4·b "Show me" beat (board `x4b` — the
 * self-checked real-word family with Again/Got it). It belongs to a deck-run
 * final test, and the recognition engine has no reveal beat to reuse.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {useEffect, useMemo, useState} from 'react';
import {ScrollView, Text, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Badge} from '../../src/components/core/badge';
import {Button} from '../../src/components/core/button';
import {IconButton} from '../../src/components/core/icon-button';
import {Tag} from '../../src/components/core/tag';
import {Dialog} from '../../src/components/feedback/dialog';
import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {AnswerBand} from '../../src/components/learning/answer-band';
import {CapabilityList, type Capability} from '../../src/components/learning/capability-list';
import {ExerciseFrame} from '../../src/components/session/exercise-frame';
import type {Items} from '../../src/components/session/types';
import type {ContentItemId, SectionId, Track} from '../../src/ports/content-ids';

import {selectWorthAnotherLook, useDrillSession} from '../../src/store/drill';
import type {SessionState} from '../../src/usecases/drill-plan';

/** docs/07 2026-08-16: section exams are 5–10 items — the cap on the draw. */
const SECTION_EXAM_QUESTIONS = 10;

/** The final test: ~100 items sampled across everything met. */
const FINAL_TEST_QUESTIONS = 100;

/** The one pass mark in the product — the final test's, and no other's. */
const FINAL_TEST_MARK = 90;

/** The section number whose exam is the final test. */
const FINAL_TEST_SECTION = 11;

/** The design system has no chevron-left; the down one rotates, as ListRow's does. */
const BACK_ROTATION: ViewStyle = {transform: [{rotate: '90deg'}]};

type ExamRef = {
  readonly sectionId: SectionId;
  readonly track: Track;
  readonly final: boolean;
};

/** `section.<track>.<number>` — the walk's section ids. Null when malformed. */
function parseSectionParam(raw: string): ExamRef | null {
  const [head, track, number] = raw.split('.');
  if (head !== 'section' || (track !== 'read' && track !== 'speak')) {
    return null;
  }
  const parsed = Number(number);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }
  return {sectionId: raw as SectionId, track, final: parsed === FINAL_TEST_SECTION};
}

export default function Exam() {
  const params = useLocalSearchParams<{section?: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slice = useDrillSession();
  const [began, setBegan] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);

  const ref = useMemo(() => parseSectionParam(params.section ?? ''), [params.section]);

  useEffect(() => () => useDrillSession.getState().reset(), []);

  if (ref === null) {
    return (
      <View className="flex-1 bg-surface-app px-5 pt-6" style={{paddingTop: insets.top}}>
        <EmptyState title="That exam is off the map" />
      </View>
    );
  }

  const begin = () => {
    setBegan(true);
    // The final test pools everything met; a section exam pools the section.
    // A fresh start reseeds the rng, so every paper — retakes included — is
    // a different draw.
    void useDrillSession
      .getState()
      .start(
        ref.final
          ? {kind: 'everything'}
          : {kind: 'section', sectionId: ref.sectionId, track: ref.track},
        'all',
        'recognise-mixed',
        {sample: ref.final ? FINAL_TEST_QUESTIONS : SECTION_EXAM_QUESTIONS},
      );
  };

  if (!began) {
    return <ExamGate final={ref.final} onBegin={begin} onDecline={() => router.back()} />;
  }

  const state = slice.state;
  const itemsById = (slice.pool?.itemsById ?? new Map()) as Items;
  const entry = state?.queue[state.index];
  const ended = state?.phase === 'ended' || entry?.position.kind === 'end';
  const total = state?.queue.filter(e => e.position.kind === 'exercise').length ?? 0;
  const right = state === null ? 0 : Math.max(0, total - state.misses.length);
  // The paper's items, not the pool's — the result registers what was asked.
  const asked =
    state === null
      ? []
      : [
          ...new Set(
            state.queue.flatMap(e =>
              e.position.kind === 'exercise' && e.position.exercise.itemId !== null
                ? [e.position.exercise.itemId]
                : [],
            ),
          ),
        ];
  const running = state !== null && !ended && total > 0;

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      <View className="flex-row items-center gap-3 px-5 py-2">
        <IconButton
          icon="x"
          label="Leave the exam"
          onPress={() => (running ? setQuitOpen(true) : router.back())}
        />
        {/* X4: the mark stands in the chrome from the first item — no surprise at the end. */}
        {ref.final ? (
          <Text className="type-body-strong text-fg-muted">Final test · 90% to pass</Text>
        ) : null}
        <View className="flex-1" />
        {running ? (
          // X2: a counter, never a bar — nothing fills up on this screen.
          <Text className="type-body-strong text-fg-muted" testID="exam-counter">
            {`${Math.min(state.index + 1, total)} of ${total}`}
          </Text>
        ) : null}
      </View>
      {slice.status === 'error' ? (
        <View className="px-5 pt-6">
          <EmptyState title="Try opening the exam again" />
        </View>
      ) : slice.status !== 'ready' || state === null ? (
        <View className="gap-4 px-5 pt-8">
          <Skeleton shape="text" width="60%" />
          <Skeleton shape="block" height={180} />
          <Skeleton shape="text" />
        </View>
      ) : total === 0 ? (
        <View className="px-5 pt-6">
          <EmptyState title="Nothing to examine yet — meet a few more words first" />
        </View>
      ) : (
        <>
          <ScrollView className="flex-1">
            <View className="gap-4 px-5 pb-32 pt-4">
              {ended || entry === undefined ? (
                ref.final ? (
                  <FinalResult
                    right={right}
                    total={total}
                    worthAnotherLook={selectWorthAnotherLook(state, null)}
                    itemsById={itemsById}
                    onRetake={begin}
                    onDone={() => router.back()}
                  />
                ) : (
                  <SectionResult
                    right={right}
                    total={total}
                    itemIds={asked}
                    worthAnotherLook={selectWorthAnotherLook(state, null)}
                    itemsById={itemsById}
                    onDone={() => router.back()}
                  />
                )
              ) : entry.position.kind === 'exercise' ? (
                <ExerciseFrame
                  key={entry.key}
                  entry={entry}
                  answered={state.answered}
                  matched={state.matched}
                  itemsById={itemsById}
                  onCommit={input => void useDrillSession.getState().commit(input)}
                />
              ) : null}
            </View>
          </ScrollView>
          {state.answered !== null && state.answered.verdict !== 'partial' ? (
            <Band
              state={state}
              itemsById={itemsById}
              onNext={() => void useDrillSession.getState().commit({kind: 'continue'})}
            />
          ) : null}
        </>
      )}
      {/* P4·x — the same dialog with exam wording, drawn rather than described. */}
      <Dialog
        open={quitOpen}
        title="Leave the exam?"
        onClose={() => setQuitOpen(false)}
        footer={
          <>
            <Button size="md" fullWidth onPress={() => setQuitOpen(false)}>
              Keep going
            </Button>
            <Button
              variant="ghost"
              size="md"
              fullWidth
              onPress={() => {
                setQuitOpen(false);
                // Nothing parks and nothing saves — the session is simply dropped.
                router.back();
              }}
            >
              Leave
            </Button>
          </>
        }
      >
        <Text className="type-body text-fg-muted">
          {`You're ${state?.index ?? 0} answers in. Nothing is kept — leaving starts a fresh set next time.`}
        </Text>
      </Dialog>
    </View>
  );
}

type ExamGateProps = {
  final: boolean;
  onBegin: () => void;
  onDecline: () => void;
};

/**
 * X1 — a gate you can decline with dignity: back chrome, ghost decline, and
 * nothing starts until *Start the exam*. No mascot: the crane's art does not
 * exist in this repo yet (see EmptyState).
 */
function ExamGate({final, onBegin, onDecline}: ExamGateProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      <View className="flex-row items-center gap-3 px-5 py-2">
        <IconButton icon="chevron-down" label="Back" style={BACK_ROTATION} onPress={onDecline} />
      </View>
      <View className="flex-1 gap-5 px-5 pt-8">
        <View className="flex-row">
          <Badge tone="soft">{final ? 'Final test' : 'Exam'}</Badge>
        </View>
        <Text accessibilityRole="header" className="type-title text-fg-heading">
          {final ? 'The final test' : 'The exam'}
        </Text>
        <Text className="type-body text-fg-muted">
          {final
            ? 'Everything you have met, mixed together — about 100 questions. The mark is 90%, and nothing is withheld under it: a retake is always open, and every paper is a fresh draw.'
            : 'Everything from this section, mixed together — up to ten questions. A count at the end, nothing else.'}
        </Text>
      </View>
      <View className="gap-2 px-5 pb-8">
        <Button size="lg" fullWidth onPress={onBegin}>
          Start the exam
        </Button>
        {/* The RB15-scoped practice door arrives with the hub's; back is honest today. */}
        <Button variant="ghost" size="lg" fullWidth onPress={onDecline}>
          Practise a little more first
        </Button>
      </View>
    </View>
  );
}

type BandProps = {
  state: SessionState;
  itemsById: Items;
  onNext: () => void;
};

/** X5 — the drill runner's own band: neutral correction, names the answer. */
function Band({state, itemsById, onNext}: BandProps) {
  const answered = state.answered;
  if (answered === null) {
    return null;
  }
  const item =
    answered.answerItemId === null
      ? undefined
      : itemsById.get(answered.answerItemId as ContentItemId);
  return (
    <AnswerBand
      tone={answered.verdict === 'correct' ? 'correct' : 'wrong'}
      roman={item?.roman}
      audio={false}
      pinned
      onAction={onNext}
    >
      {item?.bo ?? ''}
    </AnswerBand>
  );
}

/** The got items as a capabilities register — X3's middle block. */
function capabilitiesOf(
  itemIds: readonly string[],
  missed: ReadonlySet<string>,
  itemsById: Items,
): readonly Capability[] {
  return itemIds
    .filter(itemId => !missed.has(itemId))
    .map(itemId => itemsById.get(itemId as ContentItemId))
    .filter(item => item !== undefined)
    .map(item => ({
      capability: item.en ?? '',
      example: [item.bo, item.roman].filter(Boolean).join(' '),
    }));
}

type WorthAnotherLookProps = {
  itemIds: readonly string[];
  itemsById: Items;
};

/** What to revisit — the same affordance on X3 and X4·retake. */
function WorthAnotherLook({itemIds, itemsById}: WorthAnotherLookProps) {
  if (itemIds.length === 0) {
    return null;
  }
  return (
    <View className="gap-2">
      <Text className="type-body-strong text-fg-heading">
        {`${itemIds.length} worth another look`}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {itemIds.map(itemId => {
          const item = itemsById.get(itemId as ContentItemId);
          return item === undefined ? null : (
            <Tag key={itemId} size="md">
              {[item.bo, item.roman, item.en].filter(Boolean).join(' · ')}
            </Tag>
          );
        })}
      </View>
    </View>
  );
}

type SectionResultProps = {
  right: number;
  total: number;
  itemIds: readonly string[];
  worthAnotherLook: readonly string[];
  itemsById: Items;
  onDone: () => void;
};

/**
 * X3 — a count of what was right, capabilities, then what to revisit. A count
 * and nothing else: no threshold, no percentage, no verdict word — the
 * percentage belongs to the final test alone.
 */
function SectionResult({
  right,
  total,
  itemIds,
  worthAnotherLook,
  itemsById,
  onDone,
}: SectionResultProps) {
  const missed = new Set(worthAnotherLook);
  return (
    <View className="gap-6 py-6">
      <Text className="type-label text-fg-accent uppercase">Exam</Text>
      <Text accessibilityRole="header" className="type-title text-fg-heading">
        {`${right} of ${total} right`}
      </Text>
      <CapabilityList items={capabilitiesOf(itemIds, missed, itemsById)} />
      <WorthAnotherLook itemIds={worthAnotherLook} itemsById={itemsById} />
      <Button size="lg" fullWidth onPress={onDone}>
        Done
      </Button>
    </View>
  );
}

type FinalResultProps = {
  right: number;
  total: number;
  worthAnotherLook: readonly string[];
  itemsById: Items;
  onRetake: () => void;
  onDone: () => void;
};

/**
 * X4·pass / X4·retake — the one percentage surface in the product, with the
 * count beside it so the number traces to items rather than to a grade. Under
 * the mark withholds nothing: the retake is the primary action, and the word
 * "failed" appears nowhere.
 */
function FinalResult({
  right,
  total,
  worthAnotherLook,
  itemsById,
  onRetake,
  onDone,
}: FinalResultProps) {
  const percentage = total === 0 ? 0 : Math.round((100 * right) / total);
  const passed = percentage >= FINAL_TEST_MARK;
  return (
    <View className="gap-6 py-6">
      <Text className="type-label text-fg-accent uppercase">Final test</Text>
      <Text accessibilityRole="header" className="type-title text-fg-heading">
        {`${percentage}%`}
      </Text>
      <Text className="type-body-strong text-fg-heading">{`${right} of ${total} right`}</Text>
      {passed ? (
        <>
          <Text className="type-body text-fg-muted">The mark is 90%. You read the script.</Text>
          <Button size="lg" fullWidth onPress={onDone}>
            Carry on
          </Button>
        </>
      ) : (
        <>
          <Text className="type-body text-fg-muted">
            The mark is 90%. Everything stays open — the items are sampled, so the next set is a
            different paper.
          </Text>
          <WorthAnotherLook itemIds={worthAnotherLook} itemsById={itemsById} />
          <View className="gap-2">
            <Button size="lg" fullWidth onPress={onRetake}>
              Take it again
            </Button>
            <Button variant="ghost" size="lg" fullWidth onPress={onDone}>
              Not now
            </Button>
          </View>
        </>
      )}
    </View>
  );
}
