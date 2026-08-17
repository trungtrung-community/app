/**
 * @fileoverview The React Native traps that already cost a bug, held shut.
 *
 * Every case here shipped once. None of them was caught by a type, a lint rule or a
 * reading of the code — three were found by dumping rendered attributes and one by looking
 * at a screenshot. They are the reason `docs/porting-web-to-rn.md` exists, and this is that
 * document with a failing test attached.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {Checkbox} from './forms/checkbox';
import {SegmentedControl} from './core/segmented-control';
import {TabBar} from './core/tab-bar';
import {Tag} from './core/tag';
import {AudioButton} from './learning/audio-button';
import {PairBoard} from './learning/pair-board';
import {SyllableChip} from './learning/syllable-chip';
import {TibetanText} from './learning/tibetan-text';
import {SLOW_RATE_LABEL} from '../domain/audio';

describe('state reaches assistive technology', () => {
  // accessibilityState never arrives in the DOM on react-native-web. It typechecks, it
  // lints, and it announces nothing — a TabBar shipped with four tabs and no current one.
  it('TabBar says which tab is current', () => {
    render(<TabBar active="journey" onSelect={() => {}} />);
    const selected = screen
      .getAllByRole('tab')
      .filter(tab => tab.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
  });

  it('SegmentedControl says which segment is chosen', () => {
    render(
      <SegmentedControl
        active={0}
        items={[{label: 'Stops'}, {label: 'Words', count: '19'}]}
        onChange={() => {}}
      />,
    );
    const chosen = screen
      .getAllByRole('tab')
      .filter(option => option.getAttribute('aria-selected') === 'true');
    expect(chosen).toHaveLength(1);
  });

  it('Tag says it is selected', () => {
    render(
      <Tag selected onPress={() => {}}>
        Offerings
      </Tag>,
    );
    expect(screen.getByRole('button').getAttribute('aria-selected')).toBe('true');
  });

  it('Checkbox says it is checked', () => {
    render(<Checkbox checked label="Show the spelling" onChange={() => {}} />);
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
  });
});

describe('a fixed-size box keeps its size', () => {
  // `flex: 0` is `flex-basis: 0%`, which outranks `width` on a flex item. It produced a
  // 26pt checkbox that rendered at nothing on web and at 26 on a device, and typechecked.
  it('the checkbox indicator is not collapsed by its own layout', () => {
    const {container} = render(<Checkbox checked label="Show the spelling" onChange={() => {}} />);
    const boxes = [...container.querySelectorAll('div')].filter(node =>
      /width:\s*26px/.test(node.getAttribute('style') ?? ''),
    );
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      expect(box.getAttribute('style')).not.toMatch(/flex:\s*0(?!\.)/);
    }
  });
});

describe('the language is marked where the script is', () => {
  // react-native-web drops accessibilityLanguage the way it drops accessibilityState, so
  // the `lang` attribute has to be set as well or the web target marks nothing.
  it('reaches the DOM as well as the device', () => {
    const {container} = render(<TibetanText roman="thuk">ཐུགས་</TibetanText>);
    expect(container.querySelector('[lang="bo"]')).toBeTruthy();
  });
});

describe('a control does not claim a state it cannot be in', () => {
  it('SyllableChip announces selection only when it can be selected', () => {
    // ChipTray borrows the selected tone for a chunk the app slid into place on reveal.
    // Announcing "selected" there describes a choice the learner never made.
    const {unmount} = render(<SyllableChip glyph="ཀྲ" roman="tra" tone="selected" />);
    expect(screen.getByRole('button').getAttribute('aria-selected')).toBeNull();
    unmount();
    render(<SyllableChip glyph="ཀྲ" roman="tra" tone="selected" onPress={() => {}} />);
    expect(screen.getByRole('button').getAttribute('aria-selected')).toBe('true');
  });
});

describe('no control is nested inside another', () => {
  it('PairBoard keeps the tile and its play control as separate targets', () => {
    // A button inside a button: React rejects it on web outright, and on a device the
    // tile's press competes with the control the learner is reaching for.
    const {container} = render(
      <PairBoard left={[{bo: 'སྤོས་', roman: 'pö'}]} right={[{en: 'incense'}]} onPick={() => {}} />,
    );
    for (const button of container.querySelectorAll('[role="button"]')) {
      expect(button.querySelector('[role="button"]')).toBeNull();
    }
  });
});

describe('the badge prints the rate the player plays', () => {
  it('takes it from the domain rather than from a drawn glyph', () => {
    // Ported from the board as a literal "half speed" badge, which the playback module
    // explicitly rejects: it smears vowels enough to change what a learner hears.
    render(<AudioButton speed="slow" />);
    expect(screen.getByText(SLOW_RATE_LABEL)).toBeTruthy();
    expect(screen.queryByText('½×')).toBeNull();
  });
});
