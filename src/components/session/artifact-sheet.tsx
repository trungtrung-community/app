/**
 * @fileoverview ArtifactSheet — the card found at the end of the stop (G4).
 *
 * Rises over the recap at S8, rewarding finishing rather than scrolling past a
 * word. Quiet, never confetti — the Sheet's own settle is the one soft
 * overshoot. Paged when the stop holds more than one artifact (G4·n): the
 * counter appears only then, and the primary reads "Next card" until the last
 * page, where "Keep going" closes the stop. "See the card" lands on the shelf
 * card (G3) for the page in view.
 */

import {useState} from 'react';
import {Text, View} from 'react-native';

import {Button} from '../core/button';
import {MascotSpeech} from '../feedback/mascot-speech';
import {Sheet} from '../feedback/sheet';
import {TibetanText} from '../learning/tibetan-text';

/** One page of the sheet: the artifact, and where its shelf card lives. */
export type ArtifactPage = {
  readonly bo: string;
  readonly roman?: string;
  /** The English gloss the crane names: "You found {gloss}." */
  readonly gloss: string;
  readonly collectionId: string;
  readonly ordinal: number;
};

export type ArtifactSheetProps = {
  open: boolean;
  pages: readonly ArtifactPage[];
  /** "See the card" — the page in view, addressed for the card route. */
  onSeeCard: (page: ArtifactPage) => void;
  /** "Keep going" from the last page, or the sheet closing — the stop closes. */
  onKeepGoing: () => void;
};

/** The G4 sheet, worded from the board frame. */
export function ArtifactSheet({open, pages, onSeeCard, onKeepGoing}: ArtifactSheetProps) {
  const [index, setIndex] = useState(0);
  const page = pages[index];
  const last = index >= pages.length - 1;

  return (
    <Sheet open={open} onClose={onKeepGoing} testID="artifact-sheet">
      {page === undefined ? null : (
        <View className="gap-4">
          {pages.length > 1 ? (
            <View className="flex-row items-center justify-between">
              <Text className="type-label text-fg-muted uppercase">Card found</Text>
              <Text className="type-body-strong text-fg-muted">{`${index + 1} of ${pages.length}`}</Text>
            </View>
          ) : null}
          <MascotSpeech pose="head" size={72}>
            {`You found ${page.gloss}.`}
          </MascotSpeech>
          <TibetanText size="md" roman={page.roman} gloss={page.gloss}>
            {page.bo}
          </TibetanText>
          <View className="gap-2">
            <Button size="lg" fullWidth onPress={last ? onKeepGoing : () => setIndex(index + 1)}>
              {last ? 'Keep going' : 'Next card'}
            </Button>
            <Button variant="ghost" size="md" fullWidth onPress={() => onSeeCard(page)}>
              See the card
            </Button>
          </View>
        </View>
      )}
    </Sheet>
  );
}
