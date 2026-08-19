/**
 * @fileoverview BuildTheStack — spell the syllable from the whole system (RB12).
 *
 * §9.1a, signed 2026-08-15, every clause: the tray is the whole writing
 * system and identical on every assembly — the thirty in grid order, then
 * ར ལ ས on top, the four subjoined forms on their ◌ carrier, the four vowel
 * marks on ◌ — four fixed rows, never shuffled. A chip is a letter, not a
 * token: placing it never consumes it, and it may be placed as many times as
 * the answer needs. An untouched vowel row is an answer — no mark is the
 * inherent a. One syllable, always.
 *
 * The learner taps a slot, then the chip that goes there; a filled slot taps
 * clear. Placements travel to the engine as the canonical `slot:value`
 * tokens `stackSlotToken` builds — the same function the planner used for the
 * answers, so the two cannot disagree. A failed Check is RB12·✗'s register: a
 * placement error, never a wrong answer — the sentence says where the letter
 * belongs, and everything placed correctly stays put.
 *
 * The frame scrolls with the stop screen; the Check bar sits at the foot of
 * the frame rather than pinned over it — the route owns the one pinned band.
 */

import {useState} from 'react';
import {Pressable, Text, View, type TextStyle, type ViewStyle} from 'react-native';

import {Badge} from '../core/badge';
import {SyllableChip} from '../learning/syllable-chip';
import {TibetanText} from '../learning/tibetan-text';
import {color, radius, space} from '../../theme/tokens.generated';
import type {StackSlots} from '../../ports/content-exercise';
import {stackSlotToken} from '../../usecases/exercise-seed';
import type {CommitInput} from '../../usecases/submit-answer';
import {CheckBar} from './check-bar';
import type {SessionAnswered, SessionEntry} from './types';

type SlotName = keyof StackSlots;

/** The seven slots in written order, labelled as StackDiagram labels them. */
const SLOTS: readonly {readonly slot: SlotName; readonly label: string}[] = [
  {slot: 'prefix', label: 'Prefix'},
  {slot: 'superscript', label: 'Superscript'},
  {slot: 'root', label: 'Root'},
  {slot: 'subscript', label: 'Subscript'},
  {slot: 'vowel', label: 'Vowel'},
  {slot: 'suffix', label: 'Suffix'},
  {slot: 'suffix2', label: 'Second suffix'},
];

/** How the partial sentence names each slot. */
const SLOT_NAMES: Record<SlotName, string> = {
  prefix: 'prefix',
  superscript: 'superscript',
  root: 'root',
  subscript: 'subscript',
  vowel: 'vowel mark',
  suffix: 'suffix',
  suffix2: 'second suffix',
};

/** Where a letter belongs, said against the root — RB12·✗'s register. */
function belongsPhrase(slot: SlotName, root: string): string {
  switch (slot) {
    case 'prefix':
      return `in front of the ${root}`;
    case 'superscript':
      return `on top of the ${root}`;
    case 'subscript':
      return `under the ${root}`;
    case 'vowel':
      return 'on the vowel row';
    case 'suffix':
      return `after the ${root}`;
    case 'suffix2':
      return 'at the very end';
    default:
      return 'on the line, as the root';
  }
}

/** The same places, second mention — "not in front of it". */
function wrongPlacePhrase(slot: SlotName): string {
  switch (slot) {
    case 'prefix':
      return 'in front of it';
    case 'superscript':
      return 'on top of it';
    case 'subscript':
      return 'under it';
    case 'vowel':
      return 'on the vowel row';
    case 'suffix':
      return 'after it';
    case 'suffix2':
      return 'at the very end';
    default:
      return 'as the root';
  }
}

/** The letter a token names, after the `slot:` prefix. */
function tokenValue(token: string): string {
  return token.slice(token.indexOf(':') + 1);
}

function tokenSlot(token: string): SlotName {
  return token.slice(0, token.indexOf(':')) as SlotName;
}

