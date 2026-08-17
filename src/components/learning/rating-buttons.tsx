/**
 * @fileoverview RatingButtons — the flashcard's self-assessment.
 *
 * **Two buttons, never four.** Self-grading on a four-point scale is a study-app convention
 * that asks a beginner to judge something they cannot yet judge — the difference between
 * "hard" and "good" is a judgement about your own recall, which is the very thing a
 * beginner has no calibration for. Again or got it; the scheduler infers the rest.
 *
 * The prompt says what each button does in the product's own words, because "Again" and
 * "Got it" are only obvious once you already know the system. Pass `prompt=""` on a screen
 * that has already said it.
 */

import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {Button} from '../core/button';
import {color, fontFamily, fontSize, leading, space} from '../../theme/tokens.generated';

/** The height the drawn frames give these, which is `lg` plus its keycap edge. */
const BUTTON_ROW_HEIGHT = 56;

export type RatingButtonsProps = {
  /** What each button does. Empty on a screen that has already explained it. */
  prompt?: string;
  againLabel?: string;
  gotItLabel?: string;
  onAgain?: () => void;
  onGotIt?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Again, or got it.
 *
 * @example <RatingButtons onAgain={requeue} onGotIt={advance} />
 * @example <RatingButtons prompt="Could you say it before you turned it over?" />
 */
export function RatingButtons({
  prompt = 'Again brings it back later in this session. Got it moves on.',
  againLabel = 'Again',
  gotItLabel = 'Got it',
  onAgain,
  onGotIt,
  style,
  testID,
}: RatingButtonsProps) {
  return (
    <View style={[COLUMN, style]} testID={testID}>
      {prompt ? <Text style={PROMPT}>{prompt}</Text> : null}
      <View style={ROW}>
        <View style={HALF}>
          <Button variant="secondary" size="lg" fullWidth onPress={onAgain}>
            {againLabel}
          </Button>
        </View>
        <View style={HALF}>
          <Button size="lg" fullWidth onPress={onGotIt}>
            {gotItLabel}
          </Button>
        </View>
      </View>
    </View>
  );
}

const COLUMN: ViewStyle = {width: '100%', alignItems: 'center', gap: space['2h']};

const ROW: ViewStyle = {flexDirection: 'row', width: '100%', gap: space['2h']};

/** Equal halves, so neither answer is the one the layout recommends. */
const HALF: ViewStyle = {flex: 1, minHeight: BUTTON_ROW_HEIGHT};

const PROMPT: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.md,
  lineHeight: fontSize.md * leading.latin,
  color: color.textMuted,
  textAlign: 'center',
};
