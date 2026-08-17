/**
 * @fileoverview Input — a fill-based text field.
 *
 * Sunken ground fill and no border, like every other control in a system that separates
 * by fill value rather than by line. Focus is a teal ring; an error is the same ring in
 * crown red, so the two cannot both be showing and the error wins.
 *
 * Ported from the bundle: `Input` ships no `.jsx` in the export.
 *
 * `tibetan` is the one sanctioned exception to "only TibetanText sets a Tibetan face".
 * A text field's content is being typed, so it cannot be wrapped in a component — there
 * is nothing to wrap. What travels with the exception is the headroom rule: a 22pt
 * Tibetan glyph needs about 62pt of vertical room for its full ink, so the Tibetan field
 * is taller than the Latin one rather than clipping the stacks.
 * adherence-allow: an editable Tibetan field cannot route through TibetanText.
 */

import {useState} from 'react';
import {
  TextInput,
  View,
  Text,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {Icon, type IconName} from '../core/icon';
import {tibetanBox} from '../learning/tibetan-text';
import {color, elevation, fontFamily, fontSize, leading, space} from '../../theme/tokens.generated';

/**
 * The web original's `type`, mapped to what React Native actually has.
 *
 * A DOM input type does several things at once — the keyboard, the autocorrect
 * behaviour, and whether characters are masked. Those are three separate props here, so
 * the mapping is spelled out rather than passed through.
 */
const TYPES = {
  text: {keyboardType: 'default', secure: false, autoCapitalize: 'sentences'},
  email: {keyboardType: 'email-address', secure: false, autoCapitalize: 'none'},
  number: {keyboardType: 'number-pad', secure: false, autoCapitalize: 'none'},
  password: {keyboardType: 'default', secure: true, autoCapitalize: 'none'},
} as const satisfies Record<
  string,
  {keyboardType: KeyboardTypeOptions; secure: boolean; autoCapitalize: 'none' | 'sentences'}
>;

export type InputType = keyof typeof TYPES;

const LATIN_MIN_HEIGHT = 52;

export type InputProps = {
  label?: string;
  /** Help that is always true. Replaced by `error` when there is one — never both. */
  hint?: string;
  /** What is wrong, in one sentence. Turns the ring and the message crown red. */
  error?: string;
  icon?: IconName;
  /** Sets the Tibetan face and marks the language. See the note at the top of the file. */
  tibetan?: boolean;
  value?: string;
  /** Receives the text, not an event. */
  onChange?: (text: string) => void;
  placeholder?: string;
  type?: InputType;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A text field.
 *
 * The web original also takes `id`, which exists so a `<label for>` can point at the
 * input. React Native has no label element and no id space: the label is a sibling `Text`
 * and the field carries its own accessible name, so there is nothing for an id to join.
 *
 * @example <Input label="Your name" value={name} onChange={setName} />
 * @example <Input label="Type what you hear" tibetan value={answer} onChange={setAnswer} />
 */
export function Input({
  label,
  hint,
  error,
  icon,
  tibetan = false,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  style,
  testID,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const {keyboardType, secure, autoCapitalize} = TYPES[type];
  const message = error ?? hint;

  // An error outranks focus: a field can be both, and showing teal over a red ring would
  // hide the thing the learner needs to fix.
  const ring = error ? color.crown600 : focused ? color.focusRing : null;

  return (
    <View style={style} testID={testID}>
      {label ? (
        <Text className="type-caption text-fg-muted" style={LABEL_GAP}>
          {label}
        </Text>
      ) : null}
      <View
        className={`w-full flex-row items-center gap-2h rounded-control px-4 ${
          disabled ? 'bg-ground-200' : 'bg-surface-sunken'
        }`}
        style={[
          tibetan ? TIBETAN_FIELD : LATIN_FIELD,
          // A ring rather than a border, so it costs no layout — the field does not move
          // when it gains focus. `boxShadow` carries geometry and colour in one string,
          // which is why the colour is a value here and not a class.
          ring ? {boxShadow: `0 0 0 ${elevation.focusRingWidth}px ${ring}`} : null,
        ]}
      >
        {icon ? <Icon name={icon} size={20} color={color.textMuted} /> : null}
        <TextInput
          accessibilityLabel={label ?? placeholder}
          accessibilityLanguage={tibetan ? 'bo' : undefined}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={color.textSubtle}
          editable={!disabled}
          keyboardType={keyboardType}
          secureTextEntry={secure}
          autoCapitalize={autoCapitalize}
          // Autocorrect would fight a learner typing a language it does not know.
          autoCorrect={!tibetan}
          spellCheck={!tibetan}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={tibetan ? TIBETAN_TEXT : LATIN_TEXT}
        />
      </View>
      {message ? (
        <Text
          className={`type-caption ${error ? 'text-crown-600' : 'text-fg-muted'}`}
          style={MESSAGE_GAP}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const LABEL_GAP: TextStyle = {marginBottom: space['1h']};
const MESSAGE_GAP: TextStyle = {marginTop: space['1h']};

const LATIN_FIELD: ViewStyle = {minHeight: LATIN_MIN_HEIGHT};

/** Tall enough for the tallest stack rather than tight enough to clip it. */
const TIBETAN_FIELD: ViewStyle = {minHeight: tibetanBox('md')};

const BASE_TEXT: TextStyle = {flex: 1, minWidth: 0, color: color.textHeading};

const LATIN_TEXT: TextStyle = {
  ...BASE_TEXT,
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.md,
  lineHeight: fontSize.md * leading.latin,
};

/**
 * No `lineHeight`, deliberately.
 *
 * A single-line field never breaks, so leading has nothing to do in it — and a
 * `lineHeight` on a React Native `TextInput` shifts the text off the vertical centre on
 * Android. The room the glyphs need comes from the field's own height instead.
 */
const TIBETAN_TEXT: TextStyle = {
  ...BASE_TEXT,
  fontFamily: fontFamily.tibetanRegular,
  fontSize: fontSize.tibMd,
};
