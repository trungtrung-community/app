/**
 * @fileoverview Divider — the one sanctioned line in a fill-based system.
 *
 * It separates rows that already share a single card — a grouped word card, a settings
 * block — where a gap would read as two cards instead of one list.
 *
 * Never to outline a card, and never to split two cards. That is what fill value is
 * for, and `--divider-soft` is deliberately not a border colour.
 *
 * Half width is the default because at half it reads as a hint rather than a rule.
 */

import {View, type StyleProp, type ViewStyle} from 'react-native';

import {elevation} from '../../theme/tokens.generated';

const WIDTHS = {
  half: 'w-1/2',
  third: 'w-1/3',
  full: 'w-full',
} as const;

export type DividerWidth = keyof typeof WIDTHS;

export type DividerProps = {
  width?: DividerWidth;
  /** `start` for a rule that hangs off the text edge rather than centring. */
  align?: 'center' | 'start';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A hairline inside a card.
 *
 * @example <Divider />
 * @example <Divider width="full" align="start" />
 */
export function Divider({width = 'half', align = 'center', style, testID}: DividerProps) {
  return (
    <View
      accessibilityRole="none"
      className={[
        WIDTHS[width],
        'bg-divider-soft',
        align === 'start' ? 'self-start' : 'self-center',
      ].join(' ')}
      // A hairline is a length, not a spacing step, so it comes from the token rather
      // than a utility class.
      style={[{height: elevation.dividerHairline}, style]}
      testID={testID}
    />
  );
}
