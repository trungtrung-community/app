/**
 * @fileoverview Toast — a transient confirmation.
 *
 * Pinned above the tab bar, ink-filled by default so it reads over any surface. It is the
 * one floating thing that is allowed a shadow, along with Sheet and Dialog.
 *
 * Never for an error that needs a decision — that is a `Dialog`. A Toast goes away on its
 * own, so anything the learner must answer cannot live in one.
 *
 * Ported from the bundle: `Toast` ships no `.jsx` in the export.
 */

import {Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';

import {Icon, type IconName} from '../core/icon';
import {duration} from '../core/motion';
import {color, elevation, fontFamily, fontSize, radius, space} from '../../theme/tokens.generated';

/**
 * Fill, text colour and default icon per tone.
 *
 * The icon is part of the tone rather than a separate decision: a correct toast carries a
 * check, a reward carries a star. Passing `icon` overrides it for the rare case that
 * needs to.
 */
const TONES = {
  neutral: {fill: color.ink900, text: color.textOnInk, icon: 'info'},
  correct: {fill: color.grass600, text: color.textOnAccent, icon: 'check'},
  reward: {fill: color.beak600, text: color.ink900, icon: 'star'},
  alert: {fill: color.crown600, text: color.textOnAccent, icon: 'alert-circle'},
} as const satisfies Record<string, {fill: string; text: string; icon: IconName}>;

export type ToastTone = keyof typeof TONES;

export type ToastProps = {
  children: string;
  tone?: ToastTone;
  /** Overrides the tone's own icon. */
  icon?: IconName;
  /** One word, underlined. Undo, Retry. */
  action?: string;
  onAction?: () => void;
  visible?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A short confirmation that leaves on its own.
 *
 * @example <Toast tone="correct">Stop complete</Toast>
 * @example <Toast tone="reward" action="See it" onAction={open}>New card earned</Toast>
 */
export function Toast({
  children,
  tone = 'neutral',
  icon,
  action,
  onAction,
  visible = true,
  style,
  testID,
}: ToastProps) {
  if (!visible) {
    return null;
  }
  const {fill, text, icon: toneIcon} = TONES[tone];

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      // Rises the way the board's keyframes do: up from below, settling once.
      entering={FadeInDown.duration(duration.base)}
      style={[BOX, {backgroundColor: fill}, style]}
      testID={testID}
    >
      <Icon name={icon ?? toneIcon} size={20} color={text} />
      <View className="flex-1" style={MIN_WIDTH}>
        <Text style={[LABEL, {color: text}]}>{children}</Text>
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={8}
          style={ACTION_HIT}
          // Inherits the tone's own text colour rather than taking the accent: a toast is
          // a coloured surface, and teal on grass or on crown would be unreadable.
        >
          <Text style={[ACTION, {color: text}]}>{action}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const BOX: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: space['2h'],
  paddingVertical: space['3'],
  paddingLeft: space['4'],
  paddingRight: space['3h'],
  borderRadius: radius.lg,
  boxShadow: elevation.shadowFloat,
};

const MIN_WIDTH: ViewStyle = {minWidth: 0};

const LABEL: TextStyle = {
  fontFamily: fontFamily.bodySemibold,
  fontSize: fontSize.md,
};

const ACTION_HIT: ViewStyle = {paddingHorizontal: space['1'], paddingVertical: space['1h']};

const ACTION: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize.sm,
  textDecorationLine: 'underline',
};
