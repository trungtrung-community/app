/**
 * @fileoverview Specimens for the ported components — the gallery's content.
 *
 * The gallery's *index* is generated from the design system's manifest
 * (`ds-roster.generated.ts`), so it always lists all 51 components whether or not they
 * have been ported. The specimens here are hand-written against each component's
 * `.card.html`, because a drawn specimen names the states that matter and no
 * generator can infer them.
 *
 * A component appears as "not yet ported" in the gallery until it has an entry here,
 * which makes the port's progress a fact on screen rather than a note somewhere.
 *
 * Per `docs/04`, specimens show real content-spec content — no lorem, no "Word 1". The
 * Tibetan below is real vocabulary; the gallery route supplies more from the content
 * database.
 */

import type {ReactNode} from 'react';
import {View} from 'react-native';

import {Icon, ICON_NAMES} from './core/icon';
import {TibetanText} from './learning/tibetan-text';

export type Specimen = {
  /** What state this shows. Mirrors the wording on the .card.html where there is one. */
  readonly label: string;
  /** Why this state exists, when it is not obvious from the label. */
  readonly note?: string;
  readonly render: () => ReactNode;
};

export type PortedComponent = {
  readonly specimens: readonly Specimen[];
};

/** Real records, so the specimens read like the product rather than like a test. */
const TRASHI = 'བཀྲ་ཤིས་བདེ་ལེགས';
const BUS = 'སྤྱི་སྤྱོད་རླངས་འཁོར';
const STACK = 'བསྒྲིབས';

/**
 * Components that have been ported, keyed by their design-system name.
 *
 * The key must match the manifest name exactly — that is the contract the board and
 * the code share.
 */
export const PORTED: Record<string, PortedComponent> = {
  TibetanText: {
    specimens: [
      {
        label: 'the naming triple',
        note: 'Tibetan, then the romanization, then the English gloss — the order the system requires everywhere.',
        render: () => (
          <TibetanText roman="trashi delek" gloss="hello / greetings">
            {TRASHI}
          </TibetanText>
        ),
      },
      {
        label: 'the size ramp',
        render: () => (
          <View style={{gap: 12}}>
            {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map(size => (
              <TibetanText key={size} size={size}>
                {TRASHI}
              </TibetanText>
            ))}
          </View>
        ),
      },
      {
        label: 'hero',
        note: 'The one size that gets the medium face rather than the regular.',
        render: () => (
          <TibetanText size="hero" serif>
            ཀ
          </TibetanText>
        ),
      },
      {
        label: 'highlight by dimming',
        note: 'One line letter at full ink, the rest muted. Colour-only, so highlightLabel carries the accessible name — a stack counts as ONE line letter.',
        render: () => (
          <TibetanText size="xl" unit="letter" highlight={1} highlightLabel="the stack སྒྲི">
            {STACK}
          </TibetanText>
        ),
      },
      {
        label: 'inline in a Latin sentence',
        note: 'Inherits the surrounding colour and drops the row stack, but keeps every typographic rule.',
        render: () => (
          <TibetanText inline size="sm">
            ད
          </TibetanText>
        ),
      },
      {
        label: 'the word sheet rows',
        note: 'thl is the one "also written" row in the product. Wylie is labelled Spelled and is off by default.',
        render: () => (
          <TibetanText
            roman="chi chö lang khor"
            thl="chi chö lang khor"
            wylie="spyi spyod rlangs 'khor"
            gloss="bus"
          >
            {BUS}
          </TibetanText>
        ),
      },
      {
        label: 'centred',
        render: () => (
          <TibetanText align="center" roman="trashi delek">
            {TRASHI}
          </TibetanText>
        ),
      },
    ],
  },

  Icon: {
    specimens: [
      {
        label: 'the size ramp',
        note: 'Stroke weight steps with size so the mark reads at a constant weight.',
        render: () => (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 16}}>
            {[16, 20, 24, 28].map(size => (
              <Icon key={size} name="volume-2" size={size} />
            ))}
          </View>
        ),
      },
      {
        label: 'every name in the system',
        note: 'The 34 icons used across the components and the six boards. A name outside this set is a compile error, not a blank square.',
        render: () => (
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 16}}>
            {ICON_NAMES.map(name => (
              <Icon key={name} name={name} size={24} />
            ))}
          </View>
        ),
      },
      {
        label: 'labelled, for a bare icon button',
        note: 'Decoration by default and hidden from assistive tech; a label is passed only when the icon is the sole carrier of meaning.',
        render: () => <Icon name="x" label="Leave the lesson" size={28} />,
      },
    ],
  },
};
