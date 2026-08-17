/**
 * @fileoverview Tag — a selectable, sentence-case chip.
 *
 * The difference from `Badge` is agency: a Badge states something read-only, a Tag can
 * be chosen or dismissed. Topics, filters, word banks.
 *
 * Sentence case, not caps — that is what separates it visually from a Badge, whose
 * label is uppercase.
 *
 * Ported from the bundle: `Tag` ships no `.jsx` in the export.
 */

import {Pressable, Text, View, type StyleProp, type ViewStyle} from 'react-native';

import {Icon} from './icon';
import {pressScale} from './press';

const SIZES = {
  sm: {box: 'px-3 py-1h', text: 'type-caption'},
  md: {box: 'px-4 py-2h', text: 'type-body-strong'},
} as const;

export type TagSize = keyof typeof SIZES;

export type TagProps = {
  children: string;
  selected?: boolean;
  size?: TagSize;
  onPress?: () => void;
  /** Adds the dismiss affordance, as a sibling control rather than a nested one. */
  onRemove?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A chip the learner can pick.
 *
 * When both `onPress` and `onRemove` are given, the two controls sit side by side
 * inside a plain container rather than one inside the other. Nesting them would put a
 * button inside a button — invalid on web, and ambiguous everywhere: a tap near the x
 * could plausibly mean either action.
 *
 * @example <Tag selected onPress={toggle}>Teahouse</Tag>
 * @example <Tag onPress={toggle} onRemove={drop}>Verbs</Tag>
 */
export function Tag({
  children,
  selected = false,
  size = 'md',
  onPress,
  onRemove,
  style,
  testID,
}: TagProps) {
  const {box, text} = SIZES[size];
  const fill = selected ? 'bg-teal-600' : 'bg-ground-200';
  const labelClass = [text, selected ? 'text-fg-on-accent' : 'text-fg-body'].join(' ');
  const shell = `flex-row items-center gap-1h self-start rounded-pill ${fill}`;

  const label = <Text className={labelClass}>{children}</Text>;

  const dismiss = onRemove ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Remove ${children}`}
      onPress={onRemove}
      hitSlop={8}
      className="pr-3"
      style={({pressed}) => (pressed ? DIMMED : DISMISS_OPACITY)}
    >
      <Icon name="x" size={16} />
    </Pressable>
  ) : null;

  // Selectable and dismissible: two sibling controls in a non-interactive shell.
  if (onPress && onRemove) {
    return (
      <View className={shell} style={style} testID={testID}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{selected}}
          onPress={onPress}
          className={box}
          style={({pressed}) => (pressed ? pressScale : null)}
        >
          {label}
        </Pressable>
        {dismiss}
      </View>
    );
  }

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{selected}}
        onPress={onPress}
        className={`${shell} ${box}`}
        style={({pressed}) => [pressed && pressScale, style]}
        testID={testID}
      >
        {label}
      </Pressable>
    );
  }

  return (
    <View className={`${shell} ${onRemove ? '' : box}`} style={style} testID={testID}>
      {onRemove ? <View className={box}>{label}</View> : label}
      {dismiss}
    </View>
  );
}

const DISMISS_OPACITY: ViewStyle = {opacity: 0.7};
const DIMMED: ViewStyle = {opacity: 0.4};
