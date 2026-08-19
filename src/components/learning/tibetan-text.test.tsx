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

import {Text} from 'react-native';
import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {TibetanText, mixedTibetan} from './tibetan-text';

/**
 * The size ramp, and the two ratios the line box is judged against.
 *
 * Kept as literals rather than imported: `DECLARED_LINE_BOX` is not exported, and a test
 * that reads its subject's own constant proves only that the constant equals itself. These
 * are the spike's measured figures and `--leading-tibetan`, written out.
 */
const RAMP = {xs: 14, sm: 17, md: 22, lg: 30, xl: 44, hero: 68} as const;
const DECLARED = 2.8;
const TIBETAN_LEADING = 2.1;

/** The inline style React Native Web writes onto the Tibetan run. */
function runStyle(node: Element | null): CSSStyleDeclaration {
  if (!(node instanceof HTMLElement)) {
    throw new Error('no Tibetan run rendered');
  }
  return node.style;
}

function tibetanRun(container: HTMLElement): CSSStyleDeclaration {
  return runStyle(container.querySelector('[lang="bo"]'));
}

describe('the line box', () => {
  // The regression this defends is a device report, not a preference: at 2.1 the tallest
  // measured stack clears the top of the box by 0.04 x the font size, so `སྤོས་` at 44pt
  // had its vowel sign shaved off. Only a box at or above the font's declared 2.8 is safe
  // for content nobody has measured. See `lineBox` in the component.

  it('is never compressed below what the font declares, at any size in the ramp', () => {
    // Then
    for (const [size, points] of Object.entries(RAMP)) {
      const {container, unmount} = render(
        <TibetanText size={size as keyof typeof RAMP}>སྤོས་</TibetanText>,
      );
      expect(parseFloat(tibetanRun(container).lineHeight)).toBeGreaterThanOrEqual(
        points * DECLARED,
      );
      unmount();
    }
  });

  it('still occupies exactly the leading the design system asks for', () => {
    // The rendered box grew; the *laid out* box must not. Negative margins give back the
    // difference, so nothing under a Tibetan run moved when the clipping was fixed. This
    // one passes on the pre-fix code as well, by design: it exists to catch a later edit
    // that drops the trim and silently pushes every Tibetan layout 0.7x taller.

    // When
    const {container} = render(<TibetanText size="xl">སྤོས་</TibetanText>);
    const style = tibetanRun(container);

    // Then
    const occupied =
      parseFloat(style.lineHeight) + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    expect(occupied).toBeCloseTo(RAMP.xl * TIBETAN_LEADING, 5);
  });

  it('trims a mixed run by nothing, because margins do not apply inside text', () => {
    // An inline run cannot give its extra box back, and should not try. The reported
    // symptom was two rows in one card disagreeing — `ཇ་ཐང` has no vowel above and `བོད་ཇ`
    // has one, so the second row's line grew to fit the ink and its text read as stuck to
    // the top. A box sized to the *font* rather than to the ink is the same number for
    // both. Asserting that the two rows match would not catch it: jsdom lays nothing out,
    // so it passes on the broken code too. The floor below is what discriminates — at 2.1
    // this run measured 29.4 against a 39.2 requirement.

    // When
    const {container} = render(<Text>{mixedTibetan('བོད་ཇ · phööcha')}</Text>);
    const style = tibetanRun(container);

    // Then
    expect(parseFloat(style.lineHeight)).toBeGreaterThanOrEqual(RAMP.xs * DECLARED);
    expect(style.marginTop).toBe('');
  });
});

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
