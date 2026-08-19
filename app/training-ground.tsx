/**
 * @fileoverview Q6/Q7 — the training ground: volume outside the walk, without
 * being scored for it (docs/03 §4.3).
 *
 * The loop is §4.3's: one syllable on a card, said aloud — no input, no prompt —
 * then revealed, where the recording plays and the reading appears; got it
 * advances, not yet returns the card to the pile. The pile never empties by
 * itself; the learner leaves when they leave, and leaving is not quitting, so
 * the x acts immediately — no dialog, nothing saved.
 *
 * **This screen writes no progress.** §4.3 says nothing about the scheduler:
 * the training ground is not scored, not graded — no run length, no personal
 * best, no streak — so a rating here reaches no store, feeds no due queue and
 * survives nothing. The only reads are the completed stops, for §4.3's gate:
 * "An item enters its pile only after the stop that teaches it."
 *
 * The metronome ships under the five signed conditions of docs/07 (2026-08-07),
 * quoted verbatim — if any one of them is dropped, the exception lapses and the
 * feature goes with it:
 *
 * 1. "Off by default. The learner turns it on; it is never on when they
 *    arrive."
 * 2. "The learner sets the tempo, and can change it during the drill."
 * 3. "At the set tempo the pile advances to the next card — the next
 *    syllable — automatically. Advancing is pacing, never scoring."
 * 4. "Nothing is scored, compared, or lost by stopping. No run length, no
 *    personal best, no accuracy, no streak."
 * 5. "A pacing instrument, never a timer. The way a musician's is — pointed
 *    at oneself, never a clock the app imposes on an answer."
 *
 * A beat therefore passes the current card back into the pile — it removes
 * nothing, marks nothing, and falling behind has no consequence. There is no
 * tick sound yet: the cue set carries none, so the beat is silent pacing until
 * a clip exists.
 *
 * Reached as Q1's fifth mode card; the door from the Read section hub (RBH) is
 * the map sibling's follow-up, not wired here.
 */