/**
 * The RB12·✗ sentence for an incomplete Check, or null to fall back to the
 * CheckBar's own missing count. A placement error is named as one — the
 * learner chose the right letter — and a chip that belongs nowhere goes back
 * the way RB10·½ sends one back. What is still missing is named by slot,
 * never counted against what was found.
 */
export function buildPartialMessage(
  checked: readonly string[],
  answers: readonly string[],
): string | null {
  const root = tokenValue(answers.find(token => tokenSlot(token) === 'root') ?? ':the root');
  const parts: string[] = [];

  const misplaced = checked.find(token => {
    if (answers.includes(token)) {
      return false;
    }
    const value = tokenValue(token);
    return answers.some(
      answer =>
        tokenValue(answer) === value &&
        tokenSlot(answer) !== tokenSlot(token) &&
        !checked.includes(answer),
    );
  });

  if (misplaced !== undefined) {
    const value = tokenValue(misplaced);
    const home = answers.find(answer => tokenValue(answer) === value && !checked.includes(answer));
    if (home !== undefined) {
      const rest = checked.filter(token => token !== misplaced);
      const onlyProblem =
        rest.every(token => answers.includes(token)) &&
        answers.every(answer => answer === home || checked.includes(answer));
      const sentence = `${value} belongs ${belongsPhrase(tokenSlot(home), root)} here, not ${wrongPlacePhrase(tokenSlot(misplaced))}.`;
      parts.push(onlyProblem ? `${sentence} The rest is right.` : sentence);
    }
  } else {
    const stray = checked.find(token => !answers.includes(token));
    if (stray !== undefined) {
      parts.push(`${tokenValue(stray)} went back — it is not part of this syllable.`);
    }
    const missing = answers.filter(answer => !checked.includes(answer));
    if (missing.length > 0) {
      const names = missing.map(answer => SLOT_NAMES[tokenSlot(answer)]);
      const list =
        names.length === 1
          ? names[0]
          : `${names.slice(0, -1).join(', the ')} and the ${names[names.length - 1]}`;
      const verb = names.length === 1 ? 'is' : 'are';
      parts.push(`The ${list} ${verb} still missing.`);
    }
  }

  return parts.length > 0 ? parts.join(' ') : null;
}

export type BuildTheStackProps = {
  entry: SessionEntry;
  answered: SessionAnswered;
  /** The engine's kept placements — `state.filled`. */
  filled: readonly string[];
  onCommit: (input: CommitInput) => void;
};

type Placed = Partial<Record<SlotName, string>>;

