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
 *
 * **It measures itself.** The bubble is centred on its trigger, so on a trigger near a
 * gutter half of it used to hang off the screen — reported from a device on 2026-08-18.
 * React Native has no `position: fixed` and no way for an absolutely-positioned child to
 * escape its ancestors, so there is no styling answer: the trigger's real position is
 * measured and the bubble is nudged back. The arithmetic is in `./tooltip-position`, where
 * it can be tested without a screen.
 */

import {useCallback, useRef, useState, type ReactNode} from 'react';
import {
  Dimensions,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';

import {duration} from '../core/motion';
import {mixedTibetan} from '../learning/tibetan-text';
import {horizontalShift, resolveSide, type Placement} from './tooltip-position';
import {color, fontFamily, fontSize, leading, radius, space} from '../../theme/tokens.generated';

const GAP = space['2'];

/** Wide enough for a short hint on two lines, narrow enough to fit any phone. */
const MAX_WIDTH = 240;

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
  const trigger = useRef<View>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  // Measured when the bubble lays out rather than when the trigger does: the bubble's own
  // size is half the arithmetic, and it does not exist until `open`. `measureInWindow` is
  // asynchronous, so the first frame draws centred and the correction lands on the next —
  // invisible inside a 140ms fade, and the alternative is measuring on every render of
  // every trigger in the app for a bubble that is almost never shown.
  const measure = useCallback((event: LayoutChangeEvent) => {
    const {width: bubbleWidth, height: bubbleHeight} = event.nativeEvent.layout;
    trigger.current?.measureInWindow((triggerX, triggerY, triggerWidth, triggerHeight) => {
      const window = Dimensions.get('window');
      const measured: Placement = {
        triggerX,
        triggerY,
        triggerWidth,
        triggerHeight,
        bubbleWidth,
        bubbleHeight,
        windowWidth: window.width,
        windowHeight: window.height,
      };
      // Only when something actually moved. Applying the correction changes the bubble's
      // own position, which fires `onLayout` again — and a fresh object every time would
      // re-render on identical numbers. It settles either way, but this is the difference
      // between two renders and a shape that could loop if a future edit makes the
      // correction depend on the bubble's position rather than the trigger's.
      setPlacement(current => (current && same(current, measured) ? current : measured));
    });
  }, []);

  const shown = placement ? resolveSide(side, placement) : side;
  const nudge =
    placement && (shown === 'top' || shown === 'bottom') ? horizontalShift(placement) : 0;

  return (
    <View ref={trigger} style={[TRIGGER, style]} testID={testID}>
      {children}
      {open ? (
        <Animated.View
          accessibilityRole="alert"
          entering={FadeIn.duration(duration.fast)}
          onLayout={measure}
          style={[BUBBLE, SIDES[shown], nudge === 0 ? null : {marginLeft: nudge}]}
        >
          <Text style={LABEL} numberOfLines={2}>
            {mixedTibetan(label)}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Whether two measurements describe the same geometry. */
function same(a: Placement, b: Placement): boolean {
  return (Object.keys(a) as (keyof Placement)[]).every(key => a[key] === b[key]);
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
  // A cap, not a width. Without it a long label makes one very wide line, which is what
  // pushed the bubble past the screen edge in the first place; with it a long label makes a
  // second line instead, which `numberOfLines={2}` allows.
  maxWidth: MAX_WIDTH,
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
