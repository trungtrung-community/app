/**
 * @fileoverview CapabilityList — the session-end checklist.
 *
 * What the learner can now *do*, in plain language: filled check, the capability in bold,
 * the example muted underneath. It names abilities, never counts — a list that said "12
 * words" would be a score, and this is the screen that exists so a session ends in
 * something the learner recognises as their own.
 *
 * `marker="ring"` draws a hollow ring instead of the green check, for the "come back to
 * these" list. That list is information and never a grade, which is why it gets the same
 * component and only a different marker: an unmet capability is one the learner has not
 * reached yet, not one they failed. A per-item `marker` overrides the list's default, so a
 * mixed list can carry both.
 *
 * Both strings go through `mixedTibetan`, because a capability is often written with the
 * script in it — "Ask for tea with ཇ་".
 */

import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {Icon} from '../core/icon';
import {
  color,
  elevation,
  fontFamily,
  fontSize,
  leading,
  radius,
  space,
} from '../../theme/tokens.generated';
import {mixedTibetan} from './tibetan-text';

export type CapabilityMarker = 'check' | 'ring';

const MARKER_SIZE = 26;

export type Capability = {
  /** What the learner can do, in their own terms. */
  capability: string;
  /** A concrete instance of it. */
  example?: string;
  /** Overrides the list's marker for this one item. */
  marker?: CapabilityMarker;
};

export type CapabilityListProps = {
  items?: readonly Capability[];
  marker?: CapabilityMarker;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The list of what the learner can now do.
 *
 * @example <CapabilityList items={gained} />
 * @example <CapabilityList items={notYet} marker="ring" />
 */
export function CapabilityList({items = [], marker = 'check', style, testID}: CapabilityListProps) {
  return (
    <View style={[LIST, style]} testID={testID}>
      {items.map((item, index) => {
        const hollow = (item.marker ?? marker) === 'ring';
        return (
          <View key={index} style={ITEM}>
            <View aria-hidden style={[MARKER, hollow ? RING : FILLED]}>
              {hollow ? null : (
                <Icon name="check" size={16} strokeWidth={3} color={color.textOnAccent} />
              )}
            </View>
            <View style={COPY}>
              <Text style={CAPABILITY}>{mixedTibetan(item.capability)}</Text>
              {item.example ? <Text style={EXAMPLE}>{mixedTibetan(item.example)}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const LIST: ViewStyle = {
  width: '100%',
  backgroundColor: color.surfaceCard,
  borderRadius: radius.lg,
  padding: space['5'],
  gap: space['4'],
};

const ITEM: ViewStyle = {flexDirection: 'row', alignItems: 'flex-start', gap: space['3']};

const MARKER: ViewStyle = {
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  width: MARKER_SIZE,
  height: MARKER_SIZE,
  borderRadius: radius.pill,
  // Sits on the first line's optical centre rather than its ascender.
  marginTop: 1,
};

const FILLED: ViewStyle = {backgroundColor: color.grass600};
/** An inset ring, which is how a fill-based system draws an outline without a border. */
const RING: ViewStyle = {backgroundColor: 'transparent', boxShadow: elevation.ringMarker};

const COPY: ViewStyle = {flex: 1, minWidth: 0};

const CAPABILITY: TextStyle = {
  fontFamily: fontFamily.bodySemibold,
  fontSize: fontSize.md,
  lineHeight: fontSize.md * leading.latin,
  color: color.textHeading,
};

const EXAMPLE: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.sm,
  lineHeight: fontSize.sm * leading.latin,
  color: color.textMuted,
};
