/**
 * @fileoverview Sheet — the app's main secondary surface.
 *
 * Rises from the tab bar with 36pt top corners and a flat ink scrim. This is where almost
 * everything secondary goes: a word's detail, a filter set, a list of choices. `Dialog` is
 * the exception, reserved for a decision that must interrupt.
 *
 * The grabber is decoration, not a control: it says the surface came from the bottom edge.
 * There is no drag-to-dismiss — `docs/04` allows one flip and no spring, and a rubber-banding
 * sheet is neither.
 *
 * React Native delta: the web original is an absolutely-positioned overlay inside the phone
 * frame. Here it is a real `Modal`, which is what puts it above the tab bar rather than
 * inside whatever happened to render it. `animationType` is left off because Reanimated
 * drives the entrance and the exit — the two together would animate it twice.
 *
 * **The Modal outlives `open` by one animation.** A `Modal` tears its whole tree down in
 * the frame its `visible` goes false, so a panel whose visibility is `open` has nothing
 * left to animate and simply vanishes — which is what it did until 2026-08-18. `mounted`
 * keeps the Modal up while the panel and scrim, which are conditional on `open`, unmount
 * underneath it and run their exits.
 */

import {useEffect, useState, type ReactNode} from 'react';
import {Modal, View, type StyleProp, type ViewStyle} from 'react-native';
import Animated, {SlideInDown, SlideOutDown} from 'react-native-reanimated';

import {duration, easing} from '../core/motion';
import {color, elevation, radius, space} from '../../theme/tokens.generated';
import {OverlayTitle, PANEL_PADDING, Scrim} from './overlay';

const GRABBER_WIDTH = 44;
const GRABBER_HEIGHT = 5;

export type SheetProps = {
  open?: boolean;
  /** Goes through mixedTibetan, so a Tibetan word in the title sets properly. */
  title?: string;
  children?: ReactNode;
  /** Actions, usually one Button. Sits below the content with more room above it. */
  footer?: ReactNode;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The bottom sheet.
 *
 * @example
 * <Sheet open={open} title="Reminder" onClose={close} footer={<Button>Save</Button>}>
 *   <Text className="type-body text-fg-body">Pick a time.</Text>
 * </Sheet>
 */
export function Sheet({open = false, title, children, footer, onClose, style, testID}: SheetProps) {
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
              entering={SlideInDown.duration(duration.slow).easing(easing.out.factory())}
              // Quicker than the entrance, and it leaves the way it came. A surface that
              // takes as long to go as to arrive reads as reluctant.
              exiting={SlideOutDown.duration(EXIT_MS).easing(easing.out.factory())}
              className="bg-surface-card"
              style={[PANEL, style]}
            >
              <View aria-hidden style={GRABBER} />
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

/**
 * How long the Modal stays up after `open` goes false.
 *
 * Long enough for the exit to finish, and driven by a timer rather than by the animation's
 * own `withCallback`. That is the deliberate part: **Reanimated exit animations inside a
 * React Native `Modal` are the fragile piece of this**, and an unmount that waits for a
 * callback which never fires would leave the surface stuck open — strictly worse than the
 * abrupt disappearance this replaces. A timer closes either way; the animation is what is
 * allowed to fail.
 */
const EXIT_MS = duration.base;

/** Bottom-anchored: the panel takes its own height and the scrim fills the rest. */
const CONTAINER: ViewStyle = {flex: 1, justifyContent: 'flex-end'};

const PANEL: ViewStyle = {
  padding: PANEL_PADDING,
  borderTopLeftRadius: radius.sheet,
  borderTopRightRadius: radius.sheet,
  boxShadow: elevation.shadowSheet,
};

const GRABBER: ViewStyle = {
  width: GRABBER_WIDTH,
  height: GRABBER_HEIGHT,
  borderRadius: radius.pill,
  backgroundColor: color.ground300,
  alignSelf: 'center',
  marginBottom: space['4'],
};

const CONTENT: ViewStyle = {marginTop: space['3']};
const FOOTER: ViewStyle = {marginTop: space['5']};
