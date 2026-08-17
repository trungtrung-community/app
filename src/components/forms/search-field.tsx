/**
 * @fileoverview SearchField — search across words, phrases and cards.
 *
 * A sunken pill sitting on the ground. It is the one place the system uses
 * `--surface-sunken` as an input fill on a pill, which is what keeps a search field from
 * ever being mistaken for a card. The clear button appears only when there is something
 * to clear.
 *
 * The face flips to Noto Serif Tibetan as soon as the query contains Tibetan, because
 * React Native has no font fallback: a family without a glyph for a codepoint draws tofu
 * rather than borrowing from another font, so a learner typing ཐུགས་ into a field set in
 * Plus Jakarta Sans would watch their query turn into boxes. The board gets away with
 * `--font-body` here only because a browser silently substitutes.
 *
 * Flipping is safe in both directions: Noto Serif Tibetan covers all 95 printable Basic
 * Latin characters, verified against the bundled 400Regular face, so a mixed query like
 * `thuk ཐུགས་` still renders whole.
 * adherence-allow: an editable Tibetan field cannot route through TibetanText.
 */

import {
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {Icon} from '../core/icon';
import {hasTibetan} from '../../domain/tibetan';
import {color, fontFamily, fontSize, layout} from '../../theme/tokens.generated';

const DEFAULT_PLACEHOLDER = 'Search words, phrases, cards';

export type SearchFieldProps = {
  value?: string;
  placeholder?: string;
  /** Receives the text, not an event. */
  onChange?: (text: string) => void;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The search pill.
 *
 * @example <SearchField value={q} onChange={setQ} onClear={() => setQ('')} />
 */
export function SearchField({
  value = '',
  placeholder = DEFAULT_PLACEHOLDER,
  onChange,
  onClear,
  style,
  testID,
}: SearchFieldProps) {
  const tibetan = hasTibetan(value);

  return (
    <View
      className="w-full flex-row items-center gap-2h rounded-pill bg-surface-sunken px-3h"
      style={[HEIGHT, style]}
      testID={testID}
    >
      <Icon name="search" size={20} color={color.ink400} />
      <TextInput
        accessibilityLabel={placeholder}
        // Marked only while there is Tibetan in it. An empty field is not a Tibetan field,
        // and announcing it as one would make a screen reader read the placeholder in the
        // wrong language.
        accessibilityLanguage={tibetan ? 'bo' : undefined}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={color.ink400}
        // A query is not prose: it should not be capitalized, corrected, or spellchecked
        // against a dictionary that has never seen Tibetan romanization.
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="search"
        style={tibetan ? TIBETAN_QUERY : LATIN_QUERY}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={onClear}
          hitSlop={8}
        >
          <Icon name="x" size={20} color={color.ink400} />
        </Pressable>
      ) : null}
    </View>
  );
}

const HEIGHT: ViewStyle = {height: layout.touchMin};

const BASE_QUERY: TextStyle = {flex: 1, minWidth: 0, color: color.textHeading};

const LATIN_QUERY: TextStyle = {
  ...BASE_QUERY,
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.md,
};

/**
 * Tibetan at the Latin size, not the Tibetan ramp — and no 2.1 leading.
 *
 * Both are deliberate departures from the Tibetan typography rules, and both come from the
 * pill being 48pt and one line tall. `--text-tib-md` at `--leading-tibetan` needs a 46pt
 * line box before any padding, and leading has nothing to do in a field that cannot wrap.
 * A query is a string being matched, not Tibetan being read; the results below it are
 * where the script gets set properly, through TibetanText.
 */
const TIBETAN_QUERY: TextStyle = {
  ...BASE_QUERY,
  fontFamily: fontFamily.tibetanRegular,
  fontSize: fontSize.md,
};
