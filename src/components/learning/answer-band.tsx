/**
 * @fileoverview AnswerBand — the band an answered exercise pins to the bottom.
 *
 * Every exercise family ends here, which is the whole reason it is a component: fifty-six
 * hand-written copies of one pattern are fifty-six chances to drift.
 *
 * **Two tones and no third.** `correct` is `--surface-correct` and names the answer with its
 * romanization. `wrong` is `--surface-alert`, the crane's red at its softest — the same fill
 * `LetterTile` and `SyllableChip` already use for a wrong pick, so the state is legible
 * before the sentence is read. The fill is the only red: the copy stays neutral ink, because
 * a miss is information and not a scolding.
 *
 * `reason` is **optional, and a band without one is correct rather than degraded** (amended
 * 2026-08-16). It binds only where the rule *is* the lesson — the glyph and stack drills,
 * spot-it, sort-what-changed. On a recognition drill the band names the answer instead: a
 * sentence about a rule the screen never showed is pollution. When it is used it comes from
 * the exercise record's `reason` and is never authored on a frame.
 *
 * `mark` is the one count a correct band may carry: the run inside the current exercise set,
 * worded the way the product words it. Two rules belong to the caller and cannot live here —
 * it appears only from three in a row, and it is never carried to the profile, because the
 * streak lives once and quietly on P1. One pill and no second: a band with two counts stops
 * being about the language.
 */

import type {StyleProp, TextStyle, ViewStyle} from 'react-native';
import {Text, View} from 'react-native';

import {Button} from '../core/button';
import {color, fontFamily, fontSize, leading, space} from '../../theme/tokens.generated';
import {AudioButton} from './audio-button';
import {StatPill, type StatTone} from './stat-pill';
import {mixedTibetan} from './tibetan-text';

/** Fill, heading ink, body ink and the action's default word, per tone. */
const TONES = {
  correct: {fill: color.surfaceCorrect, head: color.ink900, body: color.ink800, action: 'Next'},
  wrong: {
    fill: color.surfaceAlert,
    head: color.textHeading,
    body: color.textMuted,
    action: 'Continue',
  },
} as const;

export type AnswerBandTone = keyof typeof TONES;

export type AnswerBandProps = {
  tone?: AnswerBandTone;
  /** The answer, in whichever script it is in. Routed through mixedTibetan. */
  children: string;
  /** The Trungtrung romanization of the answer. */
  roman?: string;
  /** The rule, where the rule is the lesson. Omit everywhere else — see above. */
  reason?: string;
  audio?: boolean;
  /** Overrides the tone's own word. */
  actionLabel?: string;
  onAction?: () => void;
  onAudio?: () => void;
  /**
   * Pins itself to the bottom of the frame, which only has to be a positioned parent.
   *
   * `false` for a specimen or a scrolling page.
   */
  pinned?: boolean;
  /** The run inside this set, worded as the product words it: "4 in a row". */
  mark?: string;
  markTone?: StatTone;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The band that closes an exercise.
 *
 * @example <AnswerBand tone="correct" roman="trashi delek" onAction={next}>བཀྲ་ཤིས་བདེ་ལེགས</AnswerBand>
 * @example
 * // The rule only where the rule is the lesson.
 * <AnswerBand tone="wrong" reason="ར་ under a letter makes it a stack." onAction={next}>ཀྲ</AnswerBand>
 */
export function AnswerBand({
  tone = 'correct',
  children,
  roman,
  reason,
  audio = true,
  actionLabel,
  onAction,
  onAudio,
  pinned = true,
  mark,
  markTone = 'streak',
  style,
  testID,
}: AnswerBandProps) {
  const {fill, head, body, action} = TONES[tone];

  const band = (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[BAND, {backgroundColor: fill}, style]}
      testID={testID}
    >
      {audio ? <AudioButton size="sm" onPress={onAudio} /> : null}
      <View className="flex-1" style={COLUMN}>
        <Text style={[HEAD, {color: head}]}>{mixedTibetan(children)}</Text>
        {roman ? <Text style={[ROMAN, {color: body}]}>{roman}</Text> : null}
        {reason ? <Text style={[REASON, {color: body}]}>{mixedTibetan(reason)}</Text> : null}
      </View>
      <Button size="md" onPress={onAction}>
        {actionLabel ?? action}
      </Button>
    </View>
  );

  if (!mark) {
    return pinned ? <View style={PINNED}>{band}</View> : band;
  }

  // The count rides in the same stack as the band, so nothing on a frame has to track the
  // band's rendered height to place it.
  return (
    <View style={[pinned ? PINNED : null, MARK_STACK]}>
      <View className="items-center" style={MARK_ROW}>
        <StatPill value={mark} tone={markTone} label={mark} />
      </View>
      {band}
    </View>
  );
}

const PINNED: ViewStyle = {position: 'absolute', left: 0, right: 0, bottom: 0};

const BAND: ViewStyle = {
  width: '100%',
  flexDirection: 'row',
  alignItems: 'center',
  gap: space['3'],
  paddingTop: space['4'],
  paddingBottom: space['5'],
  paddingHorizontal: space['5'],
};

const COLUMN: ViewStyle = {minWidth: 0, gap: 2};

const MARK_STACK: ViewStyle = {gap: space['3']};
const MARK_ROW: ViewStyle = {paddingHorizontal: space['5']};

const HEAD: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize.md,
  lineHeight: fontSize.md * leading.tight,
};

const ROMAN: TextStyle = {
  fontFamily: fontFamily.bodyMediumItalic,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * leading.latin,
};

const REASON: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * leading.latin,
};
