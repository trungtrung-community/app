/**
 * @fileoverview ArtifactSheet's contract — G4's quiet reward, and G4·n's rules:
 * the counter appears only past one card, the count is bound and never typed,
 * and the primary reads "Next card" until the last page. Phases per docs/11.
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {ArtifactSheet, type ArtifactPage} from './artifact-sheet';

function page(gloss: string, ordinal: number): ArtifactPage {
  return {bo: 'སྡོང་མོ', roman: 'dongmo', gloss, collectionId: 'collection.tea', ordinal};
}

describe('ArtifactSheet', () => {
  it('shows one card with no counter, and Keep going closes', () => {
    // Given
    const onKeepGoing = vi.fn();
    render(
      <ArtifactSheet
        open
        pages={[page('the churn', 3)]}
        onSeeCard={() => {}}
        onKeepGoing={onKeepGoing}
      />,
    );

    // Then — G4: no counter on a single find
    expect(screen.getByText('You found the churn.')).toBeTruthy();
    expect(screen.queryByText('1 of 1')).toBeNull();
    expect(screen.queryByText('Next card')).toBeNull();

    // When
    fireEvent.click(screen.getByText('Keep going'));

    // Then
    expect(onKeepGoing).toHaveBeenCalledTimes(1);
  });

  it('pages a multi-card find, the count bound and Keep going last', () => {
    // Given
    const onKeepGoing = vi.fn();
    render(
      <ArtifactSheet
        open
        pages={[page('the churn', 3), page('butter', 4)]}
        onSeeCard={() => {}}
        onKeepGoing={onKeepGoing}
      />,
    );

    // Then — G4·n: the counter appears, and the primary turns the page
    expect(screen.getByText('1 of 2')).toBeTruthy();
    expect(screen.getByText('You found the churn.')).toBeTruthy();

    // When
    fireEvent.click(screen.getByText('Next card'));

    // Then — the last page carries Keep going, and only it closes
    expect(screen.getByText('2 of 2')).toBeTruthy();
    expect(screen.getByText('You found butter.')).toBeTruthy();
    expect(onKeepGoing).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Keep going'));
    expect(onKeepGoing).toHaveBeenCalledTimes(1);
  });

  it('addresses See the card to the page in view', () => {
    // Given
    const onSeeCard = vi.fn();
    render(
      <ArtifactSheet
        open
        pages={[page('the churn', 3), page('butter', 4)]}
        onSeeCard={onSeeCard}
        onKeepGoing={() => {}}
      />,
    );

    // When
    fireEvent.click(screen.getByText('Next card'));
    fireEvent.click(screen.getByText('See the card'));

    // Then
    expect(onSeeCard).toHaveBeenCalledWith(page('butter', 4));
  });
});
