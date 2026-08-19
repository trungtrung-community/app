/**
 * @fileoverview The drill runner — V4/V5 flashcards, the tap modes, V13 pair
 * boards, and the V10/E6 summary as its closing phase.
 *
 * A chosen drill, so the chrome is §4's second row: an `n of m` counter, never
 * a progress bar, and the x leaves immediately — no dialog, ratings kept —
 * because every rating was folded into progress the moment it was given. The
 * engine modes reuse the stop's own renderers (ExerciseFrame, AnswerBand), so
 * a drill and a lesson cannot disagree about how an exercise looks. Full
 * screen at the stack root, so the tab bar stays out of a drill.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../src/components/core/button';
import {IconButton} from '../../src/components/core/icon-button';
import {Tag} from '../../src/components/core/tag';
import {EmptyState} from '../../src/components/feedback/empty-state';
import {Skeleton} from '../../src/components/feedback/skeleton';
import {AnswerBand} from '../../src/components/learning/answer-band';
import {CapabilityList} from '../../src/components/learning/capability-list';
import {FlashCard} from '../../src/components/learning/flash-card';
import {RatingButtons} from '../../src/components/learning/rating-buttons';
import {ExerciseFrame} from '../../src/components/session/exercise-frame';
import type {Items} from '../../src/components/session/types';
import type {ContentItemId} from '../../src/ports/content-ids';

import {selectWorthAnotherLook, useDrillSession} from '../../src/store/drill';
import {DRILL_MODES, type DrillModeId} from '../../src/usecases/drill-modes';
import type {DrillPool, DrillPoolRef} from '../../src/usecases/drill-pool';
import {parsePoolParam} from '../../src/usecases/drill-pool';
import type {DrillSelection, FlashDeckState, SessionState} from '../../src/usecases/drill-plan';

type Params = {
  mode?: string;
  pool?: string;
  selection?: string;
  entry?: string;
};

/** The summary returns where the drill was entered (V10/E6). */
function entryLabel(entry: string): string {
  switch (entry) {
    case 'district':
      return 'Back to the district';
    case 'still-getting':
      return 'Back to Worth another look';
    default:
      return 'Back to Practice';
  }
}

/** The eyebrow's scope: the pool's district, or everything. */
function scopeLabel(ref: DrillPoolRef, pool: DrillPool | null): string {
  if (ref.kind === 'everything') {
    return 'Everything';
  }
  const first = pool?.districtNameByItem.values().next();
  return first === undefined || first.done ? '' : first.value;
}

