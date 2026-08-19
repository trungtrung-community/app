/**
 * @fileoverview You — your tracks (K1's chooser, reused as a setting).
 *
 * The same three equal cards the first launch draws, read and write: the
 * current track is marked, a tap writes it, and nothing asks to confirm.
 * K1's Carry on button belongs to onboarding and is not drawn here.
 */

import {useEffect} from 'react';
import {Pressable, ScrollView, Text, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {pressScale} from '../../../src/components/core/press';
import {DEFAULT_SETTINGS, type Settings} from '../../../src/ports/settings-store';
import {useSettings} from '../../../src/store/settings';
import {color} from '../../../src/theme/tokens.generated';

type TrackCard = {
  readonly id: Settings['track'];
  readonly title: string;
  /** One sentence, K1's own card wording. */
  readonly sub: string;
};

/** K1's three equal cards, in the board's order. */
const TRACK_CARDS: readonly TrackCard[] = [
  {
    id: 'speak',
    title: 'Speak Tibetan',
    sub: 'Say something useful at every stop. Pronunciation in Latin letters.',
  },
  {id: 'read', title: 'Read the script', sub: 'Thirty letters, then how they stack.'},
  {id: 'both', title: 'Both', sub: 'Two routes through one walk. Switch between them any time.'},
];

export default function Tracks() {
  const insets = useSafeAreaInsets();
  const current = useSettings(s => s.settings?.track ?? DEFAULT_SETTINGS.track);

  // Fire-and-forget: pre-hydration the cards mark the default track, and a
  // platform without the native store keeps that answer rather than crashing.
  useEffect(() => {
    useSettings
      .getState()
      .hydrate()
      .catch(() => {});
  }, []);

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="px-5 pb-8" style={{paddingTop: insets.top}}>
        <View className="items-center gap-1 py-6">
          <Text accessibilityRole="header" className="type-heading text-fg-heading">
            Your tracks
          </Text>
        </View>
        <View className="gap-3">
          {TRACK_CARDS.map(card => {
            const selected = card.id === current;
            return (
              <Pressable
                key={card.id}
                accessibilityRole="radio"
                aria-checked={selected}
                accessibilityLabel={card.title}
                accessibilityHint={card.sub}
                onPress={() => {
                  useSettings.getState().set({track: card.id});
                }}
                className="gap-[3px] rounded-lg bg-surface-card px-5 py-[18px]"
                style={({pressed}) => [
                  selected ? SELECTED : UNSELECTED,
                  pressed ? pressScale : null,
                ]}
              >
                {/* Hidden from assistive tech: the Pressable already carries both
                    strings as its name and its hint. */}
                <Text aria-hidden className="type-title text-fg-heading">
                  {card.title}
                </Text>
                <Text aria-hidden className="type-body text-fg-muted">
                  {card.sub}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// The mark: a teal ring on the chosen card. Both states carry the same border
// width, so choosing never shifts the layout.
const SELECTED: ViewStyle = {borderWidth: 2, borderColor: color.teal600};
const UNSELECTED: ViewStyle = {borderWidth: 2, borderColor: 'transparent'};
