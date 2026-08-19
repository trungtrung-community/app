/**
 * @fileoverview RecordCompare — the record-compare family (V9 / E5 / RB13).
 *
 * One renderer, two shapes. `phrase-produce` is E5: the prompt is English only,
 * and the Tibetan arrives with the native take on reveal — showing it earlier
 * would let the learner read a phrase off instead of producing it (docs/03 §3,
 * settled 2026-08-16). Everything else — `read-it-aloud` today, a word-level
 * say-it if the content ever ships one — is V9's order: the model take plays
 * first, because the learner never speaks into silence.
 *
 * No correct or wrong, by design. States are before / recording / compared;
 * the buttons are Again and Got it only, Got it commits a plain continue, and
 * nothing here scores, matches, or measures a take (docs/03 §2, §7).
 *
 * The mic flow wraps the states: an undetermined permission runs the M1 primer
 * before the system dialog ever appears, exactly once per device; a denial is
 * M2 — the drill carries on listening-only, with one line naming Settings; a
 * recorder that cannot start is M3's Toast over the exercise, never a dialog.
 *
 * Ephemerality: every exit — Again, Got it, leaving the screen — discards the
 * take through `composition/record`, which is what makes M1's "nothing is
 * kept" true.
 */

import {useEffect, useRef, useState} from 'react';
import {Text, View} from 'react-native';

import {playClip, stopClip} from '../../composition/play';
import {
  discardTake,
  micPrimerSeen,
  markMicPrimerSeen,
  playTake,
  queryMicPermission,
  requestMicPermission,
  startTake,
  stopTake,
  stopTakePlayback,
} from '../../composition/record';
import {Badge} from '../core/badge';
import {Button} from '../core/button';
import {Toast} from '../feedback/toast';
import {AudioButton} from '../learning/audio-button';
import {PlaybackRow} from '../learning/playback-row';
import {RecordButton} from '../learning/record-button';
import {TibetanText} from '../learning/tibetan-text';
import type {AudioRef, ContentItemId} from '../../ports/content-ids';
import type {CommitInput} from '../../usecases/submit-answer';
import {MicPrimer} from './mic-primer';
import type {Item, Items, SessionEntry} from './types';

/** M3's copy — the board's Toast, word for word. */
const MIC_BUSY =
  'Another app is using the microphone. Say it out loud instead, or try again in a moment.';

/** How long M3's Toast stands before leaving on its own. */
const TOAST_MS = 4000;

export type RecordComparePhase = 'before' | 'recording' | 'compared';

export type RecordCompareProps = {
  entry: SessionEntry;
  itemsById: Items;
  onCommit: (input: CommitInput) => void;
};

/**
 * The item's model take, where the item carries one. A letter arrives reduced
 * to a `DisplayItem` without its recording — until that ref is surfaced, the
 * listen controls stand and play nothing, which `playClip` treats as silence.
 */
function modelTakeOf(item: Item | undefined): AudioRef | null {
  return item !== undefined && 'audio' in item ? item.audio : null;
}

