/**
 * @fileoverview Badge — read-only status.
 *
 * A badge states something the learner cannot change: a count, a state, a `New` marker.
 * `Tag` is the selectable sibling — if it can be chosen or dismissed, it is a Tag.
 *
 * Ported from the bundle: `Badge` ships no `.jsx` in the export.
 */

import {Text, View, type StyleProp, type ViewStyle} from 'react-native';

import {fontSize, tracking} from '../../theme/tokens.generated';
import {Icon, type IconName} from './icon';

/**
 * Fill, label colour, and the dot's fill.
 *
 * `dot` is spelled out rather than derived from `label`, because deriving it would mean
 * building a class name at runtime and Tailwind scans at build time — the class would
 * simply not exist.
 */
const TONES = {
  accent: {fill: 'bg-teal-600', label: 'text-fg-on-accent', dot: 'bg-ground-000'},
  soft: {fill: 'bg-surface-accent-soft', label: 'text-fg-accent', dot: 'bg-teal-700'},
  reward: {fill: 'bg-beak-600', label: 'text-fg-heading', dot: 'bg-ink-900'},
  alert: {fill: 'bg-crown-600', label: 'text-fg-on-accent', dot: 'bg-ground-000'},
  correct: {fill: 'bg-grass-600', label: 'text-fg-on-accent', dot: 'bg-ground-000'},
  neutral: {fill: 'bg-ground-200', label: 'text-fg-muted', dot: 'bg-ink-400'},
  ink: {fill: 'bg-ink-900', label: 'text-fg-on-ink', dot: 'bg-ground-100'},
} as const;

export type BadgeTone = keyof typeof TONES;

/**
 * `--tracking-caps` is 0.08em and React Native measures letterSpacing in points, so
 * the em resolves against the label's own size. The generated tokens document this
 * conversion but cannot perform it.
 */
const CAPS_TRACKING = parseFloat(tracking.caps) * fontSize['2xs'];

export type BadgeProps = {
  /** Omit for the bare dot form: a 10pt marker with no text. */
  children?: string;
  tone?: BadgeTone;
  icon?: IconName;
  /** A small leading dot inside a labelled badge. */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A status marker.
 *
 * @example <Badge tone="correct">19 known</Badge>
 * @example <Badge tone="accent" />  // the bare dot
 */
export function Badge({children, tone = 'soft', icon, dot = false, style, testID}: BadgeProps) {
  const {fill, label, dot: dotFill} = TONES[tone];
  const bare = children === undefined;

  if (bare) {
    return (
      <View
        className={`h-2h w-2h rounded-pill ${fill}`}
        style={style}
        testID={testID}
        // A bare dot carries no text, so it is decoration; whatever it marks must
        // state itself in words nearby.
        aria-hidden
      />
    );
  }

  return (
    <View
      className={`flex-row items-center self-start rounded-pill px-2h py-1 ${dot ? 'gap-1h' : 'gap-1'} ${fill}`}
      style={style}
      testID={testID}
    >
      {dot ? <View className={`h-1h w-1h rounded-pill ${dotFill}`} /> : null}
      {icon ? <Icon name={icon} size={16} /> : null}
      <Text className={`type-label uppercase ${label}`} style={{letterSpacing: CAPS_TRACKING}}>
        {children}
      </Text>
    </View>
  );
}
