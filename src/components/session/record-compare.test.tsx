/**
 * @fileoverview RecordCompare's contract — before, recording, compared, with no
 * verdict anywhere; the model take plays first on V9's shape and arrives with
 * the reveal on E5's; the take is discarded on every exit; and the M1/M2/M3
 * mic flow wraps it all. The composition seams are mocked the way screens mock
 * `expo-router`. Phases per docs/11.
 */

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {ContentItemId} from '../../ports/content-ids';
import {RecordCompare} from './record-compare';
import type {Item, Items, SessionEntry} from './types';

const record = vi.hoisted(() => ({
  queryMicPermission: vi.fn(),
  requestMicPermission: vi.fn(),
  startTake: vi.fn(),
  stopTake: vi.fn(),
  discardTake: vi.fn(),
  playTake: vi.fn(),
  stopTakePlayback: vi.fn(),
  micPrimerSeen: vi.fn(),
  markMicPrimerSeen: vi.fn(),
}));
vi.mock('../../composition/record', () => record);

const play = vi.hoisted(() => ({
  playClip: vi.fn(),
  stopClip: vi.fn(),
}));
vi.mock('../../composition/play', () => play);

const TAKE_URI = 'file:///cache/take-1.m4a';

const WORD_AUDIO = {path: 'vocab/khatak.mp3', available: true};
const PHRASE_AUDIO = {path: 'phrase/enough.mp3', available: true};

/** A dictionary item reduced to what the renderer reads, audio included. */
function audioItem(
  id: string,
  fields: {bo: string; roman: string; en: string; audio: typeof WORD_AUDIO},
): [ContentItemId, Item] {
  return [id as ContentItemId, {id, ...fields} as unknown as Item];
}

const ITEMS: Items = new Map([
  audioItem('vocab.khatak', {
    bo: 'ཁ་བཏགས་',
    roman: 'khatak',
    en: 'ceremonial scarf',
    audio: WORD_AUDIO,
  }),
  audioItem('phrase.enough', {
    bo: 'ད་འགྲིག་སོང་། ཐུགས་རྗེ་ཆེ།',
    roman: 'thaa drik song thukdje chhe',
    en: "That's enough, thank you.",
    audio: PHRASE_AUDIO,
  }),
]);

function entryOf(exerciseType: string, itemId: string): SessionEntry {
  return {
    key: '0',
    ask: 'first',
    position: {
      kind: 'exercise',
      exercise: {
        exerciseId: 'ex.1',
        itemId,
        exerciseType,
        presentation: exerciseType,
        commitMode: 'none',
        options: [],
      },
    },
  };
}

const ALOUD = entryOf('read-it-aloud', 'vocab.khatak');
const PRODUCE = entryOf('phrase-produce', 'phrase.enough');

/** Record, then stop — the two taps that reach the compare. */
async function recordAndStop(): Promise<void> {
  fireEvent.click(screen.getByLabelText('Record yourself'));
  fireEvent.click(await screen.findByLabelText('Stop recording'));
  await screen.findByText('Got it');
}

