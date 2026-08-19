/**
 * @fileoverview QuitDialog — leaving a stop, place-kept (P4).
 *
 * The one interrupting dialog in the app. Never loss-framed: the copy agrees
 * with the resume intro S4·r three frames away — the place is kept, and the
 * stop carries on where the learner left off. "Keep going" stands under the
 * ghost "Leave", where a thumb rests, per Dialog's own footer rule.
 */

import {Text} from 'react-native';

import {Button} from '../core/button';
import {Dialog} from '../feedback/dialog';

export type QuitDialogProps = {
  open: boolean;
  /** Dismisses the dialog; the stop carries on. */
  onKeepGoing: () => void;
  /** Leaves the stop. The place is kept — leaving loses nothing. */
  onLeave: () => void;
};

/** The P4 quit dialog, worded from the board frame. */
export function QuitDialog({open, onKeepGoing, onLeave}: QuitDialogProps) {
  return (
    <Dialog
      open={open}
      title="Leave this stop?"
      onClose={onKeepGoing}
      footer={
        <>
          <Button size="md" fullWidth onPress={onKeepGoing}>
            Keep going
          </Button>
          <Button variant="ghost" size="md" fullWidth onPress={onLeave}>
            Leave
          </Button>
        </>
      }
    >
      <Text className="type-body text-fg-muted">
        Your place is kept — the stop carries on where you left off.
      </Text>
    </Dialog>
  );
}