import {useRouter} from 'expo-router';
import {useEffect, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../src/components/core/button';
import {IconButton} from '../src/components/core/icon-button';
import {EmptyState} from '../src/components/feedback/empty-state';
import {Skeleton} from '../src/components/feedback/skeleton';
import {AudioButton} from '../src/components/learning/audio-button';
import {RatingButtons} from '../src/components/learning/rating-buttons';
import {StatPill} from '../src/components/learning/stat-pill';
import {TibetanText} from '../src/components/learning/tibetan-text';
import {Switch} from '../src/components/forms/switch';
import {content} from '../src/composition/container';
import {playClip} from '../src/composition/play';
import type {StopId} from '../src/ports/content-ids';
import type {Stop} from '../src/ports/content-model';

import {useProgress} from '../src/store/progress';
import {useContent} from '../src/store/use-content';
import {
  drawPile,
  pileCounts,
  readSectionCeiling,
  type PileCount,
  type TrainingCard,
  type TrainingPileId,
} from '../src/usecases/training-piles';

/** The board's specimen tempo — "72 to the minute". */
const DEFAULT_TEMPO = 72;

/** The board names no increments; a musician's four-per-step within a calm range. */
const TEMPO_STEP = 4;
const TEMPO_MIN = 40;
const TEMPO_MAX = 160;

const MINUTE_MS = 60_000;

/** The cards still in rotation, and whether the top one has been turned. */
type Deck = {
  readonly cards: readonly TrainingCard[];
  readonly revealed: boolean;
};

/**
 * The current card goes back into the pile, unmarked.
 *
 * Shared by "not yet" and the metronome's beat: neither removes anything, so
 * the pile never empties by itself.
 */
function passCard(deck: Deck | null): Deck | null {
  if (deck === null || deck.cards.length === 0) {
    return deck;
  }
  const [first, ...rest] = deck.cards;
  return {cards: [...rest, first as TrainingCard], revealed: false};
}

/** "Got it" is the one thing that takes a card out of rotation. */
function putCardDown(deck: Deck | null): Deck | null {
  if (deck === null || deck.cards.length === 0) {
    return deck;
  }
  return {cards: deck.cards.slice(1), revealed: false};
}

export default function TrainingGround() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const progress = useProgress(state => state.progress);
  const completed = progress?.completedStops ?? [];
  const completedKey = completed.join(',');

  // §4.3's gate, resolved once: the completed stops name the Read sections the
  // learner has walked to the end, and the ceiling scopes every pile query. A
  // completed id the content no longer carries is skipped, never fatal.
  const load = useContent(
    async source => {
      const sections = await source.listSections('read');
      const stops = await Promise.all(
        completed.map(id => source.getStop(id as StopId).catch((): Stop | null => null)),
      );
      const ceiling = readSectionCeiling(
        sections,
        stops.filter((stop): stop is Stop => stop !== null),
      );
      return {ceiling, piles: await pileCounts(source, ceiling)};
    },
    [completedKey],
  );

  const piles = load.status === 'ready' ? load.data.piles : [];
  const ceiling = load.status === 'ready' ? load.data.ceiling : 0;

  const [chosenPile, setChosenPile] = useState<TrainingPileId | null>(null);
  const activePile = chosenPile ?? piles[0]?.id ?? null;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [metronome, setMetronome] = useState({on: false, tempo: DEFAULT_TEMPO});

  // A fresh shuffle whenever the pile changes hands. Nothing is carried over:
  // there is no run to preserve, because there is no run.
  useEffect(() => {
    if (activePile === null) {
      return;
    }
    let live = true;
    void content()
      .then(source => drawPile(source, activePile, ceiling, Math.random))
      .then(cards => {
        if (live) {
          setDeck({cards, revealed: false});
        }
      })
      .catch(() => {
        // A failed draw leaves the previous deck standing; the screen stays calm.
      });
    return () => {
      live = false;
    };
  }, [activePile, ceiling]);

  // Condition 3: at the set tempo the pile advances automatically. The beat
  // passes the card back — pacing, never scoring — and stopping (condition 4)
  // just clears the interval: the deck is untouched and nothing was counted.
  const idle = deck === null || deck.cards.length === 0;
  useEffect(() => {
    if (!metronome.on || idle) {
      return;
    }
    const beat = setInterval(() => setDeck(passCard), MINUTE_MS / metronome.tempo);
    return () => clearInterval(beat);
  }, [metronome, idle]);

  const card = deck !== null && deck.cards.length > 0 ? (deck.cards[0] as TrainingCard) : null;
  const revealed = deck?.revealed === true && card !== null;

  const reveal = () => {
    if (card === null) {
      return;
    }
    setDeck(current => (current === null ? current : {...current, revealed: true}));
    if (card.audio !== null) {
      void playClip(card.audio);
    }
  };

  const nudgeTempo = (delta: number) =>
    setMetronome(current => ({
      ...current,
      tempo: Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, current.tempo + delta)),
    }));

  return (
    <View
      className="flex-1 bg-surface-app"
      style={{paddingTop: insets.top, paddingBottom: insets.bottom}}
    >
      <View className="flex-row items-center gap-3 px-3 py-2">
        {/* Leaving is not quitting: back acts at once, no dialog, nothing saved. */}
        <IconButton icon="chevron-down" label="Back" onPress={() => router.back()} />
        <View className="flex-1">
          <Text className="type-title text-fg-heading">Training ground</Text>
          <Text className="type-caption text-fg-muted">
            As much as you want. Nothing here is counted.
          </Text>
        </View>
      </View>

      {load.status === 'loading' ? (
        <View className="gap-2 px-5">
          <Skeleton shape="text" />
          <Skeleton shape="text" />
        </View>
      ) : null}
      {load.status === 'error' ? (
        <EmptyState title="Try opening the training ground again" />
      ) : null}
      {load.status === 'ready' && piles.length === 0 ? (
        <EmptyState title="The training ground opens as you walk">
          Each Read stop you finish adds its cards here.
        </EmptyState>
      ) : null}

      {load.status === 'ready' && piles.length > 0 ? (
        <>
          <PileRail piles={piles} active={activePile} onChoose={setChosenPile} />
          {card !== null ? (
            <View className="flex-1 items-center justify-center gap-5 px-6">
              <View
                className="w-full items-center gap-4 rounded-lg bg-surface-card px-6 py-8"
                testID="training-card"
              >
                <TibetanText size="hero" align="center">
                  {card.bo}
                </TibetanText>
                {revealed ? (
                  <>
                    <Text className="type-title text-fg-heading" testID="training-reading">
                      {card.reading}
                    </Text>
                    {card.gloss !== null ? (
                      <Text className="type-body text-fg-muted">{card.gloss}</Text>
                    ) : null}
                    <AudioButton
                      onPress={() => {
                        if (card.audio !== null) {
                          void playClip(card.audio);
                        }
                      }}
                    />
                  </>
                ) : (
                  <Text className="type-body text-fg-muted">Say it aloud, then turn it.</Text>
                )}
              </View>
              {revealed ? (
                <RatingButtons
                  prompt=""
                  againLabel="Not yet"
                  gotItLabel="Got it"
                  onAgain={() => setDeck(passCard)}
                  onGotIt={() => setDeck(putCardDown)}
                />
              ) : (
                <Button size="lg" fullWidth onPress={reveal}>
                  Turn it over
                </Button>
              )}
            </View>
          ) : (
            // The learner put every card down themselves — the pile never
            // empties by itself. No total, no time, no praise ranked against
            // anything: pick another pile, or leave.
            <View className="flex-1 justify-center">
              <EmptyState title="You put the last card down">
                Pick another pile, or leave — nothing here is counted.
              </EmptyState>
            </View>
          )}
          <Metronome
            on={metronome.on}
            tempo={metronome.tempo}
            onToggle={on => setMetronome(current => ({...current, on}))}
            onSlower={() => nudgeTempo(-TEMPO_STEP)}
            onFaster={() => nudgeTempo(TEMPO_STEP)}
          />
        </>
      ) : null}
    </View>
  );
}

