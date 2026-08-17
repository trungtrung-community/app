/**
 * @fileoverview OfflineBanner — a slim ink banner under the app bar.
 *
 * Offline means something specific in this app. `docs/01` commits to the whole thing
 * working from first launch with no downloads, ever — so losing connectivity takes nothing
 * away. That is why the default copy says what still works rather than that something
 * failed, and why this is a status rather than an error.
 *
 * Ported from the bundle: `OfflineBanner` ships no `.jsx` in the export.
 */

import {Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {Icon} from '../core/icon';
import {color, fontFamily, fontSize, radius, space} from '../../theme/tokens.generated';

const DEFAULT_MESSAGE = "You're offline. Downloaded audio still plays.";

export type OfflineBannerProps = {
  children?: string;
  /** One word. Rarely needed — there is usually nothing to retry. */
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The offline notice.
 *
 * @example <OfflineBanner />
 */
export function OfflineBanner({
  children = DEFAULT_MESSAGE,
  action,
  onAction,
  style,
  testID,
}: OfflineBannerProps) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="w-full flex-row items-center gap-2h rounded-md bg-surface-ink"
      style={[PADDING, style]}
      testID={testID}
    >
      <Icon name="cloud-off" size={16} color={color.textOnInk} />
      <View className="flex-1" style={MIN_WIDTH}>
        <Text className="type-caption text-fg-on-ink">{children}</Text>
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={ACTION_HIT}>
          {/* teal-300 rather than the usual accent: on an ink fill the darker teals
              disappear, and this is the one place the palette's light teal is a text
              colour. */}
          <Text style={ACTION}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const PADDING: ViewStyle = {
  paddingVertical: space['2h'],
  paddingHorizontal: space['3h'],
  borderRadius: radius.md,
};

const MIN_WIDTH: ViewStyle = {minWidth: 0};

const ACTION_HIT: ViewStyle = {paddingHorizontal: space['1'], paddingVertical: space['1h']};

const ACTION: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize.sm,
  color: color.teal300,
};
