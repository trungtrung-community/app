/**
 * @fileoverview MascotSpeech — the sanctioned way to put the crane on screen.
 *
 * The crane plus one short line, in a filled borderless bubble with a single pointed
 * corner. That corner is the only thing standing in for a speech tail — no arrow, no
 * triangle, in keeping with a system that has no borders to hang one off.
 *
 * **One per screen.** The crane speaking twice is the crane nagging.
 *
 * Ported from the bundle: `MascotSpeech` ships no `.jsx` in the export.
 */

import type {ReactNode} from 'react';
import {
  Image,
  Text,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';

import {duration, easing} from '../core/motion';
import {color, radius, space} from '../../theme/tokens.generated';

const DEFAULT_SIZE = 132;

export type MascotSpeechProps = {
  children: ReactNode;
  /**
   * The crane.
   *
   * No mascot art exists in this repo yet — the design system points at
   * `assets/mascot-crane.png` and `assets/mascot-crane-head.png`, neither of which has been
   * drawn. Without a source this renders the bubble alone, which is the honest state: the
   * component is ready and the art is not.
   */
  mascot?: ImageSourcePropType;
  /** `head` crops to a circle on soft teal; `full` is the whole bird on nothing. */
  pose?: 'full' | 'head';
  size?: number;
  /** Which side the crane stands on. The pointed corner follows it. */
  side?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The crane, saying one thing.
 *
 * @example <MascotSpeech pose="head" size={72}>Two more and the district opens.</MascotSpeech>
 */
export function MascotSpeech({
  children,
  mascot,
  pose = 'full',
  size = DEFAULT_SIZE,
  side = 'left',
  style,
  testID,
}: MascotSpeechProps) {
  const isLeft = side === 'left';

  return (
    <View
      className={`w-full items-end gap-3 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
      style={style}
      testID={testID}
    >
      {mascot ? (
        <Image
          source={mascot}
          accessibilityIgnoresInvertColors
          alt="The crane"
          style={[
            {width: size, height: size},
            pose === 'head' ? HEAD : null,
            {resizeMode: 'contain'},
          ]}
        />
      ) : null}
      <Animated.View
        entering={FadeInDown.duration(duration.base).easing(easing.settle.factory())}
        className="flex-1 bg-surface-card"
        style={[
          BUBBLE,
          // The one square-ish corner, on the side the crane is standing.
          isLeft ? POINTED_LEFT : POINTED_RIGHT,
        ]}
      >
        {typeof children === 'string' ? (
          <Text className="type-body text-fg-body">{children}</Text>
        ) : (
          children
        )}
      </Animated.View>
    </View>
  );
}

const HEAD: ImageStyle = {
  borderRadius: radius.pill,
  backgroundColor: color.teal100,
};

const BUBBLE: ViewStyle = {
  minWidth: 0,
  paddingVertical: space['4'],
  paddingHorizontal: space['4'],
  borderRadius: radius.lg,
};

const POINTED_LEFT: ViewStyle = {borderBottomLeftRadius: radius.xs};
const POINTED_RIGHT: ViewStyle = {borderBottomRightRadius: radius.xs};
