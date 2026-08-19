/**
 * @fileoverview The ceremony ladder — district, first walk, both walks, with the
 * larger moment always winning. The double is the one narrow capability, as in
 * drill-pool.test.ts. Phases per docs/11.
 */

import {describe, expect, it} from 'vitest';

import type {DistrictId, SectionId, StopId} from '../ports/content-ids';
import type {District, Stop} from '../ports/content-model';
import type {Progress} from '../ports/progress-store';

import {afterStop, type StopCeremonyDeps} from './stop-ceremony';

const SECTION_ID = 'section.speak.1' as SectionId;
const READ_SECTION_ID = 'section.read.1' as SectionId;

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

function stop(id: string, district: string, circuit: number): Stop {
  return {
    id: id as StopId,
    track: 'speak',
    district,
    sectionId: SECTION_ID,
    ordinal: 1,
    circuit,
    node: null,
    shape: 'items',
    name: id,
    outcome: '',
    capabilities: [],
    positionCount: 0,
    complete: true,
    items: [],
  };
}

function readStop(id: string): Stop {
  return {
    ...stop(id, 'unused', 1),
    track: 'read',
    district: null,
    circuit: null,
    sectionId: READ_SECTION_ID,
  };
}

const DISTRICTS: readonly District[] = [
  {
    id: 'district.core' as DistrictId,
    number: 1,
    slug: 'core',
    name: 'First Words',
    sectionId: SECTION_ID,
  },
  {
    id: 'district.meeting' as DistrictId,
    number: 2,
    slug: 'meeting',
    name: 'Meeting People',
    sectionId: SECTION_ID,
  },
];

const STOPS: readonly Stop[] = [
  stop('stop.core.c1.1', 'core', 1),
  stop('stop.core.c1.2', 'core', 1),
  stop('stop.core.c2.1', 'core', 2),
  stop('stop.meeting.c1.1', 'meeting', 1),
  stop('stop.meeting.c1.2', 'meeting', 1),
  stop('stop.meeting.c2.1', 'meeting', 2),
];

const FIRST_WALK = STOPS.filter(candidate => candidate.circuit === 1).map(
  candidate => candidate.id as string,
);

function deps(): StopCeremonyDeps {
  return {
    walk: {
      listSections: async () => [],
      listDistricts: async () => DISTRICTS,
      getDistrict: async slug => {
        throw new Error(`unused: ${slug}`);
      },
      getStop: async id => {
        throw new Error(`unused: ${id}`);
      },
      listStopsByDistrict: async district =>
        STOPS.filter(candidate => candidate.district === district),
      listStopsBySection: async () => [],
      getStopScript: async () => {
        throw new Error('unused');
      },
    },
  };
}

function progressWith(completedStops: readonly string[]): Progress {
  return {...EMPTY, completedStops};
}

describe('afterStop', () => {
  it('finishes the district when its last circuit-one stop completes', async () => {
    // Given
    const progress = progressWith(['stop.meeting.c1.1', 'stop.meeting.c1.2']);

    // When
    const ceremony = await afterStop(deps(), progress, STOPS[4] as Stop);

    // Then
    expect(ceremony).toEqual({kind: 'district-finished', slug: 'meeting', circuit: 1});
  });

  it('completes the first walk over a finished district when every circuit-one stop is done', async () => {
    // Given
    const progress = progressWith(FIRST_WALK);

    // When
    const ceremony = await afterStop(deps(), progress, STOPS[4] as Stop);

    // Then
    expect(ceremony).toEqual({kind: 'first-walk-complete'});
  });

  it('completes both walks over everything smaller when every stop of every circuit is done', async () => {
    // Given
    const progress = progressWith(STOPS.map(candidate => candidate.id as string));

    // When
    const ceremony = await afterStop(deps(), progress, STOPS[5] as Stop);

    // Then
    expect(ceremony).toEqual({kind: 'both-walks-complete'});
  });

  it('earns nothing mid-district', async () => {
    // Given
    const progress = progressWith(['stop.meeting.c1.1']);

    // When
    const ceremony = await afterStop(deps(), progress, STOPS[3] as Stop);

    // Then
    expect(ceremony).toEqual({kind: 'none'});
  });

  it('earns nothing after a Read stop', async () => {
    // Given
    const progress = progressWith(FIRST_WALK);

    // When
    const ceremony = await afterStop(deps(), progress, readStop('stop.1.1'));

    // Then
    expect(ceremony).toEqual({kind: 'none'});
  });
});
