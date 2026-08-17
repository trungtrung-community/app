/**
 * @fileoverview ListRow — the label-and-chevron row.
 *
 * The board hand-drew this thirty-two times before it was promoted. A reused pattern is
 * a component or it does not exist.
 *
 * `sub` is one sentence, never two — the same prose contract `docs/04` states for rule
 * headlines. `value` is state the row already knows and can show without being opened:
 * 19:00, Off, never.
 */

import {Pressable, Text, View, type StyleProp, type ViewStyle} from 'react-native';

import {color, layout} from '../../theme/tokens.generated';
import {Icon, type IconName} from './icon';
import {pressScale} from './press';

export type ListRowProps = {
  label: string;
  /** One sentence. Never two. */
  sub?: string;
  /** Right-aligned state the row already knows. */
  value?: string;
  icon?: IconName;
  chevron?: boolean;
  /** `danger` puts the label in crown red for a destructive door. */
  tone?: 'default' | 'danger';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A row in a grouped card.
 *
 * @example <ListRow label="Reminders" value="19:00" onPress={open} />
 * @example <ListRow label="Erase everything" tone="danger" icon="x" />
 */
export function ListRow({
  label,
  sub,
  value,
  icon,
  chevron = true,
  tone = 'default',
  onPress,
  style,
  testID,
}: ListRowProps) {
  const danger = tone === 'danger';

  const body = (
    <>
      {icon ? <Icon name={icon} size={24} color={danger ? DANGER : ACCENT} /> : null}
      <View className="flex-1 gap-[2px]">
        <Text className={`type-body-strong ${danger ? 'text-crown-600' : 'text-fg-heading'}`}>
          {label}
        </Text>
        {sub ? <Text className="type-caption text-fg-muted">{sub}</Text> : null}
      </View>
      {value ? <Text className="type-body-strong text-fg-accent">{value}</Text> : null}
      {chevron ? (
        // The design system has no chevron-right; it rotates the down one, which is why
        // the icon set stays at 34 rather than 35.
        <View style={CHEVRON_ROTATION}>
          <Icon name="chevron-down" size={20} color={MUTED} />
        </View>
      ) : null}
    </>
  );

  const className = 'w-full flex-row items-center gap-3h rounded-lg bg-surface-card p-4';

  if (!onPress) {
    return (
      <View className={className} style={[MIN_HEIGHT, style]} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={className}
      style={({pressed}) => [MIN_HEIGHT, pressed && pressScale, style]}
      testID={testID}
    >
      {body}
    </Pressable>
  );
}

const ACCENT = color.textAccent;
const DANGER = color.crown600;
const MUTED = color.ink400;
const MIN_HEIGHT: ViewStyle = {minHeight: layout.touchMin};
const CHEVRON_ROTATION: ViewStyle = {transform: [{rotate: '-90deg'}]};
