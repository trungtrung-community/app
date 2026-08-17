/**
 * @fileoverview Card — a filled surface. Borderless by design.
 *
 * The system separates surfaces by fill VALUE, never by a hairline or a drop shadow,
 * so this component has no border prop and `floating` exists only for layered UI —
 * sheets and dialogs — rather than as a way to lift a card off the page.
 *
 * Ported from the bundle: `Card` ships no `.jsx` in the export.
 *
 * Variants are complete className strings in a lookup rather than composed at runtime.
 * Tailwind scans at build time, so `bg-${tone}` would produce nothing; a mapping of
 * literals is the form that works and it keeps the tone table readable next to the
 * design system's own.
 */

import type {ReactNode} from 'react';
import {Pressable, View, type StyleProp, type ViewStyle} from 'react-native';

import {pressScale} from './press';

/** Fill and text colour per tone. The value of the fill is what separates surfaces. */
const TONES = {
  card: 'bg-surface-card',
  ground: 'bg-surface-sunken',
  accent: 'bg-surface-accent-soft',
  reward: 'bg-surface-reward',
  alert: 'bg-surface-alert',
  correct: 'bg-surface-correct',
  ink: 'bg-surface-ink',
  teal: 'bg-teal-600',
} as const;

const PADS = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
} as const;

export type CardTone = keyof typeof TONES;
export type CardPadding = keyof typeof PADS;

export type CardProps = {
  children?: ReactNode;
  tone?: CardTone;
  padding?: CardPadding;
  /** Only for layered UI. A card in a list never floats. */
  floating?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A filled surface.
 *
 * @example <Card tone="correct" padding="lg">…</Card>
 */
export function Card({
  children,
  tone = 'card',
  padding = 'md',
  floating = false,
  onPress,
  style,
  testID,
}: CardProps) {
  const base = `rounded-card ${TONES[tone]} ${PADS[padding]} ${floating ? 'shadow-float' : ''}`;

  if (!onPress) {
    return (
      <View className={base} style={style} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={base}
      style={({pressed}) => [pressed && pressScale, style]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}