/** The build-the-stack entry of a stop session. */
export function BuildTheStack({entry, answered, filled, onCommit}: BuildTheStackProps) {
  const [placed, setPlaced] = useState<Placed>({});
  const [activeSlot, setActiveSlot] = useState<SlotName | null>(null);
  const [lastChecked, setLastChecked] = useState<readonly string[] | null>(null);

  // The engine answered an incomplete Check: placements it kept stay put,
  // the rest return to the tray. Adjusting state during render is the
  // documented pattern for reacting to a changed prop.
  const [seenFilled, setSeenFilled] = useState(filled);
  if (seenFilled !== filled) {
    setSeenFilled(filled);
    if (lastChecked !== null) {
      setPlaced(current => {
        const kept: Placed = {};
        for (const {slot} of SLOTS) {
          const glyph = current[slot];
          if (glyph !== undefined && filled.includes(stackSlotToken(slot, glyph))) {
            kept[slot] = glyph;
          }
        }
        return kept;
      });
    }
  }

  if (entry.position.kind !== 'exercise') {
    return null;
  }
  const exercise = entry.position.exercise;
  const answers = exercise.answers ?? [];
  const tray = exercise.tray;
  const reading = exercise.reading ?? '';

  const tokens = SLOTS.flatMap(({slot}) => {
    const glyph = placed[slot];
    return glyph === undefined ? [] : [stackSlotToken(slot, glyph)];
  });

  const place = (chip: string) => {
    if (activeSlot === null) {
      return;
    }
    // The chip stays in the tray — a placement copies the letter, never
    // spends it (§9.1a: no chip is consumed by being placed).
    setPlaced(current => ({...current, [activeSlot]: chip}));
    setActiveSlot(null);
  };

  const rows: readonly {readonly label: string; readonly chips: readonly string[]}[] =
    tray === undefined
      ? []
      : [
          {label: 'The thirty', chips: tray.thirty},
          {label: 'On top', chips: tray.superscripts},
          {label: 'Underneath', chips: tray.subscripts},
          // The empty row is a legal and common answer — the inherent a.
          {label: 'Vowel · no mark means a', chips: tray.vowels},
        ];

  return (
    <View className="gap-5 py-4">
      {entry.ask === 'second-look' ? <Badge tone="neutral">Second look</Badge> : null}
      <Text className="type-heading text-fg-heading text-center">Build the syllable.</Text>
      {exercise.glyph !== undefined ? (
        <View className="items-center gap-2">
          <TibetanText size="lg" align="center">
            {exercise.glyph}
          </TibetanText>
          <Text className="type-body text-fg-muted text-center">
            {`Sounds like ${reading} — the glyph shows you which spelling.`}
          </Text>
        </View>
      ) : (
        <Text className="type-body text-fg-body text-center">{`It sounds like ${reading}.`}</Text>
      )}
      <Text className="type-caption text-fg-muted text-center">
        Tap a slot, then the chip that goes there. A chip stays in the tray after you place it.
      </Text>
      <View className="flex-row flex-wrap justify-center" style={SLOT_ROW}>
        {SLOTS.map(({slot, label}) => {
          const glyph = placed[slot];
          return (
            <View key={slot} className="items-center" style={SLOT_CELL}>
              {glyph !== undefined ? (
                <SyllableChip
                  glyph={glyph}
                  size="sm"
                  tone={answered !== null ? 'correct' : 'selected'}
                  onPress={
                    answered === null
                      ? () => setPlaced(current => ({...current, [slot]: undefined}))
                      : undefined
                  }
                />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${label} slot`}
                  aria-selected={activeSlot === slot}
                  disabled={answered !== null}
                  onPress={() => setActiveSlot(current => (current === slot ? null : slot))}
                  style={[
                    EMPTY_SLOT,
                    activeSlot === slot ? {backgroundColor: color.surfaceAccentSoft} : null,
                  ]}
                />
              )}
              <Text
                style={SLOT_LABEL_WIDTH}
                className="type-label uppercase text-fg-subtle text-center"
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      {rows.map(row => (
        <View key={row.label} className="gap-2">
          <Text className="type-label uppercase text-fg-subtle">{row.label}</Text>
          <View className="flex-row flex-wrap gap-2">
            {row.chips.map((chip, i) => (
              <SyllableChip
                key={`${row.label}:${i}`}
                glyph={chip}
                size="sm"
                onPress={answered === null ? () => place(chip) : undefined}
              />
            ))}
          </View>
        </View>
      ))}
      {answered === null ? (
        <CheckBar
          picked={tokens}
          filled={filled}
          answers={answers}
          attempted={lastChecked !== null}
          partial={
            lastChecked === null
              ? undefined
              : (buildPartialMessage(lastChecked, answers) ?? undefined)
          }
          label="plain"
          onCommit={input => {
            setLastChecked(tokens);
            onCommit(input);
          }}
        />
      ) : null}
    </View>
  );
}

const SLOT_ROW: ViewStyle = {gap: space['2']};

const SLOT_CELL: ViewStyle = {gap: 4, minWidth: 58};

const EMPTY_SLOT: ViewStyle = {
  width: 58,
  height: 54,
  borderRadius: radius.md,
  backgroundColor: color.ground200,
};

const SLOT_LABEL_WIDTH: TextStyle = {maxWidth: 72};
