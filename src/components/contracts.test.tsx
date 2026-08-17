/**
 * @fileoverview The component rules that are contracts rather than looks.
 *
 * `docs/03` and `docs/04` state a handful of things a component must do, and each one is
 * the kind of rule that survives a screenshot review unnoticed: a band that shows two
 * counts, an answer row that promises deselection, a mode that greys out without saying
 * why. Those are asserted here.
 *
 * Rendered through react-native-web under jsdom — see `vitest.config.mts` for why, and for
 * what that does not cover.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {AnswerBand} from './learning/answer-band';
import {AnswerChoice} from './learning/answer-choice';
import {CapabilityList} from './learning/capability-list';
import {ChipTray} from './learning/chip-tray';
import {ModeCard} from './learning/mode-card';
import {RecordButton} from './learning/record-button';
import {TibetanText} from './learning/tibetan-text';
import {WordRow, NOT_FOUND_YET} from './learning/word-row';

describe('AnswerBand', () => {
  it('carries no reason when the rule is not the lesson', () => {
    // Amended 2026-08-16: a band without a reason is correct, not degraded. On a
    // recognition drill a sentence about a rule the screen never showed is pollution.
    render(
      <AnswerBand tone="correct" roman="trashi delek" pinned={false}>
        བཀྲ་ཤིས་བདེ་ལེགས
      </AnswerBand>,
    );
    expect(screen.getByText('trashi delek')).toBeTruthy();
    expect(screen.queryByText(/under a letter/)).toBeNull();
  });

  it('shows the rule where the rule is the lesson', () => {
    render(
      <AnswerBand tone="wrong" reason="ར་ under a letter makes it a stack." pinned={false}>
        ཀྲ
      </AnswerBand>,
    );
    expect(screen.getByText(/makes it a stack/)).toBeTruthy();
  });

  it('names the action differently per tone, because a miss is not a win', () => {
    const {unmount} = render(
      <AnswerBand tone="correct" pinned={false}>
        ཀ
      </AnswerBand>,
    );
    expect(screen.getByText('Next')).toBeTruthy();
    unmount();
    render(
      <AnswerBand tone="wrong" pinned={false}>
        ཀ
      </AnswerBand>,
    );
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('carries one count and no second', () => {
    render(
      <AnswerBand tone="correct" mark="4 in a row" pinned={false}>
        ཀ
      </AnswerBand>,
    );
    expect(screen.getAllByText('4 in a row')).toHaveLength(1);
  });
});

describe('AnswerChoice', () => {
  it('is a button and never a radio', () => {
    // A radio promises that pressing again deselects, which is wrong once an answer has
    // been judged — and it cannot carry a correct/wrong state or a shortcut number.
    render(<AnswerChoice index={1} tibetan="བཀྲ་ཤིས" roman="trashi" onPress={() => {}} />);
    const row = screen.getByRole('button');
    expect(row.getAttribute('role')).toBe('button');
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('takes its name from the romanization, not the glyph', () => {
    render(<AnswerChoice tibetan="བཀྲ་ཤིས" roman="trashi" onPress={() => {}} />);
    expect(screen.getByLabelText('trashi')).toBeTruthy();
  });

  it('marks a judged answer and leaves a selected one unmarked', () => {
    const {unmount} = render(<AnswerChoice state="selected" roman="trashi" />);
    // Soft accent, no tick: the learner has chosen but nothing has been judged, and a tick
    // before checking would answer the question for them.
    expect(screen.getByRole('button').getAttribute('aria-selected')).toBe('true');
    unmount();
    render(<AnswerChoice state="correct" roman="trashi" />);
    expect(screen.getByRole('button').getAttribute('aria-selected')).toBe('false');
  });
});

describe('WordRow', () => {
  it('states the gap in words and offers nothing to play', () => {
    render(<WordRow en="prayer wheel" noScript="Recorded in Amdo, not yet in Lhasa." />);
    expect(screen.getByText(NOT_FOUND_YET)).toBeTruthy();
    expect(screen.getByText('prayer wheel')).toBeTruthy();
    expect(screen.queryByLabelText(/Play/)).toBeNull();
  });

  it('turns audio off for a word not yet reachable', () => {
    const {unmount} = render(<WordRow bo="ཐུགས་" roman="thuk" en="mind" status="known" />);
    expect(screen.getAllByLabelText(/Play/).length).toBeGreaterThan(0);
    unmount();
    render(<WordRow bo="ཐུགས་" roman="thuk" en="mind" status="coming" />);
    expect(screen.queryByLabelText(/Play/)).toBeNull();
  });

  it('shows the register marker only when the word is honorific', () => {
    const {unmount} = render(<WordRow bo="ཐུགས་" roman="thuk" en="mind" register="honorific" />);
    expect(screen.getByText('honorific')).toBeTruthy();
    unmount();
    render(<WordRow bo="ཆུ་ཚོད་" roman="chutsö" en="hour" register={null} />);
    expect(screen.queryByText('honorific')).toBeNull();
  });

  it('adds the reduced-rate control only when asked, and beside the natural one', () => {
    render(<WordRow bo="ཐུགས་" roman="thuk" en="mind" slow />);
    // One clip, two rates — not two recordings.
    expect(screen.getAllByLabelText(/Play/)).toHaveLength(2);
  });
});

describe('ModeCard', () => {
  it('says why a mode cannot run instead of greying out silently', () => {
    render(
      <ModeCard
        title="Match the picture"
        body="For the words that have one."
        disabled
        reason="Needs four pictures. This district has two."
      />,
    );
    expect(screen.getByText('Needs four pictures. This district has two.')).toBeTruthy();
  });

  it('replaces the card entirely for a mode the learner switched off', () => {
    // Never show someone a locked thing they chose to lock: there is no card to disable.
    render(<ModeCard absentBecause="Just listen is off while exercises without sound is on." />);
    expect(screen.getByText(/Just listen is off/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('ChipTray', () => {
  it('takes slots as the authority, not the chip count', () => {
    // The tray may hold chips that belong nowhere, so it is free to be longer than the
    // answer row has places.
    render(
      <ChipTray
        answer={[{glyph: 'ཡང་བསྐྱར་', roman: 'yangkyar'}]}
        tray={[
          {glyph: 'ཞུ་', roman: 'zhu'},
          {glyph: 'གསུངས་', roman: 'sung'},
          {glyph: 'སྙིང་', roman: 'nying'},
        ]}
        slots={4}
      />,
    );
    expect(screen.getByText('In the order you heard')).toBeTruthy();
    expect(screen.getByText('Still in the tray')).toBeTruthy();
  });

  it('leaves a decoy in the tray unmarked, because leaving it there was right', () => {
    render(
      <ChipTray
        answer={[{glyph: 'ཡང་བསྐྱར་', roman: 'yangkyar'}]}
        tray={[{glyph: 'ཞུ་', roman: 'zhu'}]}
        slots={1}
        onPick={() => {}}
      />,
    );
    const decoy = screen.getByLabelText('zhu');
    expect(decoy.getAttribute('aria-selected')).toBe('false');
  });
});

describe('CapabilityList', () => {
  it('draws a hollow ring rather than a red mark for what is not reached yet', () => {
    // Information, never a grade — which is why it is the same component and only the
    // marker changes.
    render(<CapabilityList marker="ring" items={[{capability: 'Ask how much something costs'}]} />);
    expect(screen.getByText('Ask how much something costs')).toBeTruthy();
  });

  it('lets one item override the list default', () => {
    const {container} = render(
      <CapabilityList
        items={[{capability: 'Count to ten'}, {capability: 'Count past twenty', marker: 'ring'}]}
      />,
    );
    // One check icon for the two items: the second is hollow.
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });
});

describe('RecordButton', () => {
  it('names each state in the product’s own words', () => {
    const cases = [
      ['idle', 'Record yourself'],
      ['recording', 'Stop recording'],
      ['playback', 'Play your recording'],
    ] as const;
    for (const [state, label] of cases) {
      const {unmount} = render(<RecordButton state={state} />);
      expect(screen.getByLabelText(label)).toBeTruthy();
      unmount();
    }
    render(<RecordButton state="playback" playing />);
    expect(screen.getByLabelText('Pause your recording')).toBeTruthy();
  });
});

describe('TibetanText', () => {
  it('appends the trailing tsheg a word needs and the content set does not store', () => {
    const {container} = render(<TibetanText unit="word">ཐུགས</TibetanText>);
    expect(container.textContent).toContain('ཐུགས་');
  });

  it('never appends one to a letter, which has no syllable to close', () => {
    const {container} = render(<TibetanText unit="letter">ཀ</TibetanText>);
    expect(container.textContent).not.toContain('་');
  });

  it('offers the romanization as the accessible name, because readers mangle the script', () => {
    render(<TibetanText roman="thuk">ཐུགས་</TibetanText>);
    expect(screen.getByLabelText('thuk')).toBeTruthy();
  });

  it('marks the language on the run it sets', () => {
    const {container} = render(<TibetanText roman="thuk">ཐུགས་</TibetanText>);
    expect(container.querySelector('[lang="bo"]')).toBeTruthy();
  });
});

describe('the naming triple', () => {
  it('reads Tibetan, then its romanization, then English', () => {
    const {container} = render(
      <TibetanText roman="thuk" gloss="mind">
        ཐུགས་
      </TibetanText>,
    );
    const text = container.textContent ?? '';
    expect(text.indexOf('ཐུགས')).toBeLessThan(text.indexOf('thuk'));
    expect(text.indexOf('thuk')).toBeLessThan(text.indexOf('mind'));
  });
});
