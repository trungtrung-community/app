/**
 * @fileoverview Dialog — a centred modal, for a decision that must interrupt.
 *
 * Reserve it. Quitting a lesson mid-stop, erasing progress. Everything else is a `Sheet`,
 * which arrives from an edge rather than landing in the middle of what the learner was
 * doing.
 *
 * The footer stacks rather than sitting in a row: on a phone two side-by-side buttons are
 * both too narrow, and stacking puts the safe choice under the destructive one where a
 * thumb rests.
 *
 * Ported from source. Same Modal reasoning as `Sheet`, including the part where the Modal
 * outlives `open` by one animation so the panel has somewhere to leave from.
 */

import {useEffect, useState, type ReactNode} from 'react';
import {Modal, View, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {ZoomIn, ZoomOut} from 'react-native-reanimated';

import {duration, easing} from '../core/motion';
import {elevation, radius, space} from '../../theme/tokens.generated';
import {OverlayTitle, PANEL_PADDING, Scrim} from './overlay';

const DEFAULT_MAX_WIDTH = 380;

export type DialogProps = {
  open?: boolean;
  /** Goes through mixedTibetan, so a Tibetan word in the title sets properly. */
  title?: string;
  children?: ReactNode;
  /** The actions. Stacked, safe choice last. */
  footer?: ReactNode;
  onClose?: () => void;
  /** A cap, not a width — the panel is full-width below it. */
  width?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The interrupting modal.
 *
 * @example
 * <Dialog open={open} title="Leave this stop?" onClose={stay}
 *   footer={<><Button variant="danger" onPress={leave}>Leave</Button>
 *            <Button variant="ghost" onPress={stay}>Keep going</Button></>}>
 *   <Text className="type-body text-fg-body">Your answers so far are kept.</Text>
 * </Dialog>
 */
export function Dialog({
  open = false,
  title,
  children,
  footer,
  onClose,
  width = DEFAULT_MAX_WIDTH,
  style,
  testID,
}: DialogProps) {
  // `mounted` is derived rather than stored: the Modal is up while the panel is open OR
  // still leaving. The transition is caught by adjusting state during render — React's
  // documented pattern for reacting to a changed prop — because doing it in an effect
  // means a synchronous setState in the effect body, which renders once with the wrong
  // value and is what `react-hooks/set-state-in-effect` refuses.
  const [leaving, setLeaving] = useState(false);
  const [seenOpen, setSeenOpen] = useState(open);
  if (seenOpen !== open) {
    setSeenOpen(open);
    setLeaving(!open);
  }
  const mounted = open || leaving;

  useEffect(() => {
    if (!leaving) {
      return;
    }
    const closed = setTimeout(() => setLeaving(false), EXIT_MS);
    return () => clearTimeout(closed);
  }, [leaving]);

  return (
    <Modal visible={mounted} transparent onRequestClose={onClose} testID={testID}>
      <View style={CONTAINER}>
        {open ? (
          <>
            <Scrim onPress={onClose} />
            <Animated.View
              accessibilityViewIsModal
              aria-modal
              // Grows the last 4% into place on the settling curve, which is the one soft
              // overshoot `docs/04` allows.
              entering={ZoomIn.duration(duration.base)
                .easing(easing.settle.factory())
                .withInitialValues({transform: [{scale: 0.96}]})}
              // Out on `easeOut`, not `easeSettle`: the overshoot is for a thing arriving
              // at rest, and a panel that swells on its way out is the wobble `docs/04`
              // forbids.
              exiting={ZoomOut.duration(EXIT_MS).easing(easing.out.factory())}
              className="bg-surface-card"
              style={[PANEL, {maxWidth: width}, style]}
            >
              <OverlayTitle title={title} onClose={onClose} />
              {children ? <View style={CONTENT}>{children}</View> : null}
              {footer ? <View style={FOOTER}>{footer}</View> : null}
            </Animated.View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

/** Matches `Sheet`'s, and for the same reason — see the note there. */
const EXIT_MS = duration.base;

/** Centred, with a gutter so the panel never touches the screen edge. */
const CONTAINER: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: PANEL_PADDING,
};

const PANEL: ViewStyle = {
  width: '100%',
  padding: space['6'],
  borderRadius: radius.xl,
  boxShadow: elevation.shadowFloat,
};

const CONTENT: ViewStyle = {marginTop: space['3']};

/** Stacked, not a row. See the note at the top of the file. */
const FOOTER: ViewStyle = {marginTop: space['6'], gap: space['2']};
