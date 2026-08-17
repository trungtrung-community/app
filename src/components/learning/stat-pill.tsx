/**
 * @fileoverview StatPill — an app-bar counter.
 *
 * The icon carries the meaning in its own colour; the number stays ink. That split is the
 * point: five pills in a row read as five different things without five different number
 * colours competing for attention.
 *
 * Ported from the bundle: `StatPill` ships no `.jsx` in the export.
 */

import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {Icon, type IconName} from '../core/icon';
import {color, fontFamily, fontSize, radius, space} from '../../theme/tokens.generated';

/**
 * Each meaning's colour and default icon.
 *
 * `streak` and `hearts` share crown red, which is correct — both are things you can lose,
 * and the icon is what separates them.
 */
const TONES = {
  streak: {tint: color.crown600, icon: 'flame'},
  xp: {tint: color.beak600, icon: 'star'},
  hearts: {tint: color.crown600, icon: 'heart'},
  neutral: {tint: color.textMuted, icon: 'circle'},
  accent: {tint: color.textAccent, icon: 'map-pin'},
} as const satisfies Record<string, {tint: string; icon: IconName}>;

export type StatTone = keyof typeof TONES;

export type StatPillProps = {
  value: string;
  tone?: StatTone;
  /** Overrides the tone's own icon. */
  icon?: IconName;
  /**
   * What the number means, for assistive tech.
   *
   * Required in practice: the icon is decoration and the value is a bare numeral, so
   * without this a screen reader announces "7" and nothing else.
   */
  label: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A counter pill.
 *
 * @example <StatPill tone="streak" value="12" label="12 days walking" />
 */
export function StatPill({value, tone = 'neutral', icon, label, style, testID}: StatPillProps) {
  const {tint, icon: toneIcon} = TONES[tone];

  return (
    <View
      accessibilityLabel={label}
      className="flex-row items-center gap-1h self-start rounded-pill bg-surface-card"
      style={[PADDING, style]}
      testID={testID}
    >
      <Icon name={icon ?? toneIcon} size={20} color={tint} />
      <Text style={VALUE}>{value}</Text>
    </View>
  );
}

/** Tighter on the icon side than the number side, so the pair sits optically centred. */
const PADDING: ViewStyle = {
  paddingVertical: space['1h'],
  paddingLeft: space['3'],
  paddingRight: space['3h'],
  borderRadius: radius.pill,
};

const VALUE: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize.md,
  color: color.textHeading,
};
