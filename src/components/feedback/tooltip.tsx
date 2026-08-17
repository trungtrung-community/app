/**
 * @fileoverview Tooltip — a short hint beside the thing it describes.
 *
 * Ink fill, no arrow, no blur. It never carries information needed to complete a task —
 * that belongs in an `Input` hint or a `ListRow` description, both of which stay on screen.
 *
 * **Controlled only.** The web original shows itself on hover and treats `open` as an
 * override. There is no hover on a touch screen, so that half does not survive the
 * crossing — and the design system's own note already points this way: the gloss is a tap,
 * not a hover, so the surface that owns the tap owns the tooltip. Without `open` this
 * renders its child and nothing else, which is the correct behaviour rather than a
 * degraded one.
 */

import type {ReactNode} from 'react';
import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';

import {duration} from '../core/motion';
import {mixedTibetan} from '../learning/tibetan-text';
import {color, fontFamily, fontSize, leading, radius, space} from '../../theme/tokens.generated';

const GAP = space['2'];

/**
 * Where the bubble sits, as percentages of the trigger rather than a `calc()`.
 *
 * `bottom: '100%'` puts the bubble's bottom edge on the trigger's top edge, and the margin
 * opens the gap — which is what the original's `calc(100% + 8px)` says, in the two pieces
 * React Native has.
 */
const SIDES = {
  top: {bottom: '100%', left: '50%', marginBottom: GAP, transform: [{translateX: '-50%'}]},
  bottom: {top: '100%', left: '50%', marginTop: GAP, transform: [{translateX: '-50%'}]},
  left: {right: '100%', top: '50%', marginRight: GAP, transform: [{translateY: '-50%'}]},
  right: {left: '100%', top: '50%', marginLeft: GAP, transform: [{translateY: '-50%'}]},
} as const satisfies Record<string, ViewStyle>;

export type TooltipSide = keyof typeof SIDES;

export type TooltipProps = {
  /** One short line. Routed through mixedTibetan, so a Tibetan word in it sets properly. */
  label: string;
  children: ReactNode;
  side?: TooltipSide;
  /** Whether the bubble is showing. Without it, nothing shows — see the note above. */
  open?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A hint bubble.
 *
 * @example
 * <Tooltip label="Natural speed" open={showing} side="top">
 *   <IconButton icon="volume-2" label="Play" onPress={play} />
 * </Tooltip>
 */
export function Tooltip({
  label,
  children,
  side = 'top',
  open = false,
  style,
  testID,
}: TooltipProps) {
  return (
    <View style={[TRIGGER, style]} testID={testID}>
      {children}
      {open ? (
        <Animated.View
          accessibilityRole="alert"
          entering={FadeIn.duration(duration.fast)}
          style={[BUBBLE, SIDES[side]]}
        >
          <Text style={LABEL} numberOfLines={1}>
            {mixedTibetan(label)}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** `inline-flex` has no equivalent; a self-start row is the same thing that matters. */
const TRIGGER: ViewStyle = {position: 'relative', alignSelf: 'flex-start'};

const BUBBLE: ViewStyle = {
  position: 'absolute',
  zIndex: 30,
  // Never intercepts a touch: the bubble floats over whatever is beside the trigger, and
  // swallowing taps there would break the control it describes. In `style` rather than as a
  // prop — the prop form is deprecated and warns on every render.
  pointerEvents: 'none',
  paddingVertical: space['1h'],
  paddingHorizontal: space['3'],
  borderRadius: radius.sm,
  backgroundColor: color.ink900,
};

const LABEL: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * leading.latin,
  color: color.textOnInk,
};
