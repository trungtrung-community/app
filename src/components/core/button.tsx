/**
 * @fileoverview Button — the keycap control.
 *
 * The signature of the system: a solid offset edge underneath, not a blur, which sinks
 * by 2pt when pressed while the edge shrinks to match. The Phase 0 spike confirmed
 * React Native's `boxShadow` draws it correctly, so it takes one View rather than two
 * stacked.
 *
 * `docs/04` allows **two skins only** — teal primary and ghost — and the design system
 * ships six variants. The other four exist for specific drawn screens: `ink` for dark
 * chrome, `danger` for a destructive door, `soft` and `secondary` inside cards. They
 * are not a licence to invent a seventh.
 *
 * Ported from the bundle: `Button` ships no `.jsx` in the export.
 */

import {Pressable, Text, type StyleProp, type ViewStyle} from 'react-native';

import {color} from '../../theme/tokens.generated';
import {Icon, type IconName} from './icon';
import {EDGE_DEPTH, EDGE_DEPTH_PRESSED, pressScale} from './press';

/**
 * Fill, label colour and edge per variant.
 *
 * `edge` is null for the flat variants: they scale on press instead of sinking,
 * because there is no edge for them to sink onto.
 *
 * The edge colour is a literal rather than a class because `boxShadow` is a single
 * string carrying geometry and colour together. It comes from the same tokens the
 * `shadow-edge-*` utilities are generated from, so the two cannot disagree.
 */
const VARIANTS = {
  primary: {fill: 'bg-teal-600', label: 'text-fg-on-accent', edge: color.teal800},
  ink: {fill: 'bg-ink-900', label: 'text-fg-on-ink', edge: color.ink950},
  secondary: {fill: 'bg-surface-card', label: 'text-fg-heading', edge: color.ground300},
  danger: {fill: 'bg-crown-600', label: 'text-fg-on-accent', edge: color.crown800},
  soft: {fill: 'bg-surface-accent-soft', label: 'text-fg-accent', edge: null},
  ghost: {fill: 'bg-transparent', label: 'text-fg-accent', edge: null},
} as const;

const SIZES = {
  sm: {box: 'h-10 px-4 gap-1h', text: 'type-caption', icon: 16},
  md: {box: 'h-12 px-5 gap-2', text: 'type-body-strong', icon: 20},
  lg: {box: 'h-14 px-7 gap-2h', text: 'type-body-strong', icon: 24},
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export type ButtonProps = {
  children: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
  /**
   * A disabled button must say why somewhere on screen.
   *
   * The rule `docs/04` states for ModeCard applies here too: a dead control with no
   * reason beside it reads as broken rather than as unavailable.
   */
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The keycap button.
 *
 * @example <Button variant="primary" size="lg" fullWidth>Keep going</Button>
 * @example <Button variant="ghost" iconLeft="rotate-ccw">Listen again</Button>
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  disabled = false,
  onPress,
  style,
  testID,
}: ButtonProps) {
  const {fill, label, edge} = VARIANTS[variant];
  const {box, text, icon} = SIZES[size];
  const hasEdge = edge !== null && !disabled;
  const sink = EDGE_DEPTH - EDGE_DEPTH_PRESSED;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      className={[
        'flex-row items-center justify-center rounded-pill',
        box,
        fullWidth ? 'w-full' : 'self-start',
        disabled ? 'bg-ground-200' : fill,
      ].join(' ')}
      style={({pressed}) => [
        // The footprint stays constant: the control travels down by exactly what the
        // edge loses, so nothing below it shifts.
        hasEdge && {
          boxShadow: `0 ${pressed ? EDGE_DEPTH_PRESSED : EDGE_DEPTH}px 0 0 ${edge}`,
          transform: [{translateY: pressed ? sink : 0}],
          marginBottom: pressed ? sink : 0,
        },
        !hasEdge && pressed ? pressScale : null,
        style,
      ]}
    >
      {iconLeft ? <Icon name={iconLeft} size={icon} /> : null}
      <Text className={[text, disabled ? 'text-fg-subtle' : label].join(' ')} numberOfLines={1}>
        {children}
      </Text>
      {iconRight ? <Icon name={iconRight} size={icon} /> : null}
    </Pressable>
  );
}
