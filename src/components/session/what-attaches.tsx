/**
 * @fileoverview WhatAttaches — everything that can join a root (RB10).
 *
 * A multi-select over the twelve affixes: five prefixes, three superscripts,
 * four subscripts (read spec §3.2). The offered set is the system itself and
 * is constant — the exercise ships no option rows, only the correct set as
 * `slot:letter` answers — so the twelve are stated here once, with the board's
 * own group labels. A subjoined form is drawn on its ◌ carrier and named by
 * the base letter it writes, which is how the answers name it too.
 *
 * Partial state is RB10·½: right picks fill and stay, wrong picks return, and
 * the band names how many are still missing — never a tally of what was found.
 */

import {useState} from 'react';
import {Text, View} from 'react-native';

import {Badge} from '../core/badge';
import {SyllableChip, type SyllableChipTone} from '../learning/syllable-chip';
import {TibetanText} from '../learning/tibetan-text';
import type {CommitInput} from '../../usecases/submit-answer';
import {CheckBar} from './check-bar';
import type {SessionAnswered, SessionEntry} from './types';

type AffixChip = {
  /** The engine token, `slot:letter` — the base letter, as the answers name it. */
  readonly token: string;
  /** What the chip draws — the subjoined form rides its ◌ carrier. */
  readonly glyph: string;
};

type AffixGroup = {readonly label: string; readonly chips: readonly AffixChip[]};

function chips(slot: string, letters: readonly (readonly [string, string])[]): AffixChip[] {
  return letters.map(([letter, glyph]) => ({token: `${slot}:${letter}`, glyph}));
}

/**
 * The twelve affixes, grouped as the board groups them. Fixed by the writing
 * system (read spec §3.2), not by any one exercise.
 */
const AFFIX_GROUPS: readonly AffixGroup[] = [
  {
    label: 'Prefixes · in front',
    chips: chips('prefix', [
      ['ག', 'ག'],
      ['ད', 'ད'],
      ['བ', 'བ'],
      ['མ', 'མ'],
      ['འ', 'འ'],
    ]),
  },
  {
    label: 'Superscripts · on top',
    chips: chips('superscript', [
      ['ར', 'ར'],
      ['ལ', 'ལ'],
      ['ས', 'ས'],
    ]),
  },
  {
    label: 'Subscripts · underneath',
    chips: chips('subscript', [
      ['ཡ', '◌ྱ'],
      ['ར', '◌ྲ'],
      ['ལ', '◌ླ'],
      ['ཝ', '◌ྭ'],
    ]),
  },
];

export type WhatAttachesProps = {
  entry: SessionEntry;
  answered: SessionAnswered;
  /** The engine's kept picks — `state.filled`. */
  filled: readonly string[];
  onCommit: (input: CommitInput) => void;
};

/** The what-attaches entry of a stop session. */
export function WhatAttaches({entry, answered, filled, onCommit}: WhatAttachesProps) {
  const [picked, setPicked] = useState<readonly string[]>([]);
  const [attempted, setAttempted] = useState(false);

  // The engine answered an incomplete Check: right picks stay, wrong picks
  // return. Adjusting state during render is the documented pattern.
  const [seenFilled, setSeenFilled] = useState(filled);
  if (seenFilled !== filled) {
    setSeenFilled(filled);
    if (attempted) {
      setPicked(filled);
    }
  }

  if (entry.position.kind !== 'exercise') {
    return null;
  }
  const exercise = entry.position.exercise;
  const answers = exercise.answers ?? [];

  const toggle = (token: string) => {
    setPicked(current =>
      current.includes(token) ? current.filter(t => t !== token) : [...current, token],
    );
  };

  const chipTone = (token: string): SyllableChipTone => {
    if (answered !== null) {
      return answers.includes(token) ? 'correct' : 'idle';
    }
    return picked.includes(token) ? 'selected' : 'idle';
  };

  return (
    <View className="gap-5 py-4">
      {entry.ask === 'second-look' ? <Badge tone="neutral">Second look</Badge> : null}
      <Text className="type-heading text-fg-heading text-center">
        {exercise.question ?? 'What can attach to this letter?'}
      </Text>
      <Text className="type-body text-fg-muted text-center">
        Pick everything. There may be more than one of each kind.
      </Text>
      {exercise.root !== undefined ? (
        <TibetanText size="xl" align="center">
          {exercise.root}
        </TibetanText>
      ) : null}
      {AFFIX_GROUPS.map(group => (
        <View key={group.label} className="gap-2">
          <Text className="type-label uppercase text-fg-subtle">{group.label}</Text>
          <View className="flex-row flex-wrap gap-2">
            {group.chips.map(chip => (
              <SyllableChip
                key={chip.token}
                glyph={chip.glyph}
                tone={chipTone(chip.token)}
                onPress={answered === null ? () => toggle(chip.token) : undefined}
              />
            ))}
          </View>
        </View>
      ))}
      {answered === null ? (
        <CheckBar
          picked={picked}
          filled={filled}
          answers={answers}
          attempted={attempted}
          onCommit={input => {
            setAttempted(true);
            onCommit(input);
          }}
        />
      ) : null}
    </View>
  );
}
