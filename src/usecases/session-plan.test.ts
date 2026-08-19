/**
 * @fileoverview planSession — the stop script becomes a session seed: each drill
 * walks the presentation ladder (audio form, silent sibling, hidden) under the
 * build's audio context, every position kind lands somewhere, and the warm-up
 * and assembly positions keep their exercises. Phases per docs/11. The
 * fixture-wide ladder assertions live in `tests/integration/stop-session.test.ts`,
 * because a use-case test may not import the infra fixture.
 */

import {describe, expect, it} from 'vitest';

import type {ContentItemId, ExerciseId, StopId, Track} from '../ports/content-ids';
import type {Chunk, StopPosition} from '../ports/content-model';
import type {Exercise, ExerciseChunkRef, ExerciseFamily} from '../ports/content-exercise';

import {phraseArrangeOrder, planSession, type PlanContext} from './session-plan';

const STOP = 'stop.test' as StopId;

/** Today's build: no recordings shipped, the audio-free switch off. */
const TODAY: PlanContext = {audioAvailable: false, audioFree: false};

/** The build the ladder exists for: recordings shipped, switch off. */
const WITH_AUDIO: PlanContext = {audioAvailable: true, audioFree: false};

function item(id: string): ContentItemId {
  return id as ContentItemId;
}

type CoreOverrides = {
  readonly target?: string | null;
  readonly targetKind?: 'vocab' | 'phrase';
  readonly blockedOn?: 'audio' | null;
  readonly options?: readonly string[];
  readonly chunks?: readonly ExerciseChunkRef[];
};

function core(id: string, over: CoreOverrides) {
  const target = over.target === undefined ? 'vocab.cha' : over.target;
  const options = over.options ?? (target === null ? [] : [target, 'vocab.other']);
  return {
    id: id as ExerciseId,
    stopId: STOP,
    track: 'speak' as Track,
    ordinal: 1,
    family: 'tap-select (text)' as ExerciseFamily,
    target:
      target === null ? null : {id: item(target), kind: over.targetKind ?? ('vocab' as const)},
    answerId: target === null ? null : item(target),
    blockedOn: over.blockedOn ?? null,
    prompt: {audioPath: null, bo: null, roman: null, en: null},
    distractorRule: null,
    reason: null,
    options: options.map((optionItem, i) => ({
      ordinal: i + 1,
      itemId: item(optionItem),
      label: null,
      isAnswer: i === 0,
    })),
    chunks: over.chunks ?? [],
  };
}

function listenPick(id: string, over: CoreOverrides = {}): Exercise {
  return {...core(id, over), type: 'listen-pick'};
}

function meaningPick(id: string, over: CoreOverrides = {}): Exercise {
  return {...core(id, over), type: 'meaning-pick'};
}

function phraseRecognise(id: string, over: CoreOverrides = {}): Exercise {
  return {...core(id, over), type: 'phrase-recognise'};
}

function phraseArrange(id: string, over: CoreOverrides = {}): Exercise {
  return {...core(id, over), type: 'phrase-arrange'};
}

function pairMatch(id: string, over: CoreOverrides = {}): Exercise {
  return {...core(id, over), type: 'pair-match', board: 1, boards: 1};
}

function phraseProduce(id: string, over: CoreOverrides = {}): Exercise {
  return {...core(id, over), type: 'phrase-produce', note: 'imitative only'};
}

function phraseCloze(id: string, over: CoreOverrides = {}): Exercise {
  return {...core(id, over), type: 'phrase-cloze', blank: 0};
}

function seeItSayIt(id: string, over: CoreOverrides = {}): Exercise {
  return {...core(id, over), type: 'see-it-say-it', glyph: 'ཨེ'};
}

function buildTheStack(id: string, over: CoreOverrides = {}): Exercise {
  return {
    ...core(id, over),
    type: 'build-the-stack',
    glyph: null,
    reading: 'ka',
    answerSlots: {
      prefix: null,
      superscript: null,
      root: 'ཀ',
      subscript: null,
      vowel: null,
      suffix: null,
      suffix2: null,
    },
    chips: [],
    superscriptChips: [],
    subscriptChips: [],
    vowelChips: [],
    syllablesInTray: 1,
    disambiguatedBy: null,
  };
}

function chunkRef(
  phraseId: string,
  ordinal: number,
  role: 'candidate' | 'decoy',
): ExerciseChunkRef {
  const chunk: Chunk = {
    id: `${phraseId}#${ordinal}` as Chunk['id'],
    phraseId: phraseId as Chunk['phraseId'],
    ordinal,
    bo: 'ཇ',
    wylie: 'ja',
    roman: null,
    thl: null,
    gloss: null,
    vocabRef: null,
    copula: false,
    tappable: true,
  };
  return {ordinal, role, chunk};
}