export default function Drill() {
  const params = useLocalSearchParams<Params>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slice = useDrillSession();

  const modeId = useMemo<DrillModeId | null>(() => {
    const found = DRILL_MODES.find(candidate => candidate.id === params.mode);
    return found?.id ?? null;
  }, [params.mode]);
  const ref = useMemo<DrillPoolRef | null>(() => {
    try {
      return parsePoolParam(params.pool ?? '');
    } catch {
      return null;
    }
  }, [params.pool]);
  const selection: DrillSelection = params.selection === 'still-getting' ? 'still-getting' : 'all';
  const entry = params.entry ?? 'practice';

  useEffect(() => {
    if (modeId !== null && ref !== null) {
      void useDrillSession.getState().start(ref, selection, modeId);
    }
    return () => useDrillSession.getState().reset();
  }, [modeId, ref, selection]);

  if (modeId === null || ref === null) {
    return (
      <View className="flex-1 bg-surface-app px-5 pt-6" style={{paddingTop: insets.top}}>
        <EmptyState title="That drill is off the map" />
      </View>
    );
  }

  const state = slice.state;
  const deck = slice.deck;
  const itemsById = (slice.pool?.itemsById ?? new Map()) as Items;
  const ended = deck !== null ? deck.phase === 'ended' : atEnd(state);
  const counter = ended ? null : counterText(modeId, state, deck);

  const summary = (
    <DrillSummary
      eyebrow={`${scopeLabel(ref, slice.pool)} · ${DRILL_MODES.find(m => m.id === modeId)?.title ?? ''}`}
      itemIds={slice.set?.itemIds ?? []}
      worthAnotherLook={selectWorthAnotherLook(state, deck)}
      kinds={slice.pool?.itemKinds ?? new Map()}
      itemsById={itemsById}
      doneLabel={entryLabel(entry)}
      onDone={() => {
        if (state !== null) {
          void useDrillSession
            .getState()
            .commit({kind: 'finish'})
            .then(() => router.back());
          return;
        }
        router.back();
      }}
      onAgain={() => void useDrillSession.getState().start(ref, selection, modeId)}
    />
  );

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      <View className="flex-row items-center gap-3 px-5 py-2">
        {/* The x leaves immediately — no dialog, ratings kept (docs/03 §4). */}
        <IconButton icon="x" label="Leave the drill" onPress={() => router.back()} />
        <View className="flex-1" />
        {counter !== null ? (
          <Text className="type-body-strong text-fg-muted" testID="drill-counter">
            {counter}
          </Text>
        ) : null}
      </View>
      {slice.status === 'error' ? (
        <View className="px-5 pt-6">
          <EmptyState title="That drill is off the map" />
        </View>
      ) : slice.status !== 'ready' ? (
        <DrillSkeleton />
      ) : deck !== null ? (
        ended ? (
          <ScrollView className="flex-1">
            <View className="gap-4 px-5 pb-16 pt-4">{summary}</View>
          </ScrollView>
        ) : (
          <Flashcard deck={deck} itemsById={itemsById} />
        )
      ) : state !== null ? (
        <>
          <ScrollView className="flex-1">
            <View className="gap-4 px-5 pb-32 pt-4">
              {modeId === 'pair-match' && !ended ? (
                <Text className="type-body text-fg-muted">Tap a word and its meaning.</Text>
              ) : null}
              <Engine state={state} itemsById={itemsById} summary={summary} />
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
      ) : (
        <DrillSkeleton />
      )}
    </View>
  );
}

/** Whether the engine session stands on its end position. */
function atEnd(state: SessionState | null): boolean {
  const entry = state?.queue[state.index];
  return state?.phase === 'ended' || entry?.position.kind === 'end';
}

/**
 * The counter — plain text, never a bar. Boards count boards (V13); everything
 * else counts its own entries, and the total grows when Again re-queues.
 */
function counterText(
  mode: DrillModeId,
  state: SessionState | null,
  deck: FlashDeckState | null,
): string | null {
  if (deck !== null) {
    if (deck.total === 0) {
      return null;
    }
    return `${Math.min(deck.index + 1, deck.total)} of ${deck.total}`;
  }
  if (state === null) {
    return null;
  }
  const total = state.queue.filter(entry => entry.position.kind === 'exercise').length;
  if (total === 0) {
    return null;
  }
  const n = Math.min(state.index + 1, total);
  return mode === 'pair-match' ? `board ${n} of ${total}` : `${n} of ${total}`;
}

type FlashcardProps = {
  deck: FlashDeckState;
  itemsById: Items;
};

/** V4/V5 — the card, keyed per deck position so the face resets each draw. */
function Flashcard({deck, itemsById}: FlashcardProps) {
  const card = deck.queue[deck.index];
  const item = card === undefined ? undefined : itemsById.get(card.itemId as ContentItemId);
  return (
    <CardFace
      key={deck.index}
      bo={item?.bo ?? ''}
      roman={item?.roman}
      en={item?.en ?? ''}
      def={
        item !== undefined && 'enDefinition' in item ? (item.enDefinition ?? undefined) : undefined
      }
    />
  );
}

type CardFaceProps = {
  bo: string;
  roman?: string;
  en: string;
  def?: string;
};