/** The record-compare entry of a stop session. */
export function RecordCompare({entry, itemsById, onCommit}: RecordCompareProps) {
  const [phase, setPhase] = useState<RecordComparePhase>('before');
  const [takeUri, setTakeUri] = useState<string | null>(null);
  const [micDenied, setMicDenied] = useState(false);
  const [primerOpen, setPrimerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const exercise = entry.position.kind === 'exercise' ? entry.position.exercise : null;
  const target =
    exercise === null || exercise.itemId === null
      ? undefined
      : itemsById.get(exercise.itemId as ContentItemId);
  const model = modelTakeOf(target);
  // E5's shape; everything else keeps V9's model-first order.
  const englishFirst = exercise?.exerciseType === 'phrase-produce';

  // The model take plays first (V9), or arrives with the reveal (E5) — either
  // way the learner hears the native voice before judging their own.
  const modelAudible = englishFirst ? phase === 'compared' : true;
  useEffect(() => {
    if (modelAudible && model !== null) {
      void playClip(model);
    }
  }, [modelAudible, model]);

  // Leaving the exercise abandons the take: discarded, never kept. The ref
  // shadows the state so the unmount cleanup reads the take that still exists.
  const abandonRef = useRef<string | null>(null);
  useEffect(() => {
    abandonRef.current = takeUri;
  }, [takeUri]);
  useEffect(
    () => () => {
      const abandoned = abandonRef.current;
      if (abandoned !== null) {
        void discardTake(abandoned);
      }
      void stopClip();
      void stopTakePlayback();
    },
    [],
  );

  useEffect(() => {
    if (toast === null) {
      return;
    }
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (exercise === null) {
    return null;
  }

  const begin = async () => {
    const started = await startTake();
    if (started === 'recording') {
      setPhase('recording');
    } else {
      setToast(MIC_BUSY);
    }
  };

  const requestThenBegin = async () => {
    const granted = (await requestMicPermission()) === 'granted';
    if (granted) {
      await begin();
    } else {
      setMicDenied(true);
    }
  };

  const onRecordPress = async () => {
    if (phase === 'recording') {
      const uri = await stopTake();
      if (uri === null) {
        setPhase('before');
        setToast(MIC_BUSY);
      } else {
        setTakeUri(uri);
        setPhase('compared');
      }
      return;
    }
    const permission = await queryMicPermission();
    if (permission === 'granted') {
      await begin();
      return;
    }
    if (permission === 'denied') {
      setMicDenied(true);
      return;
    }
    // Undetermined: the primer runs once, ever, before the system dialog.
    if (await micPrimerSeen()) {
      await requestThenBegin();
    } else {
      setPrimerOpen(true);
    }
  };

  const discard = () => {
    if (takeUri !== null) {
      void discardTake(takeUri);
      setTakeUri(null);
    }
  };

  const again = () => {
    discard();
    setPhase('before');
  };

  const gotIt = () => {
    discard();
    onCommit({kind: 'continue'});
  };

  if (primerOpen) {
    return (
      <MicPrimer
        onAllow={() => {
          void markMicPrimerSeen();
          setPrimerOpen(false);
          void requestThenBegin();
        }}
        onNotNow={() => {
          void markMicPrimerSeen();
          setPrimerOpen(false);
        }}
      />
    );
  }

  const prompt = englishFirst ? (
    <EnglishPrompt en={target?.en ?? ''} />
  ) : (
    <ModelPrompt target={target} model={model} slowToo={phase !== 'compared'} />
  );

  if (micDenied) {
    // M2: the drill continues without recording, and says where to change it.
    return (
      <View className="gap-5 py-4">
        {entry.ask === 'second-look' ? <Badge tone="neutral">Second look</Badge> : null}
        {prompt}
        <Text className="type-heading text-fg-heading">Say it out loud.</Text>
        <Text className="type-body text-fg-body">
          Listen once more, then say it. Nobody is checking but you.
        </Text>
        <Text className="type-body text-fg-muted text-center">
          Recording is off. You can turn it on in your phone’s Settings.
        </Text>
        <Button onPress={() => onCommit({kind: 'continue'})}>Done</Button>
      </View>
    );
  }

  return (
    <View className="gap-5 py-4">
      {entry.ask === 'second-look' ? <Badge tone="neutral">Second look</Badge> : null}
      {prompt}
      {phase === 'compared' ? (
        <>
          {englishFirst ? <Reveal target={target} /> : null}
          {englishFirst ? null : (
            <Text className="type-body text-fg-muted text-center">Listen to both. You decide.</Text>
          )}
          <View className="gap-2">
            <PlaybackRow
              source="native"
              onPlay={() => {
                if (model !== null) {
                  void playClip(model);
                }
              }}
            />
            <PlaybackRow
              source="you"
              onPlay={() => {
                if (takeUri !== null) {
                  void playTake(takeUri);
                }
              }}
            />
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button variant="ghost" fullWidth onPress={again}>
                Again
              </Button>
            </View>
            <View className="flex-1">
              <Button fullWidth onPress={gotIt}>
                Got it
              </Button>
            </View>
          </View>
        </>
      ) : (
        <>
          <View className="items-center">
            <RecordButton
              state={phase === 'recording' ? 'recording' : 'idle'}
              size="lg"
              onPress={() => void onRecordPress()}
            />
          </View>
          <Text className="type-body text-fg-muted text-center">
            {englishFirst ? 'Say it, then hear how she says it.' : 'Listen, then say it back.'}
          </Text>
          {englishFirst && phase === 'before' ? (
            <Button variant="ghost" onPress={() => onCommit({kind: 'continue'})}>
              Skip this one
            </Button>
          ) : null}
        </>
      )}
      {toast !== null ? <Toast icon="mic">{toast}</Toast> : null}
    </View>
  );
}

type ModelPromptProps = {
  target: Item | undefined;
  model: AudioRef | null;
  /** V9·1 offers the slow pass beside the natural one; the compare drops it. */
  slowToo: boolean;
};

/** V9 / RB13's prompt: the Tibetan, with the model take one tap away. */
function ModelPrompt({target, model, slowToo}: ModelPromptProps) {
  const play = (rate: 'natural' | 'slow') => {
    if (model !== null) {
      void playClip(model, {rate});
    }
  };
  return (
    <View className="items-center gap-4">
      {target !== undefined ? (
        <TibetanText size="xl" align="center" roman={target.roman}>
          {target.bo}
        </TibetanText>
      ) : null}
      <View className="flex-row items-center gap-3">
        <AudioButton size="lg" onPress={() => play('natural')} />
        {slowToo ? <AudioButton size="sm" speed="slow" onPress={() => play('slow')} /> : null}
      </View>
    </View>
  );
}

/** E5's prompt: English only — the Tibetan is not on this screen by design. */
function EnglishPrompt({en}: {en: string}) {
  return (
    <View className="gap-2">
      <Text className="type-label text-fg-muted uppercase">Say</Text>
      <Text className="type-heading text-fg-heading">{`“${en}”`}</Text>
    </View>
  );
}

/** E5's reveal: the Tibetan arrives with the take. */
function Reveal({target}: {target: Item | undefined}) {
  if (target === undefined) {
    return null;
  }
  return (
    <View className="gap-2">
      <Text className="type-label text-fg-accent uppercase">Here it is</Text>
      <TibetanText size="lg" roman={target.roman}>
        {target.bo}
      </TibetanText>
    </View>
  );
}
