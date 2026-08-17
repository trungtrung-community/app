/**
 * @fileoverview SegmentedControl — picks a view of the same place.
 *
 * The district hub's Stops/Words/Phrases/Cards, and Speak/Read on the journey. Speak and
 * Read are segments here rather than tabs, which is why `TabBar` never grows past four.
 *
 * Fill-based like everything else: the active segment is a white card sitting on the
 * sunken track, carrying the shallow `--edge-ground-sm` that makes controls physical. No
 * borders, no underline, no sliding pill outline.
 */

import {Pressable, Text, View, type StyleProp, type ViewStyle} from 'react-native';

import {color, elevation} from '../../theme/tokens.generated';

export type Segment = {
  label: string;
  /** A superscript count, e.g. the 19 on "Words". */
  count?: string;
};

export type SegmentedControlProps = {
  items: readonly Segment[];
  /** Index of the active segment. */
  active?: number;
  onChange?: (index: number, segment: Segment) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The view switch.
 *
 * @example
 * <SegmentedControl
 *   items={[{label: 'Stops'}, {label: 'Words', count: '19'}]}
 *   active={0}
 *   onChange={setTab}
 * />
 */
export function SegmentedControl({
  items,
  active = 0,
  onChange,
  style,
  testID,
}: SegmentedControlProps) {
  return (
    <View
      accessibilityRole="tablist"
      className="w-full flex-row gap-1 rounded-pill bg-ground-200 p-1"
      style={style}
      testID={testID}
    >
      {items.map((segment, index) => {
        const on = index === active;
        return (
          <Pressable
            key={`${segment.label}-${index}`}
            accessibilityRole="tab"
            accessibilityState={{selected: on}}
            onPress={onChange ? () => onChange(index, segment) : undefined}
            className={`h-10 flex-1 flex-row items-center justify-center rounded-pill ${
              on ? 'bg-surface-card' : 'bg-transparent'
            }`}
            // The shallow edge only under the active segment: it is the thing sitting
            // on the track, and the inactive ones are the track.
            style={on ? ACTIVE_EDGE : undefined}
          >
            <Text className={`type-caption ${on ? 'text-fg-heading' : 'text-fg-muted'}`}>
              {segment.label}
            </Text>
            {segment.count ? (
              // A superscript count, dimmed rather than coloured — it is a quantity,
              // not a status.
              <Text
                className={`type-label ${on ? 'text-fg-heading' : 'text-fg-muted'}`}
                style={SUPERSCRIPT}
              >
                {segment.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const ACTIVE_EDGE: ViewStyle = {
  boxShadow: `0 ${elevation.edgeDepthPressed}px 0 0 ${color.ground300}`,
};

/** Raised and shrunk, the way a `<sup>` reads on the board. */
const SUPERSCRIPT = {opacity: 0.65, marginLeft: 1, marginTop: -6} as const;
