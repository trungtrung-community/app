/**
 * @fileoverview The audio gate over the new renderers — growing the allow-list
 * changes nothing today, and surfaces the drills the day takes land. Phases
 * per docs/11.
 */

import {describe, expect, it} from 'vitest';

import type {ContentItemId, ExerciseId, StopId, Track} from '../ports/content-ids';
import type {Exercise, ExerciseFamily} from '../ports/content-exercise';

import {stackAnswers, stackSlotToken, toSeedExercise, type PlanContext} from './exercise-seed';

/** Today's build: no recordings shipped, the audio-free switch off. */
const TODAY: PlanContext = {audioAvailable: false, audioFree: false};

/** The build the shells exist for: recordings shipped, switch off. */
const WITH_AUDIO: PlanContext = {audioAvailable: true, audioFree: false};

type CoreOverrides = {
  readonly blockedOn?: 'audio' | null;
};

function core(id: string, over: CoreOverrides) {
  return {
    id: id as ExerciseId,
    stopId: 'stop.test' as StopId,
    track: 'speak' as Track,
    ordinal: 1,
    family: 'record-compare' as ExerciseFamily,
    target: {id: 'phrase.p' as ContentItemId, kind: 'phrase' as const},
    answerId: 'phrase.p' as ContentItemId,
    blockedOn: over.blockedOn ?? null,
    prompt: {audioPath: null, bo: null, roman: null, en: null},
    distractorRule: null,
    reason: null,
    options: [],
    chunks: [],
  };
}

function phraseProduce(over: CoreOverrides = {}): Exercise {
  return {...core('ex.produce', over), type: 'phrase-produce', note: 'imitative only'};
}

function readItAloud(over: CoreOverrides = {}): Exercise {
  return {
    ...core('ex.aloud', over),
    type: 'read-it-aloud',
    glyph: 'བསྒྲིབས',
    compareWith: 'read/aloud.mp3',
    scored: false,
  };
}

function hearItFindIt(over: CoreOverrides = {}): Exercise {
  return {...core('ex.find', over), type: 'hear-it-find-it'};
}

const GATED: readonly Exercise[] = [phraseProduce(), readItAloud(), hearItFindIt()];

describe('the audio gate over the shell renderers', () => {
  it('hides all three while the build ships no recordings', () => {
    // Then
    // Growing the allow-list changed nothing about today
    for (const exercise of GATED) {
      expect(toSeedExercise(exercise, TODAY, false)).toBeNull();
    }
  });

  it('hides a drill whose own take is missing, whatever the build ships', () => {
    // Then
    // blockedOn is per drill, and audio in the build does not clear it
    for (const exercise of [
      phraseProduce({blockedOn: 'audio'}),
      readItAloud({blockedOn: 'audio'}),
      hearItFindIt({blockedOn: 'audio'}),
    ]) {
      expect(toSeedExercise(exercise, WITH_AUDIO, false)).toBeNull();
    }
  });

  it('hides all three under the audio-free switch, whatever the build ships', () => {
    // Then
    // A1 is the learner's word, and it outranks the manifest
    for (const exercise of GATED) {
      expect(toSeedExercise(exercise, {audioAvailable: true, audioFree: true}, false)).toBeNull();
    }
  });

  it('surfaces each drill as itself the day its take lands', () => {
    // When
    const seeds = GATED.map(exercise => toSeedExercise(exercise, WITH_AUDIO, false));

    // Then
    // The drills emit seed positions under their own presentations
    expect(seeds.map(seed => seed?.presentation)).toEqual([
      'phrase-produce',
      'read-it-aloud',
      'hear-it-find-it',
    ]);
    // Record-compare commits a plain continue; the glyph drill taps.
    expect(seeds.map(seed => seed?.commitMode)).toEqual(['none', 'none', 'tap']);
  });
});

