/**
 * @fileoverview planSession — the stop script becomes a session seed: audio-blocked
 * drills substitute or hide per docs/03 §7, every position kind lands somewhere,
 * and the warm-up/assembly positions keep their exercises. Phases per docs/11.
 */

import {describe, expect, it} from 'vitest';

import type {ContentItemId, ExerciseId, StopId, Track} from '../ports/content-ids';
import type {Exercise, ExerciseFamily} from '../ports/content-exercise';
import type {StopPosition} from '../ports/content-model';

import {planSession} from './session-plan';

const STOP = 'stop.test' as StopId;

function item(id: string): ContentItemId {
  return id as ContentItemId;
}

type CoreOverrides = {
  readonly target?: string | null;
  readonly blockedOn?: 'audio' | null;
  readonly options?: readonly string[];
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
    target: target === null ? null : {id: item(target), kind: 'vocab' as const},
    answerId: target === null ? null : item(target),
    blockedOn: over.blockedOn ?? null,
    prompt: {audioPath: null, bo: null, roman: null, en: null},
    distractorRule: null,
    reason: null,
    options: options.map((optionItem, i) => ({
      itemId: item(optionItem),
      label: null,
      isAnswer: i === 0,
    })),
    chunks: [],
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

const POSITION = {stopId: STOP, n: 1, screen: null};

function exercisePosition(exerciseId: string): StopPosition {
  return {...POSITION, kind: 'exercise', exerciseId: exerciseId as ExerciseId};
}

function byId(...exercises: readonly Exercise[]): ReadonlyMap<ExerciseId, Exercise> {
  return new Map(exercises.map(exercise => [exercise.id, exercise]));
}

describe('the warm-up and assembly trap', () => {
  it('keeps the exercises that hang off warm-up and assembly positions', () => {
    // Given — 17 Read exercises sit on these kinds in the full data, not on 'exercise'
    const warm: StopPosition = {...POSITION, kind: 'warm-up', exerciseId: 'ex.warm' as ExerciseId};
    const asm: StopPosition = {...POSITION, kind: 'assembly', exerciseId: 'ex.asm' as ExerciseId};
    const exercises = byId(meaningPick('ex.warm'), buildTheStack('ex.asm'));

    // When
    const seed = planSession([warm, asm], exercises);

    // Then
    expect(seed.positions).toEqual([
      expect.objectContaining({
        kind: 'exercise',
        exercise: expect.objectContaining({exerciseId: 'ex.warm', commitMode: 'tap'}),
      }),
      expect.objectContaining({
        kind: 'exercise',
        exercise: expect.objectContaining({exerciseId: 'ex.asm', commitMode: 'check'}),
      }),
    ]);
  });
});

describe('the audio gate', () => {
  it('substitutes a blocked listen-pick to its meaning-pick sibling over the same options', () => {
    // Given
    const exercises = byId(listenPick('ex.1', {blockedOn: 'audio'}));

    // When
    const seed = planSession([exercisePosition('ex.1')], exercises);

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

  it('leaves an unblocked listen-pick audible', () => {
    // When
    const seed = planSession([exercisePosition('ex.1')], byId(listenPick('ex.1')));

    // Then
    expect(seed.positions[0]).toEqual(
      expect.objectContaining({
        kind: 'exercise',
        exercise: expect.objectContaining({presentation: 'listen-pick'}),
      }),
    );
  });

  it('substitutes a blocked phrase-recognise to the script-prompted variant', () => {
    // When
    const seed = planSession(
      [exercisePosition('ex.1')],
      byId(phraseRecognise('ex.1', {blockedOn: 'audio'})),
    );

    // Then
    expect(seed.positions[0]).toEqual(
      expect.objectContaining({
        kind: 'exercise',
        exercise: expect.objectContaining({presentation: 'phrase-recognise-script'}),
      }),
    );
  });

  it('leaves the already-silent drills alone', () => {
    // When
    const seed = planSession(
      [exercisePosition('ex.1'), exercisePosition('ex.2')],
      byId(meaningPick('ex.1', {blockedOn: 'audio'}), pairMatch('ex.2', {blockedOn: 'audio'})),
    );

    // Then
    expect(seed.positions.map(p => (p.kind === 'exercise' ? p.exercise.presentation : null))).toEqual([
      'meaning-pick',
      'pair-match',
    ]);
  });

  it('hides what cannot run without a take, and the bar never counts it', () => {
    // Given — the prompt IS the audio for these; nothing can substitute
    const exercises = byId(
      phraseArrange('ex.1', {blockedOn: 'audio'}),
      phraseCloze('ex.2', {blockedOn: 'audio'}),
      phraseProduce('ex.3', {blockedOn: 'audio'}),
      meaningPick('ex.4'),
    );

    // When
    const seed = planSession(
      ['ex.1', 'ex.2', 'ex.3', 'ex.4'].map(exercisePosition),
      exercises,
    );

    // Then
    expect(seed.positions).toHaveLength(1);
    expect(seed.positions[0]).toEqual(
      expect.objectContaining({
        kind: 'exercise',
        exercise: expect.objectContaining({exerciseId: 'ex.4'}),
      }),
    );
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
      {...POSITION, kind: 'rule-statement', ruleId: 'rule.deasp' as never, text: 'Rule', wantsACard: false},
      {...POSITION, kind: 'rule-reprise', ruleId: 'rule.deasp' as never, text: 'Again'},
      {...POSITION, kind: 'tip', text: 'A tip', covers: [], preview: null},
      {...POSITION, kind: 'moment'},
      {...POSITION, kind: 'card', itemId: item('vocab.churn')},
      {...POSITION, kind: 'end', capabilities: ['Greet'], recap: null},
    ];

    // When
    const seed = planSession(positions, byId());

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
      'card',
      'end',
    ]);
    expect(seed.positions[1]).toEqual({kind: 'card', card: 'word', itemId: 'vocab.cha'});
    expect(seed.positions[10]).toEqual({kind: 'card', card: 'artifact', itemId: 'vocab.churn'});
  });
});

describe('commit modes', () => {
  it('decides how each type commits, once', () => {
    // Given
    const exercises = byId(
      phraseCloze('ex.cloze'),
      buildTheStack('ex.stack'),
      pairMatch('ex.pairs'),
      phraseProduce('ex.produce'),
    );

    // When
    const seed = planSession(
      ['ex.cloze', 'ex.stack', 'ex.pairs', 'ex.produce'].map(exercisePosition),
      exercises,
    );

    // Then
    const modes = seed.positions.map(p => (p.kind === 'exercise' ? p.exercise.commitMode : null));
    expect(modes).toEqual(['tap', 'check', 'pairs', 'none']);
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
    );

    // Then — pairs boards do not stand in for a missed recognition drill
    expect(Object.keys(seed.poolByItem).sort()).toEqual(['vocab.cha', 'vocab.ja']);
    expect(seed.poolByItem['vocab.cha']?.map(e => e.exerciseId)).toEqual(['ex.1', 'ex.2']);
  });
});
