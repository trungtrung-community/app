/**
 * @fileoverview IconButton — a square control carrying only a glyph.
 *
 * Because the icon is the sole carrier of meaning, `label` is required rather than
 * optional. A bare glyph with no accessible name is a control a screen reader cannot
 * describe, and the leave affordance (`x`) is one of these.
 *
 * Every size meets `--touch-min`: 40 is the smallest box and it sits inside a 48pt hit
 * area via hitSlop rather than by growing the visual control.
 *
 * Ported from the bundle: `IconButton` ships no `.jsx` in the export.
 */

import {Pressable, type StyleProp, type ViewStyle} from 'react-native';

import {layout} from '../../theme/tokens.generated';
import {Icon, type IconName} from './icon';
import {pressScale} from './press';

const VARIANTS = {
  plain: 'bg-transparent',
  soft: 'bg-surface-accent-soft',
  card: 'bg-surface-card',
  accent: 'bg-teal-600',
} as const;

const SIZES = {
  sm: {box: 'h-10 w-10', icon: 20, pixels: 40},
  md: {box: 'h-12 w-12', icon: 24, pixels: 48},
  lg: {box: 'h-14 w-14', icon: 28, pixels: 56},
} as const;

export type IconButtonVariant = keyof typeof VARIANTS;
export type IconButtonSize = keyof typeof SIZES;

export type IconButtonProps = {
  icon: IconName;
  /** Required: the glyph is the only thing naming this control. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** False gives the control's square corners for a grid cell. */
  round?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A glyph-only control.
 *
 * @example <IconButton icon="x" label="Leave the lesson" />
 */
export function IconButton({
  icon,
  label,
  variant = 'plain',
  size = 'md',
  round = true,
  disabled = false,
  onPress,
  style,
  testID,
}: IconButtonProps) {
  const {box, icon: iconSize, pixels} = SIZES[size];
  // Grow the hit area rather than the control when the box is under the minimum.
  const slop = Math.max(0, (layout.touchMin - pixels) / 2);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      hitSlop={slop}
      testID={testID}
      className={[
        'items-center justify-center',
        box,
        round ? 'rounded-pill' : 'rounded-control',
        disabled ? 'bg-ground-200' : VARIANTS[variant],
      ].join(' ')}
      style={({pressed}) => [pressed && !disabled ? pressScale : null, style]}
    >
      <Icon name={icon} size={iconSize} />
    </Pressable>
  );
}
