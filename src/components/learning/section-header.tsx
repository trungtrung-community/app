/**
 * @fileoverview SectionHeader — a scroll break, not chrome.
 *
 * A micro-label eyebrow over a title, in plain text. No card, no border, no rule: it marks
 * entry into a new stretch of the journey the way a chapter opening does, by the space
 * around it rather than by a line.
 *
 * Ported from the bundle: `SectionHeader` ships no `.jsx` in the export.
 */

import {Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {fontSize, space, tracking} from '../../theme/tokens.generated';

/** `--tracking-caps` is 0.08em; React Native needs it in points at the eyebrow's size. */
const CAPS_TRACKING = parseFloat(tracking.caps) * fontSize['2xs'];

export type SectionHeaderProps = {
  /** "Section 2". Uppercased and tracked out. */
  eyebrow?: string;
  children: string;
  align?: 'center' | 'start';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A break between sections.
 *
 * @example <SectionHeader eyebrow="Section 2">The Market District</SectionHeader>
 */
export function SectionHeader({
  eyebrow,
  children,
  align = 'center',
  style,
  testID,
}: SectionHeaderProps) {
  const centred = align === 'center';

  return (
    <View
      className={`w-full ${centred ? 'items-center' : 'items-start'}`}
      style={[PADDING, style]}
      testID={testID}
    >
      {eyebrow ? (
        <Text
          className="type-label text-fg-accent uppercase"
          style={[EYEBROW, centred ? CENTER_TEXT : null]}
        >
          {eyebrow}
        </Text>
      ) : null}
      <Text
        accessibilityRole="header"
        className="type-title text-fg-heading"
        style={centred ? CENTER_TEXT : null}
      >
        {children}
      </Text>
    </View>
  );
}

/** Generous above, less below: the header belongs to what follows it. */
const PADDING: ViewStyle = {paddingTop: space['8'], paddingBottom: space['5']};

const EYEBROW: TextStyle = {letterSpacing: CAPS_TRACKING, marginBottom: space['1']};

const CENTER_TEXT: TextStyle = {textAlign: 'center'};
