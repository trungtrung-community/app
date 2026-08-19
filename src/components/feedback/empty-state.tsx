/**
 * @fileoverview EmptyState — a centred nothing-here, pointing forward.
 *
 * The copy rule is the whole component: it says what happens next, never that something is
 * missing. "Your first district starts below", not "No districts found". `docs/04` forbids
 * the apologetic register everywhere, and an empty state is where it creeps in.
 *
 * One line of body and one action, both optional. Two actions means the screen has not
 * decided what it wants the learner to do.
 *
 * Ported from the bundle: `EmptyState` ships no `.jsx` in the export.
 */

import {
  Image,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {Button} from '../core/button';
import {space} from '../../theme/tokens.generated';

const MASCOT_HEIGHT = 120;
const BODY_MAX_WIDTH = 300;

export type EmptyStateProps = {
  /**
   * The crane.
   *
   * No mascot art exists in this repo yet — the design system points at
   * `assets/mascot-crane.png`, which has never been drawn. Passing nothing renders the
   * state without it rather than reserving a gap that reads as a broken image.
   */
  mascot?: ImageSourcePropType;
  title: string;
  /** One line. Points forward. */
  children?: string;
  /** One action, or none. */
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A centred empty state.
 *
 * @example
 * <EmptyState title="Your first district starts below" action="Begin" onAction={start}>
 *   Six stops, about ten minutes each.
 * </EmptyState>
 */
export function EmptyState({
  mascot,
  title,
  children,
  action,
  onAction,
  style,
  testID,
}: EmptyStateProps) {
  return (
    <View className="w-full items-center gap-3" style={[PADDING, style]} testID={testID}>
      {mascot ? (
        // Decoration: the title carries the meaning, so the crane is not described.
        <Image source={mascot} accessibilityIgnoresInvertColors alt="" style={MASCOT} />
      ) : null}
      <Text accessibilityRole="header" className="type-heading text-fg-heading text-center">
        {title}
      </Text>
      {children ? (
        <Text className="type-body text-fg-muted text-center" style={BODY}>
          {children}
        </Text>
      ) : null}
      {action ? (
        <View style={ACTION}>
          {/*
           * Primary, not `secondary`. An empty state has exactly one action and it points
           * forward, which is the definition of a primary action — and `docs/04` allows
           * "two button skins only: teal primary and ghost. Nothing else — no white
           * shadowed pill", which is what `secondary` draws. It shipped as `secondary`
           * until 2026-08-18 and read as a white button on a white ground.
           */}
          <Button variant="primary" onPress={onAction}>
            {action}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const PADDING: ViewStyle = {
  paddingVertical: space['8'],
  paddingHorizontal: space['5'],
};

const MASCOT = {height: MASCOT_HEIGHT, marginBottom: space['2'], resizeMode: 'contain'} as const;

const BODY: ViewStyle = {maxWidth: BODY_MAX_WIDTH};

const ACTION: ViewStyle = {marginTop: space['2']};
