/**
 * @fileoverview The parts Sheet and Dialog are identical in.
 *
 * Not a design-system component and not in the manifest. Two pieces: the scrim, and the
 * title row with its close button. Both are the same in each, and the title row carries a
 * rule worth having in one place — the title goes through `mixedTibetan`, because a sheet
 * titled with a Tibetan word would otherwise set the script in the heading's Latin type.
 *
 * A flat ink scrim with no blur, per `docs/04`: the system separates by fill value, and a
 * blur is a second visual language.
 */

import {Pressable, Text, View, type ViewStyle} from 'react-native';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';

import {IconButton} from '../core/icon-button';
import {duration} from '../core/motion';
import {mixedTibetan} from '../learning/tibetan-text';
import {color, space} from '../../theme/tokens.generated';

/**
 * The dimmed backdrop. Pressing it closes.
 *
 * `--scrim` is already an rgba value by the time it reaches here: the token is stated as a
 * `color-mix()` and the sync script precomputes it, because React Native has no
 * `color-mix`.
 */
export function Scrim({onPress}: {onPress?: () => void}) {
  return (
    <Animated.View
      entering={FadeIn.duration(duration.base)}
      // The panel leaves with the scrim rather than after it: a scrim that lingers reads
      // as the surface failing to close. Faster than the entrance, per `core/motion`.
      exiting={FadeOut.duration(duration.fast)}
      style={SCRIM}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onPress}
        style={FILL}
      />
    </Animated.View>
  );
}

/**
 * The title row: a heading on the left, a close button on the right.
 *
 * Renders as a row even when there is no title, so a panel with only a close button puts
 * it in the same place as one with both.
 */
export function OverlayTitle({title, onClose}: {title?: string; onClose?: () => void}) {
  if (!title && !onClose) {
    return null;
  }
  return (
    <View className="flex-row items-start justify-between gap-3">
      {title ? (
        <Text
          accessibilityRole="header"
          className="type-heading text-fg-heading flex-1"
          style={MIN_WIDTH}
        >
          {mixedTibetan(title, 'md')}
        </Text>
      ) : (
        <View className="flex-1" />
      )}
      {onClose ? <IconButton icon="x" label="Close" size="sm" onPress={onClose} /> : null}
    </View>
  );
}

const SCRIM: ViewStyle = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  backgroundColor: color.scrim,
};

const FILL: ViewStyle = {flex: 1};

const MIN_WIDTH: ViewStyle = {minWidth: 0};

/** The inset both panels use — Sheet's own padding, and Dialog's outer margin. */
export const PANEL_PADDING = space['5'];