describe('the Read stop-loop forwarding (WS3-C)', () => {
  function readCore(id: string) {
    return {
      ...core(id, {}),
      track: 'read' as Track,
      target: {id: 'stack.test' as ContentItemId, kind: 'stack' as const},
      answerId: null,
    };
  }

  function spotIt(): Exercise {
    return {
      ...readCore('ex.spot'),
      type: 'spot-it',
      question: 'Which mark separates one syllable from the next?',
      glyph: null,
      reason: 'It is the mark between syllables.',
    };
  }

  function findTheRoot(): Exercise {
    return {
      ...readCore('ex.root'),
      type: 'find-the-root',
      glyph: 'ཏྲ',
      answerBo: 'ཏ',
      answerIndex: 0,
      optionKind: 'position',
      reason: 'A syllable with a single letter on the line is all root.',
    };
  }

  function sortWhatChanged(): Exercise {
    return {
      ...readCore('ex.sort'),
      type: 'sort-what-changed',
      question: 'Which of these did the ར change?',
      pairs: [
        {
          id: 'stack.rka' as ContentItemId,
          bo: 'རྐ',
          reading: 'ka',
          bareId: 'letter.ka' as ContentItemId,
          bareBo: 'ཀ',
          bareReading: 'ka',
          changed: false,
        },
        {
          id: 'stack.rga' as ContentItemId,
          bo: 'རྒ',
          reading: 'ga',
          bareId: 'letter.ga' as ContentItemId,
          bareBo: 'ག',
          bareReading: 'khaa',
          changed: true,
        },
      ],
    };
  }

  function whatAttaches(): Exercise {
    return {
      ...readCore('ex.attach'),
      type: 'what-attaches',
      question: 'What can attach to this letter?',
      root: 'ཉ',
      answers: ['prefix:ག', 'superscript:ར', 'subscript:ཝ'],
      multiSelect: true,
      optionKind: 'affix',
    };
  }

  function buildTheStack(): Exercise {
    return {
      ...readCore('ex.build'),
      type: 'build-the-stack',
      glyph: 'ཀྱ',
      reading: 'kya',
      answerSlots: {
        prefix: null,
        superscript: null,
        root: 'ཀ',
        subscript: ['ཡ'],
        vowel: null,
        suffix: null,
        suffix2: null,
      },
      chips: ['ཀ', 'ཁ'],
      superscriptChips: ['ར', 'ལ', 'ས'],
      subscriptChips: ['◌ྱ', '◌ྲ', '◌ླ', '◌ྭ'],
      vowelChips: ['◌ི', '◌ུ', '◌ེ', '◌ོ'],
      syllablesInTray: 1,
      disambiguatedBy: 'glyph',
    };
  }

  it('runs all six silently and carries what each renderer reads', () => {
    // When
    const spot = toSeedExercise(spotIt(), TODAY, false);
    const root = toSeedExercise(findTheRoot(), TODAY, false);
    const sort = toSeedExercise(sortWhatChanged(), TODAY, false);
    const attach = toSeedExercise(whatAttaches(), TODAY, false);
    const build = toSeedExercise(buildTheStack(), TODAY, false);

    // Then
    expect(spot?.presentation).toBe('spot-it');
    expect(spot?.question).toBe('Which mark separates one syllable from the next?');
    expect(spot?.reason).toBe('It is the mark between syllables.');
    expect(root?.presentation).toBe('find-the-root');
    expect(root?.glyph).toBe('ཏྲ');
    expect(sort?.presentation).toBe('sort-what-changed');
    expect(attach?.presentation).toBe('what-attaches');
    expect(attach?.root).toBe('ཉ');
    expect(build?.presentation).toBe('build-the-stack');
    expect(build?.reading).toBe('kya');
    expect(build?.tray).toEqual({
      thirty: ['ཀ', 'ཁ'],
      superscripts: ['ར', 'ལ', 'ས'],
      subscripts: ['◌ྱ', '◌ྲ', '◌ླ', '◌ྭ'],
      vowels: ['◌ི', '◌ུ', '◌ེ', '◌ོ'],
    });
  });

  it('ships find-the-root options as {index, bo} positions in writing order', () => {
    // When
    const seed = toSeedExercise(findTheRoot(), TODAY, false);

    // Then
    expect(seed?.options).toEqual([
      {itemId: '0:ཏ', isAnswer: true},
      {itemId: '1:ྲ', isAnswer: false},
    ]);
  });

  it('answers sort-what-changed with the changed pair ids at plan time', () => {
    // When
    const seed = toSeedExercise(sortWhatChanged(), TODAY, false);

    // Then
    expect(seed?.answers).toEqual(['stack.rga']);
    expect(seed?.pairs).toEqual([
      {itemId: 'stack.rka', bo: 'རྐ', roman: 'ka', bareBo: 'ཀ', bareRoman: 'ka', changed: false},
      {itemId: 'stack.rga', bo: 'རྒ', roman: 'ga', bareBo: 'ག', bareRoman: 'khaa', changed: true},
    ]);
  });

  it('forwards the what-attaches answers as the payload names them', () => {
    // Then
    expect(toSeedExercise(whatAttaches(), TODAY, false)?.answers).toEqual([
      'prefix:ག',
      'superscript:ར',
      'subscript:ཝ',
    ]);
  });

  it('canonicalises build answers: base letters, no carrier, inherent a as absence', () => {
    // When
    const seed = toSeedExercise(buildTheStack(), TODAY, false);

    // Then
    // No vowel token: the untouched vowel row IS the answer (§9.1a)
    expect(seed?.answers).toEqual(['root:ཀ', 'subscript:ཡ']);
    // The chip route and the answer route name one placement identically
    expect(stackSlotToken('subscript', '◌ྱ')).toBe('subscript:ཡ');
    expect(stackSlotToken('subscript', 'ཡ')).toBe('subscript:ཡ');
    expect(stackSlotToken('superscript', 'ས')).toBe('superscript:ས');
    expect(stackSlotToken('vowel', '◌ི')).toBe('vowel:ི');
  });

  it('spells the doubled letters of a full stack as distinct slot tokens', () => {
    // Given
    const slots = {
      prefix: 'བ',
      superscript: 'ས',
      root: 'ག',
      subscript: ['ར'],
      vowel: 'ི',
      suffix: 'བ',
      suffix2: 'ས',
    };

    // Then — བསྒྲིབས: བ and ས each twice, every slot filled once
    expect(stackAnswers(slots)).toEqual([
      'prefix:བ',
      'superscript:ས',
      'root:ག',
      'vowel:ི',
      'suffix:བ',
      'suffix2:ས',
      'subscript:ར',
    ]);
  });
});
