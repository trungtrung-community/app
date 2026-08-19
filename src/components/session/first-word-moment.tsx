/**
 * @fileoverview FirstWordMoment — B1, the crossing's one appearance.
 *
 * The first time the learner's Read progress covers a whole word, the letters
 * land one at a time and then resolve into the word (board frame B1). "Read it
 * again" replays the resolve — a state, not a screen — and "Keep going" hands
 * the stop back to its normal end flow.
 *
 * Two sentences, decided by the Speak roster (B1·n): a word the learner already
 * says is congratulated as saying-becomes-reading; a word never taught to say
 * gets the honest line instead, naming where it waits when the caller can.
 *
 * The landing is sequenced in JS state so the moment is testable as a tree —
 * each letter MOUNTS on its beat and arrives through a Reanimated preset, the
 * same split `src/components/core/motion.ts` uses for `arrive`. Under Reduce
 * Motion nothing is sequenced: the whole frame renders at rest.
 */

import {useEffect, useState} from 'react';
import {Text, View} from 'react-native';
import Animated, {FadeInDown, ReduceMotion, useReducedMotion} from 'react-native-reanimated';

import {lettersOf} from '../../domain/tibetan';
import {Button} from '../core/button';
import {duration, easing} from '../core/motion';
import {LetterTile} from '../learning/letter-tile';
import {TibetanText} from '../learning/tibetan-text';

/** One beat of the landing: the gap between one letter and the next. */
const BEAT_MS = duration.slow;

/**
 * How a letter lands and how the word resolves: dropping into place with the
 * one soft overshoot `--ease-settle` allows, per the preset argument in
 * `src/components/core/motion.ts`. `FadeInDown` rather than `arrive` because
 * these arrive from somewhere — the letters drop onto the line.
 */
const land = FadeInDown.duration(duration.base)
  .easing(easing.settle)
  .reduceMotion(ReduceMotion.System);

export type FirstWordMomentProps = {
  /** The word that crossed, in Tibetan script. */
  bo: string;
  /** The Trungtrung reading, under the resolved word. */
  reading?: string;
  gloss: string;
  /** The learner already says this word — Speak roster, met. Switches the sentence. */
  said: boolean;
  /** Where the unsaid word waits (a district name). Drawn only when `said` is false. */
  waitsAt?: string;
  onKeepGoing: () => void;
  testID?: string;
};

/**
 * The B1 frame: the crossing, worded from the board.
 *
 * @example <FirstWordMoment bo="ཨ་ཁུ" reading="a khu" gloss="uncle" said onKeepGoing={close} />
 */
export function FirstWordMoment({
  bo,
  reading,
  gloss,
  said,
  waitsAt,
  onKeepGoing,
  testID,
}: FirstWordMomentProps) {
  const reduced = useReducedMotion();
  const letters = lettersOf(bo);

  // How far the resolve has run: letters shown, then (at length + 1) the word.
  const [run, setRun] = useState(0);
  const [landedCount, setLandedCount] = useState(0);
  const allLanded = letters.length + 1;
  const resolved = landedCount > letters.length;

  // Adjusting state during render is React's documented pattern for reacting
  // to a changed value, and the same one the stop screen uses: a replay is a
  // new run and restarts the count, and Reduce Motion lands everything at once.
  const [seenRun, setSeenRun] = useState(run);
  if (seenRun !== run) {
    setSeenRun(run);
    setLandedCount(0);
  }
  if (reduced && landedCount < allLanded) {
    setLandedCount(allLanded);
  }

  // The beats only: each timer advances the count by one landing. The resets
  // above happen in render, so the effect never sets state synchronously.
  useEffect(() => {
    if (reduced) {
      return;
    }
    const beats = Array.from({length: allLanded}, (_, step) =>
      setTimeout(
        () => setLandedCount(current => Math.max(current, step + 1)),
        (step + 1) * BEAT_MS,
      ),
    );
    return () => beats.forEach(clearTimeout);
  }, [run, reduced, allLanded]);

  const headline = said ? 'You already say this one.' : 'You can read this one.';
  const subline = said ? 'Now you can read it.' : 'You were never taught it.';

  return (
    <View className="flex-1 bg-surface-app" testID={testID}>
      <View className="items-center gap-3 bg-teal-600 px-6 pb-8 pt-9">
        <Text accessibilityRole="header" className="type-title text-fg-on-accent text-center">
          {headline}
        </Text>
        <Text className="type-body text-fg-on-accent text-center">{subline}</Text>
      </View>
      <View className="flex-1 items-center justify-center gap-6 px-5">
        <View className="flex-row items-center gap-3">
          {letters.map((letter, index) =>
            index < landedCount ? (
              <Animated.View key={`${run}:${index}`} entering={land}>
                <LetterTile glyph={letter} state="correct" size="md" />
              </Animated.View>
            ) : null,
          )}
        </View>
        {resolved ? (
          <Animated.View key={`word:${run}`} entering={land}>
            <TibetanText size="hero" align="center" roman={reading} gloss={gloss}>
              {bo}
            </TibetanText>
          </Animated.View>
        ) : null}
        {resolved && !said && waitsAt !== undefined ? (
          <Animated.View key={`waits:${run}`} entering={land}>
            <Text className="type-body text-fg-muted px-8 text-center">
              {`It waits at ${waitsAt}. The letters got you there first.`}
            </Text>
          </Animated.View>
        ) : null}
      </View>
      <View className="gap-2 px-5 pb-6">
        <Button size="lg" fullWidth onPress={() => setRun(current => current + 1)}>
          Read it again
        </Button>
        <Button variant="ghost" size="md" fullWidth onPress={onKeepGoing}>
          Keep going
        </Button>
      </View>
    </View>
  );
}