const POSITION = {stopId: STOP, n: 1, screen: null};

function exercisePosition(exerciseId: string): StopPosition {
  return {...POSITION, kind: 'exercise', exerciseId: exerciseId as ExerciseId};
}

function byId(...exercises: readonly Exercise[]): ReadonlyMap<ExerciseId, Exercise> {
  return new Map(exercises.map(exercise => [exercise.id, exercise]));
}

function presentations(seed: ReturnType<typeof planSession>): readonly (string | null)[] {
  return seed.positions.map(p => (p.kind === 'exercise' ? p.exercise.presentation : null));
}

describe('the warm-up and assembly trap', () => {
  it('keeps the exercises that hang off warm-up and assembly positions', () => {
    // Given — exercises sit on these kinds in the full data, not only on 'exercise'
    const warm: StopPosition = {...POSITION, kind: 'warm-up', exerciseId: 'ex.warm' as ExerciseId};
    const asm: StopPosition = {...POSITION, kind: 'assembly', exerciseId: 'ex.asm' as ExerciseId};
    const exercises = byId(meaningPick('ex.warm'), meaningPick('ex.asm'));

    // When
    const seed = planSession([warm, asm], exercises, TODAY);

    // Then
    expect(seed.positions).toEqual([
      expect.objectContaining({
        kind: 'exercise',
        exercise: expect.objectContaining({exerciseId: 'ex.warm', commitMode: 'tap'}),
      }),
      expect.objectContaining({
        kind: 'exercise',
        exercise: expect.objectContaining({exerciseId: 'ex.asm', commitMode: 'tap'}),
      }),
    ]);
  });

  it('flags a warm-up exercise for the S11 chip, and only that one', () => {
    // Given
    const warm: StopPosition = {...POSITION, kind: 'warm-up', exerciseId: 'ex.warm' as ExerciseId};
    const exercises = byId(meaningPick('ex.warm'), meaningPick('ex.plain'));

    // When
    const seed = planSession([warm, exercisePosition('ex.plain')], exercises, TODAY);

    // Then
    const [first, second] = seed.positions;
    expect(first?.kind === 'exercise' ? first.exercise.warmUp : null).toBe(true);
    expect(second?.kind === 'exercise' ? second.exercise.warmUp : null).toBeUndefined();
  });
});

describe('the presentation ladder', () => {
  it('substitutes a blocked listen-pick to its meaning-pick sibling over the same options', () => {
    // Given
    const exercises = byId(listenPick('ex.1', {blockedOn: 'audio'}));

    // When
    const seed = planSession([exercisePosition('ex.1')], exercises, TODAY);

    // Then
    const planned = seed.positions[0];
    expect(planned).toEqual(
      expect.objectContaining({
        kind: 'exercise',
        exercise: expect.objectContaining({
          presentation: 'meaning-pick-substitute',
          exerciseType: 'listen-pick',
          options: [
            {itemId: 'vocab.cha', isAnswer: true},
            {itemId: 'vocab.other', isAnswer: false},
          ],
        }),
      }),
    );
  });

  it('falls an unblocked listen-pick through to the substitute while no player renders it', () => {
    // Given — the regression the ladder fixes: recordings landed, blockedOn null
    const exercises = byId(listenPick('ex.1', {blockedOn: null}));

    // When
    const seed = planSession([exercisePosition('ex.1')], exercises, WITH_AUDIO);

    // Then — the drill does not vanish; the position count holds
    expect(seed.positions).toHaveLength(1);
    expect(presentations(seed)).toEqual(['meaning-pick-substitute']);
  });

  it('runs the silent sibling when the learner flips audio-free, whatever the build ships', () => {
    // When
    const seed = planSession(
      [exercisePosition('ex.1'), exercisePosition('ex.2')],
      byId(listenPick('ex.1', {blockedOn: null}), phraseRecognise('ex.2', {blockedOn: null})),
      {audioAvailable: true, audioFree: true},
    );

    // Then
    expect(presentations(seed)).toEqual(['meaning-pick-substitute', 'phrase-recognise-script']);
  });

  it('substitutes a blocked phrase-recognise to the script-prompted variant', () => {
    // When
    const seed = planSession(
      [exercisePosition('ex.1')],
      byId(phraseRecognise('ex.1', {blockedOn: 'audio'})),
      TODAY,
    );

    // Then
    expect(seed.positions[0]).toEqual(
      expect.objectContaining({
        kind: 'exercise',
        exercise: expect.objectContaining({presentation: 'phrase-recognise-script'}),
      }),
    );
  });

  it('leaves the already-silent drills alone, whatever the audio context', () => {
    // When
    const seed = planSession(
      [exercisePosition('ex.1'), exercisePosition('ex.2')],
      byId(meaningPick('ex.1', {blockedOn: 'audio'}), pairMatch('ex.2', {blockedOn: 'audio'})),
      TODAY,
    );
    const withAudio = planSession(
      [exercisePosition('ex.1'), exercisePosition('ex.2')],
      byId(meaningPick('ex.1'), pairMatch('ex.2')),
      WITH_AUDIO,
    );

    // Then
    expect(presentations(seed)).toEqual(['meaning-pick', 'pair-match']);
    expect(presentations(withAudio)).toEqual(['meaning-pick', 'pair-match']);
  });

  it('hides the siblingless audio drills in every context, and the bar never counts them', () => {
    // Given — the prompt IS the audio (or the answer is spoken); nothing substitutes
    const exercises = byId(
      phraseCloze('ex.1', {blockedOn: 'audio'}),
      phraseProduce('ex.2', {blockedOn: 'audio'}),
      meaningPick('ex.4'),
    );
    const script = ['ex.1', 'ex.2', 'ex.4'].map(exercisePosition);

    // When
    const today = planSession(script, exercises, TODAY);
    const withAudio = planSession(script, exercises, WITH_AUDIO);

    // Then
    expect(presentations(today)).toEqual(['meaning-pick']);
    expect(presentations(withAudio)).toEqual(['meaning-pick']);
  });

  it('runs build-the-stack without a take: the frame writes its prompt on screen', () => {
    // Given
    const exercises = byId(buildTheStack('ex.1', {blockedOn: null}));

    // When
    const seed = planSession([exercisePosition('ex.1')], exercises, TODAY);

    // Then — RB12's "It sounds like drip." line is text, so no gate applies
    expect(presentations(seed)).toEqual(['build-the-stack']);
  });

  it('renders see-it-say-it as itself: a tap over four sounds, per the RB7 dossier', () => {
    // When
    const seed = planSession([exercisePosition('ex.1')], byId(seeItSayIt('ex.1')), TODAY);

    // Then — "the answer is a tap — the mic is RB13's job"
    expect(seed.positions[0]).toEqual(
      expect.objectContaining({
        kind: 'exercise',
        exercise: expect.objectContaining({presentation: 'see-it-say-it', commitMode: 'tap'}),
      }),
    );
  });
});