describe('RecordCompare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    record.queryMicPermission.mockResolvedValue('granted');
    record.requestMicPermission.mockResolvedValue('granted');
    record.startTake.mockResolvedValue('recording');
    record.stopTake.mockResolvedValue(TAKE_URI);
    record.discardTake.mockResolvedValue(undefined);
    record.playTake.mockResolvedValue(undefined);
    record.stopTakePlayback.mockResolvedValue(undefined);
    record.micPrimerSeen.mockResolvedValue(true);
    record.markMicPrimerSeen.mockResolvedValue(undefined);
    play.playClip.mockResolvedValue(undefined);
    play.stopClip.mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it('opens on the model take: the learner never speaks into silence', () => {
    // When
    render(<RecordCompare entry={ALOUD} itemsById={ITEMS} onCommit={() => {}} />);

    // Then
    // The romanization stands in for the Tibetan: the glyph run is rendered
    // with zero-width break points, so its DOM text is not the raw string
    expect(screen.getByText('khatak')).toBeTruthy();
    expect(screen.getByText('Listen, then say it back.')).toBeTruthy();
    expect(screen.getByLabelText('Record yourself')).toBeTruthy();
    expect(play.playClip).toHaveBeenCalledWith(WORD_AUDIO);
  });

  it('prompts E5 in English only, with the skip that costs nothing', () => {
    // Given
    const onCommit = vi.fn();
    render(<RecordCompare entry={PRODUCE} itemsById={ITEMS} onCommit={onCommit} />);

    // Then
    // The Tibetan is not on this screen, and the take stays unplayed
    expect(screen.getByText(`“That's enough, thank you.”`)).toBeTruthy();
    expect(screen.queryByText('thaa drik song thukdje chhe')).toBeNull();
    expect(screen.getByText('Say it, then hear how she says it.')).toBeTruthy();
    expect(play.playClip).not.toHaveBeenCalled();

    // When
    fireEvent.click(screen.getByText('Skip this one'));

    // Then
    expect(onCommit).toHaveBeenCalledWith({kind: 'continue'});
  });

  it('walks before → recording → compared, and never names a verdict', async () => {
    // Given
    render(<RecordCompare entry={ALOUD} itemsById={ITEMS} onCommit={() => {}} />);

    // When
    fireEvent.click(screen.getByLabelText('Record yourself'));

    // Then
    expect(await screen.findByLabelText('Stop recording')).toBeTruthy();

    // When
    fireEvent.click(screen.getByLabelText('Stop recording'));

    // Then
    expect(await screen.findByText('Native speaker')).toBeTruthy();
    expect(screen.getByText('You')).toBeTruthy();
    expect(screen.getByText('Listen to both. You decide.')).toBeTruthy();
    expect(screen.getByText('Again')).toBeTruthy();
    expect(screen.getByText('Got it')).toBeTruthy();
    expect(screen.queryByText(/correct|wrong|score|%/i)).toBeNull();
  });

  it('reveals the Tibetan with the take on E5, and plays it then', async () => {
    // Given
    render(<RecordCompare entry={PRODUCE} itemsById={ITEMS} onCommit={() => {}} />);

    // When
    await recordAndStop();

    // Then
    expect(screen.getByText('Here it is')).toBeTruthy();
    expect(screen.getByText('thaa drik song thukdje chhe')).toBeTruthy();
    expect(play.playClip).toHaveBeenCalledWith(PHRASE_AUDIO);
  });

  it('re-records on Again, discarding the first take', async () => {
    // Given
    render(<RecordCompare entry={ALOUD} itemsById={ITEMS} onCommit={() => {}} />);
    await recordAndStop();

    // When
    fireEvent.click(screen.getByText('Again'));

    // Then
    expect(record.discardTake).toHaveBeenCalledWith(TAKE_URI);
    expect(screen.getByLabelText('Record yourself')).toBeTruthy();
    expect(screen.queryByText('Got it')).toBeNull();
  });

  it('continues on Got it, with the take deleted after the compare', async () => {
    // Given
    const onCommit = vi.fn();
    render(<RecordCompare entry={ALOUD} itemsById={ITEMS} onCommit={onCommit} />);
    await recordAndStop();

    // When
    fireEvent.click(screen.getByText('Got it'));

    // Then
    expect(record.discardTake).toHaveBeenCalledWith(TAKE_URI);
    expect(onCommit).toHaveBeenCalledWith({kind: 'continue'});
  });

  it('discards an abandoned take when the exercise unmounts', async () => {
    // Given
    const {unmount} = render(<RecordCompare entry={ALOUD} itemsById={ITEMS} onCommit={() => {}} />);
    await recordAndStop();

    // When
    unmount();

    // Then
    expect(record.discardTake).toHaveBeenCalledWith(TAKE_URI);
  });

  it('runs the M1 primer before the system dialog, exactly once ever', async () => {
    // Given
    record.queryMicPermission.mockResolvedValue('undetermined');
    record.micPrimerSeen.mockResolvedValue(false);
    render(<RecordCompare entry={ALOUD} itemsById={ITEMS} onCommit={() => {}} />);

    // When
    fireEvent.click(screen.getByLabelText('Record yourself'));

    // Then
    // The primer stands and the system dialog has not been raised
    expect(
      await screen.findByText(
        'To compare your voice with a native speaker’s, the app needs the microphone.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Nothing is sent anywhere — and nothing is kept. Your recording plays once, for you, and is gone.',
      ),
    ).toBeTruthy();
    expect(record.requestMicPermission).not.toHaveBeenCalled();

    // When
    fireEvent.click(screen.getByText('Allow the microphone'));

    // Then
    await waitFor(() => {
      expect(record.markMicPrimerSeen).toHaveBeenCalled();
      expect(record.requestMicPermission).toHaveBeenCalled();
      expect(record.startTake).toHaveBeenCalled();
    });
  });

  it('skips the primer once seen: straight to the system dialog', async () => {
    // Given
    record.queryMicPermission.mockResolvedValue('undetermined');
    record.micPrimerSeen.mockResolvedValue(true);
    render(<RecordCompare entry={ALOUD} itemsById={ITEMS} onCommit={() => {}} />);

    // When
    fireEvent.click(screen.getByLabelText('Record yourself'));

    // Then
    await waitFor(() => {
      expect(record.requestMicPermission).toHaveBeenCalled();
    });
    expect(screen.queryByText('Allow the microphone')).toBeNull();
  });

  it('declines the primer into listening only, and the primer never returns', async () => {
    // Given
    record.queryMicPermission.mockResolvedValue('undetermined');
    record.micPrimerSeen.mockResolvedValue(false);
    render(<RecordCompare entry={ALOUD} itemsById={ITEMS} onCommit={() => {}} />);
    fireEvent.click(screen.getByLabelText('Record yourself'));
    await screen.findByText('Allow the microphone');

    // When
    fireEvent.click(screen.getByText('Not now — just listen and repeat'));

    // Then
    expect(record.markMicPrimerSeen).toHaveBeenCalled();
    expect(record.requestMicPermission).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Record yourself')).toBeTruthy();
  });

  it('carries the drill on without recording when the mic is denied — M2', async () => {
    // Given
    const onCommit = vi.fn();
    record.queryMicPermission.mockResolvedValue('denied');
    render(<RecordCompare entry={ALOUD} itemsById={ITEMS} onCommit={onCommit} />);

    // When
    fireEvent.click(screen.getByLabelText('Record yourself'));

    // Then
    expect(await screen.findByText('Say it out loud.')).toBeTruthy();
    expect(
      screen.getByText('Listen once more, then say it. Nobody is checking but you.'),
    ).toBeTruthy();
    expect(
      screen.getByText('Recording is off. You can turn it on in your phone’s Settings.'),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Record yourself')).toBeNull();

    // When
    fireEvent.click(screen.getByText('Done'));

    // Then
    expect(onCommit).toHaveBeenCalledWith({kind: 'continue'});
  });

  it('raises M3 as a Toast over the exercise when the recorder cannot start', async () => {
    // Given
    record.startTake.mockResolvedValue('unavailable');
    render(<RecordCompare entry={ALOUD} itemsById={ITEMS} onCommit={() => {}} />);

    // When
    fireEvent.click(screen.getByLabelText('Record yourself'));

    // Then
    // A Toast, never a dialog — the exercise stays where it was
    expect(
      await screen.findByText(
        'Another app is using the microphone. Say it out loud instead, or try again in a moment.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Record yourself')).toBeTruthy();
  });
});