type PileRailProps = {
  readonly piles: readonly PileCount[];
  readonly active: TrainingPileId | null;
  readonly onChoose: (id: TrainingPileId) => void;
};

/** The chooser: one pill per non-empty pile, counts bound in their own units. */
function PileRail({piles, active, onChoose}: PileRailProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2 px-5 py-2"
    >
      {piles.map(pile => (
        <Pressable
          key={pile.id}
          accessibilityRole="button"
          accessibilityLabel={`${pile.title}, ${pile.count} ${pile.unit}`}
          aria-selected={pile.id === active}
          onPress={() => onChoose(pile.id)}
        >
          <StatPill
            tone={pile.id === active ? 'accent' : 'neutral'}
            value={`${pile.title} · ${pile.count}`}
            label={`${pile.title}, ${pile.count} ${pile.unit}`}
          />
        </Pressable>
      ))}
    </ScrollView>
  );
}

type MetronomeProps = {
  readonly on: boolean;
  readonly tempo: number;
  readonly onToggle: (on: boolean) => void;
  readonly onSlower: () => void;
  readonly onFaster: () => void;
};

/**
 * Q7's strip. Condition 1 lives in the caller's initial state — never on when
 * the learner arrives — and condition 2 here: the learner's own tempo,
 * changeable mid-drill. The copy is the board's.
 */
function Metronome({on, tempo, onToggle, onSlower, onFaster}: MetronomeProps) {
  return (
    <View className="gap-2 px-5 pb-4">
      <Switch
        label="Metronome"
        description={
          on
            ? `${tempo} to the minute — change it any time`
            : 'Off — a beat to play against, never a clock'
        }
        checked={on}
        onChange={onToggle}
      />
      {on ? (
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button variant="secondary" size="sm" fullWidth onPress={onSlower}>
              Slower
            </Button>
          </View>
          <View className="flex-1">
            <Button variant="secondary" size="sm" fullWidth onPress={onFaster}>
              Faster
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}