describe('the phrase-arrange exclusion', () => {
  it('hides phrase-arrange in every context while REVIEW-2 stands', () => {
    // Given — even the friendliest context: audio shipped, nothing blocked
    const exercises = byId(phraseArrange('ex.1', {blockedOn: null}));

    // When
    const today = planSession([exercisePosition('ex.1')], exercises, TODAY);
    const withAudio = planSession([exercisePosition('ex.1')], exercises, WITH_AUDIO);

    // Then — 178 chunk boundaries are unconfirmed; nothing may drill them
    expect(today.positions).toHaveLength(0);
    expect(withAudio.positions).toHaveLength(0);
  });
});

describe('the arrange answer order', () => {
  it('orders the target phrase chunks by their own ordinal and drops the decoys', () => {
    // Given — answer chunks arriving scrambled among decoys
    const exercise = phraseArrange('ex.1', {
      target: 'phrase.p',
      targetKind: 'phrase',
      options: [],
      chunks: [
        chunkRef('phrase.other', 0, 'decoy'),
        chunkRef('phrase.p', 2, 'candidate'),
        chunkRef('phrase.p', 0, 'candidate'),
        chunkRef('phrase.p', 1, 'candidate'),
      ],
    });

    // When
    const ordered = phraseArrangeOrder(exercise);

    // Then
    expect(ordered).toEqual(['phrase.p#0', 'phrase.p#1', 'phrase.p#2']);
  });

  it('stays undefined while the content ships no answer chunks', () => {
    // Given — today's rows: decoys only
    const exercise = phraseArrange('ex.1', {
      target: 'phrase.p',
      targetKind: 'phrase',
      options: [],
      chunks: [chunkRef('phrase.other', 0, 'decoy')],
    });

    // Then — an empty sequence would commit an empty tray as correct
    expect(phraseArrangeOrder(exercise)).toBeUndefined();
  });
});

