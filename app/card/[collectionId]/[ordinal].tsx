/**
 * @fileoverview The cultural card (G3) — one artifact, full screen.
 *
 * A stack-root route rather than a tab: opening a card leaves the shelves behind
 * for a single full-screen surface, with no tab bar under it. Paged "1 of n"
 * chrome belongs to the stop-ending flow and is not part of this screen.
 *
 * The share entry (H1) lives here because the card is the most shareable thing in
 * the app. It exists only where the seam says sharing exists — absent on web, never
 * disabled — and only for a card with Tibetan on it: the sheet's three rows all
 * trade on the word itself.
 */

import {useEffect, useRef, useState} from 'react';
import {useLocalSearchParams} from 'expo-router';
import {ScrollView, Text, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {IconButton} from '../../../src/components/core/icon-button';
import {ListRow} from '../../../src/components/core/list-row';
import {EmptyState} from '../../../src/components/feedback/empty-state';
import {Sheet} from '../../../src/components/feedback/sheet';
import {Skeleton} from '../../../src/components/feedback/skeleton';
import {Toast} from '../../../src/components/feedback/toast';
import {ShareCard} from '../../../src/components/learning/share-card';
import {TibetanText} from '../../../src/components/learning/tibetan-text';
import {canShareCard, copyTibetan, shareCardImage} from '../../../src/composition/share';
import type {CardExportFormat} from '../../../src/composition/share';
import type {CollectionId, PhraseId, VocabId} from '../../../src/ports/content-ids';

import {useContent} from '../../../src/store/use-content';

/** What the card face needs, once its collection card and item are resolved. */
type CardWhole = {
  readonly illustrated: boolean;
  readonly name: string;
  readonly bo: string | null;
  readonly roman: string | null;
  readonly culturalNote: string | null;
  readonly foundAt: string | null;
};

/** How long "Copied" stands before it leaves on its own. */
const COPIED_MS = 2200;

/**
 * The off-stage compositions render at design width and view-shot resizes the capture
 * to the export pixels. `ShareCard`'s type does not scale with width, so laying out at
 * 1080 would shrink the word, not enlarge the card. 270 is the one story width where
 * `round(width · 16/9)` is exactly 9:16, so the capture is never stretched to fit.
 */
const SQUARE_EXPORT_WIDTH = 320;
const STORY_EXPORT_WIDTH = 270;

/** The board's H1 preview: the card itself, small — see what you are sending. */
const PREVIEW_WIDTH = 240;

export default function Card() {
  const {collectionId, ordinal} = useLocalSearchParams<{
    collectionId: string;
    ordinal: string;
  }>();
  const insets = useSafeAreaInsets();
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const squareShot = useRef<View>(null);
  const storyShot = useRef<View>(null);

  const load = useContent<CardWhole>(
    async source => {
      // Route params are raw strings; the brand is restored here, at the boundary.
      const collection = await source.getCollection(collectionId as CollectionId);
      const n = Number(ordinal);
      const card = collection.cards.find(candidate => candidate.ordinal === n);
      if (!card) {
        throw new Error(`no card at ordinal ${ordinal} in ${collectionId}`);
      }
      if (card.kind === 'group' || card.itemId === null) {
        return {
          illustrated: card.illustration,
          name: groupDisplayName(card.groupName),
          bo: null,
          roman: null,
          culturalNote: null,
          foundAt: null,
        };
      }
      const item =
        card.kind === 'vocab'
          ? await source.getVocabulary(card.itemId as VocabId)
          : await source.getPhrase(card.itemId as PhraseId);
      const district = await source.getDistrict(item.district);
      return {
        illustrated: card.illustration,
        name: item.en,
        bo: item.bo,
        roman: item.roman,
        culturalNote: item.culturalNote,
        foundAt: district.name,
      };
    },
    [collectionId, ordinal],
  );

  useEffect(() => {
    if (!copied) {
      return;
    }
    const gone = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(gone);
  }, [copied]);

  const card = load.status === 'ready' ? load.data : null;
  const bo = card?.bo ?? null;
  const shareable = canShareCard && card !== null && bo !== null;

  const copy = () => {
    if (bo === null) {
      return;
    }
    // The toast only stands once the write has happened — a "Copied" over an empty
    // clipboard would be a lie, so a failed write shows nothing.
    void copyTibetan(bo)
      .then(() => {
        setShareOpen(false);
        setCopied(true);
      })
      .catch(() => {});
  };

  const shareImage = (format: CardExportFormat) => {
    // Our sheet closes first so the system sheet is not presented over a Modal.
    // The off-stage compositions live outside it, so the capture survives the close.
    setShareOpen(false);
    void shareCardImage(format === 'square' ? squareShot : storyShot, format, card?.name ?? '');
  };

  return (
    <View className="flex-1 bg-surface-app">
      <ScrollView className="flex-1">
        <View className="items-center gap-4 px-5 pb-8" style={{paddingTop: insets.top}}>
          {shareable ? (
            <View className="w-full flex-row justify-end">
              <IconButton
                icon="share-2"
                label="Share this card"
                variant="card"
                onPress={() => setShareOpen(true)}
                testID="card-share"
              />
            </View>
          ) : null}
          {load.status === 'loading' ? <CardSkeleton /> : null}
          {load.status === 'error' ? (
            <EmptyState title="That card is off the shelf">Go back and try another one.</EmptyState>
          ) : null}
          {card ? (
            <>
              {card.illustrated ? (
                <View
                  testID="card-illustration"
                  className="h-40 w-40 items-center justify-center rounded-lg bg-surface-accent-soft"
                >
                  <View className="h-16 w-16 rounded-lg bg-ink-900" />
                </View>
              ) : null}
              {card.bo ? (
                <TibetanText
                  size="xl"
                  align="center"
                  unit="word"
                  roman={card.roman ?? undefined}
                  gloss={card.name}
                >
                  {card.bo}
                </TibetanText>
              ) : (
                <Text className="type-heading text-fg-heading text-center">{card.name}</Text>
              )}
              {card.culturalNote ? (
                <Text className="type-body text-fg-body">{card.culturalNote}</Text>
              ) : null}
              {card.foundAt ? (
                <Text className="type-caption text-fg-muted">{`Found at ${card.foundAt}`}</Text>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>

      {card !== null && bo !== null && shareable ? (
        <>
          {/* The H2/H3 compositions, mounted off-stage so a row press has a live view to
              capture. Off the edge rather than at opacity zero: iOS snapshots what is
              drawn, and a fully transparent view is allowed to draw nothing. */}
          <View style={OFFSTAGE} aria-hidden>
            <View ref={squareShot} collapsable={false}>
              <ShareCard
                bo={bo}
                roman={card.roman ?? undefined}
                en={card.name}
                note={card.culturalNote ?? undefined}
                width={SQUARE_EXPORT_WIDTH}
                testID="card-export-square"
              />
            </View>
            <View ref={storyShot} collapsable={false}>
              <ShareCard
                format="story"
                bo={bo}
                roman={card.roman ?? undefined}
                en={card.name}
                note={card.culturalNote ?? undefined}
                width={STORY_EXPORT_WIDTH}
                testID="card-export-story"
              />
            </View>
          </View>

          <Sheet
            open={shareOpen}
            title="Share this card"
            onClose={() => setShareOpen(false)}
            testID="card-share-sheet"
          >
            <View className="items-center pb-3">
              <ShareCard
                bo={bo}
                roman={card.roman ?? undefined}
                en={card.name}
                width={PREVIEW_WIDTH}
                testID="card-share-preview"
              />
            </View>
            <ListRow
              icon="download"
              label="Save image"
              sub="A square card, 1:1"
              chevron={false}
              onPress={() => shareImage('square')}
              testID="share-square"
            />
            <ListRow
              icon="share-2"
              label="Share"
              sub="Anywhere your phone can send it"
              chevron={false}
              onPress={() => shareImage('story')}
              testID="share-story"
            />
            <ListRow
              icon="type"
              label="Copy the Tibetan"
              sub={`${bo} — ready to paste into a message`}
              chevron={false}
              onPress={copy}
              testID="share-copy"
            />
          </Sheet>
        </>
      ) : null}

      {/* The board's dock: above the bottom edge, over whatever the card shows. */}
      <View style={TOAST_DOCK}>
        <Toast visible={copied} testID="card-copied-toast">
          Copied
        </Toast>
      </View>
    </View>
  );
}

function CardSkeleton() {
  return (
    <View className="items-center gap-4">
      <Skeleton shape="block" width={160} height={160} />
      <Skeleton shape="text" width={180} />
      <Skeleton shape="text" width={220} />
    </View>
  );
}

/** "prayer-flag-colours" -> "Prayer flag colours". No membership is invented here. */
function groupDisplayName(groupName: string | null): string {
  if (!groupName) {
    return '';
  }
  const words = groupName.split('-').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const OFFSTAGE: ViewStyle = {position: 'absolute', left: -9999, top: 0, pointerEvents: 'none'};

const TOAST_DOCK: ViewStyle = {
  position: 'absolute',
  left: 16,
  right: 16,
  bottom: 20,
  pointerEvents: 'none',
};