function CardFace({bo, roman, en, def}: CardFaceProps) {
  const [face, setFace] = useState<'front' | 'back'>('front');
  return (
    <View className="flex-1 gap-5 px-5 pb-6 pt-4">
      <View className="flex-1">
        <FlashCard face={face} bo={bo} roman={roman} en={en} def={def} />
      </View>
      {face === 'front' ? (
        <Button size="lg" fullWidth onPress={() => setFace('back')}>
          Turn over
        </Button>
      ) : (
        <RatingButtons
          onAgain={() => void useDrillSession.getState().rate('again')}
          onGotIt={() => void useDrillSession.getState().rate('got-it')}
        />
      )}
    </View>
  );
}

type EngineProps = {
  state: SessionState;
  itemsById: Items;
  summary: ReactNode;
};

/** Dispatches the current queue entry: an exercise frame, or the summary. */
function Engine({state, itemsById, summary}: EngineProps) {
  const entry = state.queue[state.index];
  if (entry === undefined || atEnd(state)) {
    return summary;
  }
  if (entry.position.kind !== 'exercise') {
    return null;
  }
  return (
    <ExerciseFrame
      key={entry.key}
      entry={entry}
      answered={state.answered}
      matched={state.matched}
      itemsById={itemsById}
      onCommit={input => void useDrillSession.getState().commit(input)}
    />
  );
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

type DrillSummaryProps = {
  eyebrow: string;
  itemIds: readonly string[];
  worthAnotherLook: readonly string[];
  kinds: ReadonlyMap<string, 'vocab' | 'phrase'>;
  itemsById: Items;
  doneLabel: string;
  onDone: () => void;
  onAgain: () => void;
};

/**
 * V10/E6 — what you can do now, never a percentage. The worth-another-look
 * block appears only when non-empty, and the primary action returns where the
 * drill was entered.
 */
function DrillSummary({
  eyebrow,
  itemIds,
  worthAnotherLook,
  kinds,
  itemsById,
  doneLabel,
  onDone,
  onAgain,
}: DrillSummaryProps) {
  const missed = new Set(worthAnotherLook);
  const got = itemIds.filter(itemId => !missed.has(itemId));
  const words = got.filter(itemId => kinds.get(itemId) === 'vocab').length;
  const phrases = got.length - words;
  const material =
    words > 0 && phrases > 0
      ? 'words and phrases'
      : phrases > 0
        ? `${phrases === 1 ? 'phrase' : 'phrases'}`
        : `${words === 1 ? 'word' : 'words'}`;
  const example = got
    .map(itemId => itemsById.get(itemId as ContentItemId))
    .filter(item => item !== undefined)
    .map(item => `${item.bo} ${item.roman ?? ''}`.trim())
    .join(' · ');

  return (
    <View className="gap-6 py-6">
      <Text className="type-label text-fg-accent uppercase">{eyebrow}</Text>
      <Text accessibilityRole="header" className="type-title text-fg-heading">
        That&apos;s the set
      </Text>
      {got.length > 0 ? (
        <CapabilityList
          items={[
            {
              capability: `You can now recognise ${got.length} more ${material} here`,
              ...(example ? {example} : {}),
            },
          ]}
        />
      ) : null}
      {worthAnotherLook.length > 0 ? (
        <View className="gap-2">
          <Text className="type-body-strong text-fg-heading">
            {`${worthAnotherLook.length} to come back to`}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {worthAnotherLook.map(itemId => {
              const item = itemsById.get(itemId as ContentItemId);
              return item === undefined ? null : (
                <Tag key={itemId} size="md">
                  {[item.bo, item.roman, item.en].filter(Boolean).join(' · ')}
                </Tag>
              );
            })}
          </View>
        </View>
      ) : null}
      <View className="gap-2">
        <Button size="lg" fullWidth onPress={onDone}>
          {doneLabel}
        </Button>
        <Button variant="ghost" size="lg" fullWidth onPress={onAgain}>
          Practise again
        </Button>
      </View>
    </View>
  );
}

function DrillSkeleton() {
  return (
    <View className="gap-4 px-5 pt-8">
      <Skeleton shape="block" height={220} />
      <Skeleton shape="text" />
      <Skeleton shape="text" />
    </View>
  );
}