describe('the other position kinds', () => {
  it('maps every card-like and note-like kind to its seed shape', () => {
    // Given
    const positions: StopPosition[] = [
      {...POSITION, kind: 'intro', text: 'Hello', outcome: 'Greet', capabilities: ['Greet']},
      {...POSITION, kind: 'word-card', itemId: item('vocab.cha') as never},
      {...POSITION, kind: 'phrase-card', itemId: item('phrase.hello') as never},
      {...POSITION, kind: 'letter-card', itemId: item('letter.ka')},
      {...POSITION, kind: 'stack-card', itemId: item('stack.rka')},
      {...POSITION, kind: 'rule-card', ruleId: 'rule.deasp' as never, text: 'De-aspirate'},
      {
        ...POSITION,
        kind: 'rule-statement',
        ruleId: 'rule.deasp' as never,
        text: 'Rule',
        wantsACard: false,
      },
      {...POSITION, kind: 'rule-reprise', ruleId: 'rule.deasp' as never, text: 'Again'},
      {...POSITION, kind: 'tip', text: 'A tip', covers: [], preview: null},
      {...POSITION, kind: 'moment'},
      {...POSITION, kind: 'end', capabilities: ['Greet'], recap: null},
    ];

    // When
    const seed = planSession(positions, byId(), TODAY);

    // Then
    expect(seed.positions.map(p => p.kind)).toEqual([
      'intro',
      'card',
      'card',
      'card',
      'card',
      'note',
      'note',
      'note',
      'note',
      'moment',
      'end',
    ]);
    expect(seed.positions[1]).toEqual({kind: 'card', card: 'word', itemId: 'vocab.cha'});

    // Then — each note keeps its register: RS1, RR1, the C-card and a tip
    // are four surfaces, not one paragraph
    expect(seed.positions.slice(5, 9)).toEqual([
      {kind: 'note', note: 'rule-card', text: 'De-aspirate'},
      {kind: 'note', note: 'rule-statement', text: 'Rule'},
      {kind: 'note', note: 'rule-reprise', text: 'Again'},
      {kind: 'note', note: 'tip', text: 'A tip'},
    ]);
  });

  it('forwards the R11 recap onto the end position, in the engine vocabulary', () => {
    // Given
    const pair = {
      id: item('stack.rga'),
      bo: 'རྒ',
      reading: 'ga',
      bareId: item('letter.ga'),
      bareBo: 'ག',
      bareReading: 'khaa',
      changed: true,
    };
    const positions: StopPosition[] = [
      {...POSITION, kind: 'end', capabilities: ['Read'], recap: [pair]},
    ];

    // When
    const seed = planSession(positions, byId(), TODAY);

    // Then
    expect(seed.positions[0]).toEqual({
      kind: 'end',
      capabilities: ['Read'],
      recap: [
        {
          itemId: 'stack.rga',
          bo: 'རྒ',
          roman: 'ga',
          bareBo: 'ག',
          bareRoman: 'khaa',
          changed: true,
        },
      ],
    });
  });

  it('lifts an artifact card into the seed instead of the queue, off the bar count', () => {
    // Given — the fixture places the artifact card after `end`
    const positions: StopPosition[] = [
      {...POSITION, kind: 'word-card', itemId: item('vocab.cha') as never},
      {...POSITION, kind: 'end', capabilities: ['Greet'], recap: null},
      {...POSITION, kind: 'card', itemId: item('vocab.churn')},
    ];

    // When
    const seed = planSession(positions, byId(), TODAY);

    // Then
    expect(seed.artifacts).toEqual(['vocab.churn']);
    expect(seed.positions.map(p => p.kind)).toEqual(['card', 'end']);
  });
});

describe('commit modes', () => {
  it('decides how each planned drill commits, once', () => {
    // Given
    const exercises = byId(meaningPick('ex.pick'), pairMatch('ex.pairs'), seeItSayIt('ex.say'));

    // When
    const seed = planSession(
      ['ex.pick', 'ex.pairs', 'ex.say'].map(exercisePosition),
      exercises,
      TODAY,
    );

    // Then — see-it-say-it taps per docs/03 §1; the mic is RB13's job
    const modes = seed.positions.map(p => (p.kind === 'exercise' ? p.exercise.commitMode : null));
    expect(modes).toEqual(['tap', 'pairs', 'tap']);
  });
});

describe('the re-queue pool', () => {
  it('groups the runnable tap drills by target item', () => {
    // Given
    const exercises = byId(
      meaningPick('ex.1', {target: 'vocab.cha'}),
      listenPick('ex.2', {target: 'vocab.cha', blockedOn: 'audio'}),
      meaningPick('ex.3', {target: 'vocab.ja'}),
      pairMatch('ex.4', {target: 'vocab.cha'}),
    );

    // When
    const seed = planSession(
      ['ex.1', 'ex.2', 'ex.3', 'ex.4'].map(exercisePosition),
      exercises,
      TODAY,
    );

    // Then — pairs boards do not stand in for a missed recognition drill
    expect(Object.keys(seed.poolByItem).sort()).toEqual(['vocab.cha', 'vocab.ja']);
    expect(seed.poolByItem['vocab.cha']?.map(e => e.exerciseId)).toEqual(['ex.1', 'ex.2']);
  });
});
