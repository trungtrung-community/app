/**
 * @fileoverview Select — pick one from a short, known list.
 *
 * Reminder time, session length, playback speed. The closed control is the same sunken
 * fill as `Input`, with a chevron on the right saying there is more behind it.
 *
 * Ported from the bundle: `Select` ships no `.jsx` in the export.
 *
 * This is the one form control with no React Native equivalent at all. The web original is
 * a real `<select>`, which the browser renders as a native picker; there is no such
 * element here, and Expo ships no picker. So the control is split in two: a trigger that
 * looks exactly like the drawn one, and a panel of options that opens over it.
 *
 * The panel is provisional. `Sheet` is the design system's component for exactly this —
 * a list of choices rising from the bottom edge — and it has not been ported yet. When it
 * lands, the `Modal` block below is deleted and the options move into it. Everything above
 * that block, including this component's whole contract, stays as it is.
 */

import {useState} from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {Icon} from '../core/icon';
import {pressScale} from '../core/press';
import {color, layout, radius, space} from '../../theme/tokens.generated';

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

      {/* Provisional: this whole block becomes a <Sheet> once the feedback group lands. */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => setOpen(false)}
          style={SCRIM}
        />
        <View className="bg-surface-card" style={PANEL}>
          {items.map(item => {
            const on = item.value === value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="menuitem"
                aria-selected={on}
                onPress={() => choose(item.value)}
                className="w-full flex-row items-center justify-between px-5"
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
      </Modal>
    </View>
  );
}

const LABEL_GAP: TextStyle = {marginBottom: space['1h']};
const HINT_GAP: TextStyle = {marginTop: space['1h']};
const CONTROL: ViewStyle = {height: CONTROL_HEIGHT};

const SCRIM: ViewStyle = {flex: 1, backgroundColor: color.scrim};

const PANEL: ViewStyle = {
  paddingVertical: space['2'],
  borderTopLeftRadius: radius.sheet,
  borderTopRightRadius: radius.sheet,
};

const OPTION: ViewStyle = {minHeight: layout.touchMin};
