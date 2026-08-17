/**
 * @fileoverview Select — pick one from a short, known list.
 *
 * Reminder time, session length, playback speed. The closed control is the same sunken
 * fill as `Input`, with a chevron on the right saying there is more behind it.
 *
 * Ported from the bundle: `Select` ships no `.jsx` in the export.
 *
 * This is the one form control with no React Native equivalent at all. The web original is
 * a real `<select>`, which the browser renders as a native picker; there is no such element
 * here, and Expo ships no picker. So the control is split in two: a trigger that looks
 * exactly like the drawn one, and the options in a `Sheet` — which is the design system's
 * own answer to a list of choices, so the picker is not a new surface but an existing one.
 */

import {useState} from 'react';
import {Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {Icon} from '../core/icon';
import {pressScale} from '../core/press';
import {Sheet} from '../feedback/sheet';
import {color, layout, space} from '../../theme/tokens.generated';

const CONTROL_HEIGHT = 52;

/** An option is either a bare string, or a value paired with what to show for it. */
export type SelectOption = string | {value: string; label: string};

export type SelectProps = {
  label?: string;
  /** Help that is always true, under the control. */
  hint?: string;
  value?: string;
  /** Receives the chosen value, not an event. */
  onChange?: (value: string) => void;
  options?: readonly SelectOption[];
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Both option shapes, normalized. A bare string is its own label. */
function normalize(option: SelectOption): {value: string; label: string} {
  return typeof option === 'string' ? {value: option, label: option} : option;
}

/**
 * A one-of-many control.
 *
 * The web original also takes `id`, for a `<label for>` to point at. There is no label
 * element here and no id space — see the same note on `Input`.
 *
 * @example <Select label="Reminder" value={time} options={['08:00', '19:00']} onChange={setTime} />
 */
export function Select({
  label,
  hint,
  value,
  onChange,
  options = [],
  disabled = false,
  style,
  testID,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const items = options.map(normalize);
  const current = items.find(item => item.value === value);

  const choose = (chosen: string) => {
    setOpen(false);
    onChange?.(chosen);
  };

  return (
    <View style={style} testID={testID}>
      {label ? (
        <Text className="type-caption text-fg-muted" style={LABEL_GAP}>
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={label}
        aria-valuetext={current?.label}
        aria-expanded={open}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={`w-full flex-row items-center justify-between rounded-control pl-4 pr-3h ${
          disabled ? 'bg-ground-200' : 'bg-surface-sunken'
        }`}
        style={({pressed}) => [CONTROL, pressed && !disabled ? pressScale : null]}
      >
        <Text
          className={`type-body-strong ${disabled ? 'text-fg-subtle' : 'text-fg-heading'}`}
          numberOfLines={1}
        >
          {/* No placeholder in the contract, so an unset value shows the em dash the
              design system uses for "nothing yet" rather than an invented string. */}
          {current?.label ?? '—'}
        </Text>
        <Icon name="chevron-down" size={20} color={color.textMuted} />
      </Pressable>
      {hint ? (
        <Text className="type-caption text-fg-muted" style={HINT_GAP}>
          {hint}
        </Text>
      ) : null}

      <Sheet open={open} title={label} onClose={() => setOpen(false)}>
        {/* The sheet's own title is the field's label, so the learner sees the same word
            they pressed rather than a second name for it. */}
        <View accessibilityRole="radiogroup">
          {items.map(item => {
            const on = item.value === value;
            return (
              <Pressable
                key={item.value}
                // A radio rather than a menuitem: these are one-of-many with a persistent
                // selection, which is what a radio announces and a menu item does not.
                accessibilityRole="radio"
                aria-checked={on}
                onPress={() => choose(item.value)}
                className="w-full flex-row items-center justify-between"
                style={OPTION}
              >
                <Text className={`type-body-strong ${on ? 'text-fg-accent' : 'text-fg-heading'}`}>
                  {item.label}
                </Text>
                {on ? <Icon name="check" size={20} color={color.textAccent} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

const LABEL_GAP: TextStyle = {marginBottom: space['1h']};
const HINT_GAP: TextStyle = {marginTop: space['1h']};
const CONTROL: ViewStyle = {height: CONTROL_HEIGHT};

const OPTION: ViewStyle = {minHeight: layout.touchMin};
