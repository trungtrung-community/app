/**
 * @fileoverview AnswerChoice — a full-width exercise answer row.
 *
 * **Never a `Radio`.** An answer takes a correct/wrong state and a shortcut number, neither
 * of which a radio can express — and a radio promises that pressing it again deselects,
 * which is wrong once an answer has been judged.
 *
 * Ported from the bundle: `AnswerChoice` ships no `.jsx` in the export.
 */

import {Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {Icon, type IconName} from '../core/icon';
import {keycap} from '../core/press';
import {withAlpha} from '../core/tint';
import {color, fontFamily, fontSize, leading, radius, space} from '../../theme/tokens.generated';
import {TibetanText} from './tibetan-text';

/**
 * Fill, ink, edge and result mark per state.
 *
 * `selected` is soft accent with no mark: the learner has chosen but nothing has been
 * judged, and a tick before checking would answer the question for them.
 */
const STATES = {
  idle: {fill: color.surfaceCard, ink: color.textHeading, edge: color.ground300, mark: null},
  selected: {
    fill: color.surfaceAccentSoft,
    ink: color.textAccent,
    edge: color.teal600,
    mark: null,
  },
  correct: {
    fill: color.surfaceCorrect,
    ink: color.grass600,
    edge: color.grass600,
    mark: 'check',
  },
  wrong: {fill: color.surfaceAlert, ink: color.crown600, edge: color.crown600, mark: 'x'},
  disabled: {fill: color.ground200, ink: color.textSubtle, edge: null, mark: null},
} as const satisfies Record<
  string,
  {fill: string; ink: string; edge: string | null; mark: IconName | null}
>;

export type AnswerChoiceState = keyof typeof STATES;

const MIN_HEIGHT = 64;
const INDEX_BOX = 28;

/** The index badge's fill: the row's own ink at 14%, which is what `color-mix` said. */
const INDEX_TINT = 0.14;

export type AnswerChoiceProps = {
  /** The Latin answer. Either this or `tibetan`, or both. */
  children?: string;
  /** The Tibetan answer, routed through TibetanText. */
  tibetan?: string;
  /** The Trungtrung romanization. Becomes the row's accessible name when Tibetan is set. */
  roman?: string;
  /** The spelling line. Off unless the learner turned it on. */
  wylie?: string;
  state?: AnswerChoiceState;
  /** The shortcut number. A badge, not a list marker. */
  index?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * One answer in an exercise.
 *
 * @example <AnswerChoice index={1} tibetan="བཀྲ་ཤིས" roman="trashi" onPress={pick} />
 * @example <AnswerChoice state="correct" roman="thuk">mind</AnswerChoice>
 */
export function AnswerChoice({
  children,
  tibetan,
  roman,
  wylie,
  state = 'idle',
  index,
  onPress,
  style,
  testID,
}: AnswerChoiceProps) {
  const {fill, ink, edge, mark} = STATES[state];
  const disabled = state === 'disabled';

  return (
    <Pressable
      accessibilityRole="button"
      // The romanization names a Tibetan answer; otherwise the Latin text does.
      accessibilityLabel={roman ?? children}
      aria-selected={state === 'selected'}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({pressed}) => [
        ROW,
        {backgroundColor: fill},
        keycap(edge, pressed && !disabled && Boolean(onPress)),
        style,
      ]}
      testID={testID}
    >
      {index != null ? (
        <View aria-hidden style={[INDEX, {backgroundColor: withAlpha(ink, INDEX_TINT)}]}>
          <Text style={[INDEX_TEXT, {color: ink}]}>{index}</Text>
        </View>
      ) : null}
      <View className="flex-1" style={MIN_WIDTH}>
        {tibetan ? (
          <TibetanText inline unit="word" size="md" textStyle={{color: ink}}>
            {tibetan}
          </TibetanText>
        ) : null}
        {children ? <Text style={[LATIN, {color: ink}]}>{children}</Text> : null}
        {roman ? (
          // Hidden: it is already the row's accessible name, so reading it twice is noise.
          <Text aria-hidden style={[ROMAN, {color: ink}]}>
            {roman}
          </Text>
        ) : null}
        {wylie ? <Text style={[WYLIE, {color: ink}]}>{wylie}</Text> : null}
      </View>
      {mark ? <Icon name={mark} size={24} color={ink} /> : null}
    </Pressable>
  );
}

const ROW: ViewStyle = {
  width: '100%',
  minHeight: MIN_HEIGHT,
  flexDirection: 'row',
  alignItems: 'center',
  gap: space['3h'],
  paddingVertical: space['3'],
  paddingHorizontal: space['4'],
  borderRadius: radius.card,
};

const MIN_WIDTH: ViewStyle = {minWidth: 0};

const INDEX: ViewStyle = {
  flexShrink: 0,
  width: INDEX_BOX,
  height: INDEX_BOX,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radius.xs,
};

const INDEX_TEXT: TextStyle = {fontFamily: fontFamily.bodyBold, fontSize: fontSize.sm};

const LATIN: TextStyle = {
  fontFamily: fontFamily.bodySemibold,
  fontSize: fontSize.md,
  lineHeight: fontSize.md * leading.latin,
};

const ROMAN: TextStyle = {
  fontFamily: fontFamily.bodyMediumItalic,
  fontSize: fontSize.sm,
  opacity: 0.7,
};

const WYLIE: TextStyle = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  opacity: 0.6,
};
