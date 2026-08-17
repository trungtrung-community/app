/**
 * @fileoverview FlashCard — one card, one flip.
 *
 * The front asks the learner to say it before turning; the back names it. **Both faces set
 * Tibetan through `TibetanText`** — the back demotes it to `--text-tib-sm` rather than
 * dropping it, so the script is present every single time the word is. A back face that
 * showed only English would quietly teach that the script is optional.
 *
 * The card fills its parent, which has to have a size: both faces are absolutely positioned
 * so they occupy the same space, and neither can give the card a height.
 *
 * **One flip, no spring.** The rotation is a single eased turn, and each face swaps at the
 * halfway point rather than relying on `backfaceVisibility` — which RN supports unevenly on
 * Android, and which would show a mirrored face if it failed. Under the system's
 * reduce-motion setting `ReduceMotion.System` collapses the turn to a cut, so the faces
 * exchange with no rotation drawn at all.
 */

import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import {duration, easing} from '../core/motion';
import {
  color,
  fontFamily,
  fontSize,
  leading,
  radius,
  space,
  tracking,
} from '../../theme/tokens.generated';
import {AudioButton} from './audio-button';
import {TibetanText} from './tibetan-text';

/** How far the eye sits from the card. Larger is a flatter, calmer turn. */
const PERSPECTIVE = 1200;

const HALF_TURN = 180;

/** The back face is demoted to this, never dropped. */
const BACK_SCRIPT_OPACITY = 0.85;

/** `--tracking-display` in points at the English answer's size. */
const DISPLAY_TRACKING = parseFloat(tracking.display) * fontSize['3xl'];

export type FlashCardProps = {
  face?: 'front' | 'back';
  bo?: string;
  /** The Trungtrung romanization. */
  roman?: string;
  en?: string;
  /** A fuller definition, under the English. */
  def?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A flashcard, controlled by its `face`.
 *
 * @example
 * <View style={{width: 330, height: 340}}>
 *   <FlashCard face={face} bo="སྤོས་" roman="pö" en="incense" />
 * </View>
 */
export function FlashCard({face = 'front', bo, roman, en, def, style, testID}: FlashCardProps) {
  const front = face === 'front';
  const progress = useDerivedValue(() =>
    withTiming(front ? 0 : 1, {
      duration: duration.base,
      easing: easing.out,
      reduceMotion: ReduceMotion.System,
    }),
  );

  const turn = useAnimatedStyle(() => ({
    transform: [{perspective: PERSPECTIVE}, {rotateY: `${progress.value * HALF_TURN}deg`}],
  }));

  // Each face is opaque for its own half of the turn. No cross-fade: two half-transparent
  // faces overlapping would read as a ghost rather than as a card turning.
  const frontFace = useAnimatedStyle(() => ({opacity: progress.value < 0.5 ? 1 : 0}));
  const backFace = useAnimatedStyle(() => ({opacity: progress.value < 0.5 ? 0 : 1}));

  return (
    <View style={[CARD_BOX, style]} testID={testID}>
      <Animated.View style={[FILL, turn]}>
        <Animated.View style={[FACE, frontFace]}>
          {bo ? (
            <TibetanText unit="word" roman={roman} size="xl" align="center">
              {bo}
            </TibetanText>
          ) : null}
          <View style={CONTROLS}>
            <AudioButton size="lg" />
            <AudioButton size="sm" speed="slow" />
          </View>
        </Animated.View>
        <Animated.View style={[FACE, FLIPPED, backFace]}>
          {bo ? (
            <TibetanText unit="word" roman={roman} size="sm" align="center" style={DEMOTED}>
              {bo}
            </TibetanText>
          ) : null}
          <Text style={ANSWER}>{en}</Text>
          {def ? <Text style={DEFINITION}>{def}</Text> : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const CARD_BOX: ViewStyle = {width: '100%', height: '100%'};

const FILL: ViewStyle = {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0};

const FACE: ViewStyle = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  alignItems: 'center',
  justifyContent: 'center',
  gap: space['5'],
  paddingVertical: space['7'],
  paddingHorizontal: space['6'],
  borderRadius: radius.lg,
  backgroundColor: color.surfaceCard,
};

/** Counter-rotated, so it reads the right way round once the card has turned. */
const FLIPPED: ViewStyle = {transform: [{rotateY: `${HALF_TURN}deg`}]};

const DEMOTED: ViewStyle = {opacity: BACK_SCRIPT_OPACITY};

const CONTROLS: ViewStyle = {flexDirection: 'row', alignItems: 'center', gap: space['4']};

const ANSWER: TextStyle = {
  fontFamily: fontFamily.displayExtrabold,
  fontSize: fontSize['3xl'],
  lineHeight: fontSize['3xl'] * leading.display,
  letterSpacing: DISPLAY_TRACKING,
  color: color.textHeading,
  textAlign: 'center',
};

const DEFINITION: TextStyle = {
  fontFamily: fontFamily.bodyRegular,
  fontSize: fontSize.md,
  lineHeight: fontSize.md * leading.latin,
  color: color.textMuted,
  textAlign: 'center',
};
