/**
 * @fileoverview ArtifactCard — a collectible the learner has found, or has not.
 *
 * A churn, a thangka, a prayer flag. Found cards sit on white with the soft accent fill
 * behind the art; unfound ones drop to ground with the art reduced to a silhouette.
 *
 * **The text is the same triple either way** — Tibetan, its romanization, the English name.
 * An unfound card still names its word properly: the thing withheld is the picture, not the
 * language, and a card that hid its word would be teaching nothing while it waited.
 *
 * The silhouette lives here rather than at each call site so it cannot drift between the
 * grid, the detail sheet and the 44pt thumbnail.
 *
 * No illustrations exist in this repo yet (`docs/10` records them as unstarted), so the art
 * is the design system's own placeholder shape, not a missing image.
 */

import {Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {color, fontFamily, fontSize, radius, space} from '../../theme/tokens.generated';
import {TibetanText} from './tibetan-text';

/**
 * The two line heights the design system sets here by hand.
 *
 * Neither is `--leading-latin`: a card's name and its romanization are one or two words in
 * a narrow column, where prose leading opens a gap the card has no room for.
 */
const TIGHT_CAPTION = 1.4;
const TIGHT_NAME = 1.3;

/** Card box, art band and silhouette, per variant. */
const SIZES = {
  grid: {box: 165, art: 116, dot: 58},
  thumb: {box: 44, art: 44, dot: 24},
} as const;

export type ArtifactCardVariant = keyof typeof SIZES;

/** How far the silhouette drops when the artifact has not been found. */
const UNFOUND_ART_OPACITY = 0.12;
const UNFOUND_SCRIPT_OPACITY = 0.45;

/** The words the product uses for a card the learner has not reached. */
export const NOT_FOUND_ARTIFACT = 'Not found yet.';

export type ArtifactCardProps = {
  /** The English name — "The churn". */
  name?: string;
  bo?: string;
  /** The Trungtrung romanization. */
  roman?: string;
  found?: boolean;
  variant?: ArtifactCardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * One collectible.
 *
 * @example <ArtifactCard name="The churn" bo="མདོང་མོ་" roman="dongmo" found />
 * @example <ArtifactCard variant="thumb" found={false} />
 */
export function ArtifactCard({
  name,
  bo,
  roman,
  found = true,
  variant = 'grid',
  onPress,
  style,
  testID,
}: ArtifactCardProps) {
  const {box, art, dot} = SIZES[variant];
  const thumb = variant === 'thumb';

  const body = (
    <>
      <View
        aria-hidden
        style={[
          ART,
          {height: art, backgroundColor: found ? color.surfaceAccentSoft : color.ground100},
        ]}
      >
        <View
          style={[SILHOUETTE, {width: dot, height: dot, opacity: found ? 1 : UNFOUND_ART_OPACITY}]}
        />
      </View>
      {thumb ? null : (
        <View style={COPY}>
          {bo ? (
            <TibetanText unit="word" size="sm" style={found ? undefined : FADED}>
              {bo}
            </TibetanText>
          ) : null}
          {roman ? (
            <Text style={[ROMAN, {color: found ? color.textAccent : color.textSubtle}]}>
              {roman}
            </Text>
          ) : null}
          <Text style={[NAME, {color: found ? color.textHeading : color.textSubtle}]}>{name}</Text>
          {found ? null : <Text style={PENDING}>{NOT_FOUND_ARTIFACT}</Text>}
        </View>
      )}
    </>
  );

  const cardStyle: ViewStyle = {
    ...CARD,
    width: thumb ? box : '100%',
    borderRadius: thumb ? radius.md : radius.lg,
    backgroundColor: found ? color.surfaceCard : color.ground050,
  };

  if (!onPress) {
    return (
      <View style={[cardStyle, style]} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      // The English name, not the romanization: this is a thing, and the word is what the
      // card teaches once it is open.
      accessibilityLabel={name}
      accessibilityHint={found ? undefined : NOT_FOUND_ARTIFACT}
      onPress={onPress}
      style={[cardStyle, style]}
      testID={testID}
    >
      {body}
    </Pressable>
  );
}

const CARD: ViewStyle = {overflow: 'hidden'};

const ART: ViewStyle = {alignItems: 'center', justifyContent: 'center'};

/** The placeholder shape: a vessel, rounded at the foot and squarer at the lip. */
const SILHOUETTE: ViewStyle = {
  backgroundColor: color.ink900,
  borderTopLeftRadius: 6,
  borderTopRightRadius: 6,
  borderBottomLeftRadius: 14,
  borderBottomRightRadius: 14,
};

const COPY: ViewStyle = {
  paddingTop: space['2h'],
  paddingHorizontal: space['3'],
  paddingBottom: space['3'],
  gap: 1,
};

const FADED: ViewStyle = {opacity: UNFOUND_SCRIPT_OPACITY};

const ROMAN: TextStyle = {
  fontFamily: fontFamily.bodyMediumItalic,
  fontSize: fontSize['2xs'],
  lineHeight: fontSize['2xs'] * TIGHT_CAPTION,
};

const NAME: TextStyle = {
  fontFamily: fontFamily.displayBold,
  fontSize: fontSize.md,
  lineHeight: fontSize.md * TIGHT_NAME,
};

const PENDING: TextStyle = {
  fontFamily: fontFamily.bodyMedium,
  fontSize: fontSize.xs,
  lineHeight: fontSize.xs * TIGHT_CAPTION,
  color: color.textSubtle,
};
