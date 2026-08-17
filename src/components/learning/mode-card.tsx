/**
 * @fileoverview ModeCard — a way to practise, offered as a row.
 *
 * **The disabled state is the point of this component.** A mode that cannot run says why in
 * its own words — "Needs four pictures. This district has two." — instead of greying out
 * silently. Disabled changes the fill, never the opacity: a faded card reads as broken,
 * a card on ground reads as not available here.
 *
 * `count` is how many exercises the mode holds at the pool the picker is scoped to, and it
 * **always carries its unit** — "24 cards", "11 quest.", "5 boards", "13 phrases". A bare
 * number beside a pool size reads as a contradiction. Omit it where the mode has no fixed
 * length, like flashcards or just listen.
 *
 * `absentBecause` is the opposite case: a mode the learner switched off themselves. There is
 * no card to disable, because the mode is gone — one subtle line says which setting removed
 * it. **Never show someone a locked thing they chose to lock.**
 */

import {Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {Icon, type IconName} from '../core/icon';
import {color, fontFamily, fontSize, leading, radius, space} from '../../theme/tokens.generated';

const ICON_BOX = 48;

export type ModeCardProps = {
  title?: string;
  body?: string;
  icon?: IconName;
  /** The pool size with its unit — "24 cards", never "24". */
  count?: string | number;
  /** Cannot run right now. Say why in `reason`. */
  disabled?: boolean;
  /** Why the mode cannot run, in the product's own words. */
  reason?: string;
  /** Which setting removed this mode. Replaces the card entirely. */
  absentBecause?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * One practice mode.
 *
 * @example <ModeCard title="Listen and pick" body="Hear it. Choose what it means." icon="volume-2" count="52 phrases" onPress={start} />
 * @example <ModeCard absentBecause="Just listen is off while exercises without sound is on." />
 */
export function ModeCard({
  title,
  body,
  icon = 'play',
  count,
  disabled = false,
  reason,
  absentBecause,
  onPress,
  style,
  testID,
}: ModeCardProps) {
  if (absentBecause) {
    return (
      <Text style={[ABSENT, style as StyleProp<TextStyle>]} testID={testID}>
        {absentBecause}
      </Text>
    );
  }

  const ink = disabled ? color.textSubtle : color.textHeading;
  const shown = count !== undefined && count !== '';

  const inner = (
    <>
      <View
        aria-hidden
        style={[ICON, {backgroundColor: disabled ? color.ground200 : color.surfaceAccentSoft}]}
      >
        <Icon name={icon} size={24} color={disabled ? color.textSubtle : color.textAccent} />
      </View>
      <View style={COPY}>
        <Text style={[TITLE, {color: ink}]}>{title}</Text>
        <Text style={BODY}>{body}</Text>
        {reason ? <Text style={REASON}>{reason}</Text> : null}
      </View>
      {shown ? (
        <Text style={[COUNT, {color: disabled ? color.textSubtle : color.textMuted}]}>{count}</Text>
      ) : null}
      {disabled ? null : (
        // The registry has no chevron-right: the design system draws this one by rotating
        // chevron-down, and a second Lucide import for the same mark would be a second name
        // for it. Icon takes no style, so the rotation lives on a wrapper.
        <View aria-hidden style={CHEVRON}>
          <Icon name="chevron-down" size={20} color={color.ink300} />
        </View>
      )}
    </>
  );

  const cardStyle: ViewStyle = {
    ...CARD,
    backgroundColor: disabled ? color.ground050 : color.surfaceCard,
  };

  if (!onPress || disabled) {
    return (
      <View aria-disabled={disabled} style={[cardStyle, style]} testID={testID}>
        {inner}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={body}
      onPress={onPress}
      style={[cardStyle, style]}
      testID={testID}
    >
      {inner}
    </Pressable>
  );
}

const CARD: ViewStyle = {
  width: '100%',
  flexDirection: 'row',
  alignItems: 'center',
  gap: space['3h'],
  padding: space['4'],
  borderRadius: radius.lg,
};

const ICON: ViewStyle = {
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  width: ICON_BOX,
  height: ICON_BOX,
  borderRadius: radius.control,
};

const COPY: ViewStyle = {flex: 1, minWidth: 0, gap: 2};

const CHEVRON: ViewStyle = {flexShrink: 0, transform: [{rotate: '-90deg'}]};

const TITLE: TextStyle = {
  fontFamily: fontFamily.displayBold,
  fontSize: fontSize.lg,
  lineHeight: fontSize.lg * leading.tight,
};

const BODY: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.md,
  lineHeight: fontSize.md * leading.latin,
  color: color.textMuted,
};

const REASON: TextStyle = {
  fontFamily: fontFamily.bodySemibold,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * leading.latin,
  color: color.textSubtle,
  marginTop: 2,
};

const COUNT: TextStyle = {
  flexShrink: 0,
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize.md,
};

const ABSENT: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * leading.latin,
  color: color.textSubtle,
  paddingVertical: space['1'],
  paddingHorizontal: space['4'],
};
