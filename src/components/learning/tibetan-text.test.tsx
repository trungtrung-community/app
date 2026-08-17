/**
 * @fileoverview TibetanText's rendering contract — the part `src/domain/tibetan.test.ts`
 * cannot reach, because it is about what the component draws rather than what the script
 * rules compute.
 *
 * `docs/06` §3 names this component's contract as a required test: the trailing tsheg, the
 * `roman` accessible name, the row order, and the language marking.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {TibetanText} from './tibetan-text';

describe('TibetanText', () => {
  it('appends the trailing tsheg a word needs and the content set does not store', () => {
    // When
    const {container} = render(<TibetanText unit="word">ཐུགས</TibetanText>);

    // Then
    expect(container.textContent).toContain('ཐུགས་');
  });

  it('never appends one to a letter, which has no syllable to close', () => {
    // When
    const {container} = render(<TibetanText unit="letter">ཀ</TibetanText>);

    // Then
    expect(container.textContent).not.toContain('་');
  });

  it('offers the romanization as the accessible name, because readers mangle the script', () => {
    // When
    render(<TibetanText roman="thuk">ཐུགས་</TibetanText>);

    // Then
    expect(screen.getByLabelText('thuk')).toBeTruthy();
  });

  it('marks the language on the run it sets', () => {
    // When
    const {container} = render(<TibetanText roman="thuk">ཐུགས་</TibetanText>);

    // Then
    expect(container.querySelector('[lang="bo"]')).toBeTruthy();
  });

  it('marks the language in the DOM as well as on the device', () => {
    // Deliberately overlaps the test above, and both are kept. That one is the design
    // system's rule — TibetanText marks its language. This one is the React Native trap
    // written up in `docs/11` as "the language that never reaches the DOM":
    // react-native-web drops `accessibilityLanguage` the way it drops `accessibilityState`,
    // so `lang` has to be set as a second prop or the web target announces nothing.
    // Deleting either one would leave the other looking like a redundant duplicate.

    // When
    const {container} = render(<TibetanText roman="thuk">ཐུགས་</TibetanText>);

    // Then
    expect(container.querySelector('[lang="bo"]')).toBeTruthy();
  });

  it('reads Tibetan, then its romanization, then English', () => {
    // When
    const {container} = render(
      <TibetanText roman="thuk" gloss="mind">
        ཐུགས་
      </TibetanText>,
    );

    // Then
    const text = container.textContent ?? '';
    expect(text.indexOf('ཐུགས')).toBeLessThan(text.indexOf('thuk'));
    expect(text.indexOf('thuk')).toBeLessThan(text.indexOf('mind'));
  });
});
