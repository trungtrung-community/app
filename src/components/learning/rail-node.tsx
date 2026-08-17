/**
 * @fileoverview RailNode — one stop on the head rail.
 *
 * Circular, filled, with a solid bottom edge so it reads as a physical button. The current
 * node carries a halo; a done node a white check badge, so done and locked never read alike.
 *
 * **A locked node is the same button, greyed.** Same size, same fill logic, same edge — only
 * the palette changes. No padlock and no hollow outline: the map never refuses, the stop
 * simply has not been walked yet.
 *
 * `browse` is the district that is there, named, and cannot be started — what a learner with
 * no connection sees. It is *not* locked, because nothing has to be finished first, so it
 * carries its own icon rather than a padlock.
 *
 * `variant="twoDoor"` is the one structural exception in the whole map: a single location
 * holding two districts (Men-Tsee-Khang, 15 and 16). It is wider than any other node and
 * shows two doorways under one label, so the map never has to pretend one building is two
 * places.
 *
 * `circuit` is which pass over the map this node belongs to. On the second circuit a node
 * keeps its finished fill and gains a thin outer arc — the return is drawn as an overlay on
 * a walk already made, never as a reset.
 *
 * `labelSide` keeps labels clear of the connector path, because the winding rail alternates
 * sides. A side label is positioned absolutely so it cannot change the node's box: the rail
 * places nodes at computed points, and a long name must not move the stop.
 */

import {Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle} from 'react-native';

import {Icon, type IconName} from '../core/icon';
import {EDGE_DEPTH, keycap} from '../core/press';
import {
  color,
  elevation,
  fontFamily,
  fontSize,
  layout,
  leading,
  radius,
  space,
  tracking,
} from '../../theme/tokens.generated';
import {TibetanText, mixedTibetan} from './tibetan-text';

/** Fill, content ink and edge per state. */
const STATES = {
  done: {fill: color.railNodeDone, ink: color.textOnAccent, edge: color.teal700},
  current: {fill: color.railActive, ink: color.textOnAccent, edge: color.teal800},
  locked: {fill: color.railNodeLocked, ink: color.ink300, edge: color.ground300},
  browse: {fill: color.ground050, ink: color.ink400, edge: color.ground300},
} as const;

export type RailNodeState = keyof typeof STATES;
export type RailNodeLabelSide = 'bottom' | 'left' | 'right';

/** The wide node's box. Not on the radius scale — it is the map's one exception. */
const TWO_DOOR = {width: 96, height: 64, radius: 18} as const;

/** The halo's and the arc's overhang, per side. */
const HALO_SPREAD = 8;
const ARC_SPREAD = 6;

/**
 * The halo and the second-circuit arc sit low by half the edge depth.
 *
 * The node's solid edge is a shadow: it paints below the button's box without being part
 * of it, so a ring centred on the box alone reads high. The design system drops it by half
 * the depth, and also shrinks that offset while the node is pressed — this does not, because
 * matching it would mean holding press state on the node and re-rendering it and its label
 * on every touch, to move a disc by one point for the length of a tap.
 */
const RING_DROP = EDGE_DEPTH / 2;

/** `--tracking-caps` in points at the label's size. */
const CAPS_TRACKING = parseFloat(tracking.caps) * fontSize['2xs'];

export type RailNodeProps = {
  state?: RailNodeState;
  /** A Tibetan letter, for a Read-track stop. Takes precedence over `icon`. */
  glyph?: string;
  icon?: IconName;
  /** The stop's name. Also the button's accessible name. */
  label?: string;
  size?: number;
  labelSide?: RailNodeLabelSide;
  /** `twoDoor` is one location holding two districts. Nothing else uses it. */
  variant?: 'node' | 'twoDoor';
  /** Which pass over the map. Above 1 the node gains its outer arc. */
  circuit?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A stop on the map.
 *
 * @example <RailNode state="current" glyph="ཁ" label="Letter kha" onPress={enter} />
 * @example <RailNode state="browse" icon="map-pin" label="The Kora" />
 */
export function RailNode({
  state = 'locked',
  glyph,
  icon,
  label,
  size = layout.railNode,
  labelSide = 'bottom',
  variant = 'node',
  circuit = 1,
  onPress,
  style,
  testID,
}: RailNodeProps) {
  const tone = STATES[state];
  const twoDoor = variant === 'twoDoor';
  const width = twoDoor ? TWO_DOOR.width : size;
  const height = twoDoor ? TWO_DOOR.height : size;
  const cornerRadius = twoDoor ? TWO_DOOR.radius : radius.pill;

  const labelStyle: TextStyle = {
    ...LABEL,
    color: state === 'locked' ? color.textSubtle : color.textMuted,
  };
  // Half the rail is named in Tibetan ("prefix ག", "ཡ · kya, gya"). The script goes through
  // TibetanText at its smallest step rather than being uppercased and tracked out with the
  // Latin around it.
  const labelNode = label ? mixedTibetan(label, 'xs') : null;

  return (
    <View style={[NODE, style]} testID={testID}>
      <View style={CENTRED}>
        {state === 'current' ? (
          <View
            aria-hidden
            style={[
              OVERLAY,
              {
                width: width + HALO_SPREAD * 2,
                height: height + HALO_SPREAD * 2,
                borderRadius: twoDoor ? TWO_DOOR.radius + HALO_SPREAD : radius.pill,
                backgroundColor: color.teal200,
              },
            ]}
          />
        ) : null}
        {circuit > 1 ? (
          <View
            aria-hidden
            style={[
              OVERLAY,
              {
                width: width + ARC_SPREAD * 2,
                height: height + ARC_SPREAD * 2,
                borderRadius: twoDoor ? TWO_DOOR.radius + ARC_SPREAD : radius.pill,
                boxShadow: elevation.ringNode,
              },
            ]}
          />
        ) : null}
        <RailNodeButton
          tone={tone}
          state={state}
          width={width}
          height={height}
          cornerRadius={cornerRadius}
          size={size}
          glyph={glyph}
          icon={icon}
          label={label}
          twoDoor={twoDoor}
          onPress={onPress}
        />
      </View>
      {labelNode && labelSide === 'bottom' ? (
        // Hidden from assistive tech: it is already the button's accessible name.
        <Text aria-hidden style={[labelStyle, {maxWidth: width + 40, textAlign: 'center'}]}>
          {labelNode}
        </Text>
      ) : null}
      {labelNode && labelSide !== 'bottom' ? (
        <View aria-hidden style={[SIDE_LABEL, labelSide === 'left' ? SIDE_LEFT : SIDE_RIGHT]}>
          <Text style={[labelStyle, {textAlign: labelSide === 'left' ? 'right' : 'left'}]}>
            {labelNode}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type ButtonProps = {
  tone: (typeof STATES)[RailNodeState];
  state: RailNodeState;
  width: number;
  height: number;
  cornerRadius: number;
  size: number;
  glyph?: string;
  icon?: IconName;
  label?: string;
  twoDoor: boolean;
  onPress?: () => void;
};

function RailNodeButton({
  tone,
  state,
  width,
  height,
  cornerRadius,
  size,
  glyph,
  icon,
  label,
  twoDoor,
  onPress,
}: ButtonProps) {
  const disabled = state === 'locked' || state === 'browse';
  const doorFill = disabled ? color.ground100 : color.teal100;
  const badge = Math.max(Math.round(size * 0.32), 18);

  return (
    <Pressable
      accessibilityRole="button"
      // The name may itself be Tibetan, which a screen reader mangles — but a stop has no
      // romanization of its own, so this is the only name there is.
      accessibilityLabel={label}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({pressed}) => [
        BUTTON,
        {
          width,
          height,
          borderRadius: cornerRadius,
          backgroundColor: tone.fill,
        },
        keycap(tone.edge, pressed && !disabled && Boolean(onPress)),
      ]}
    >
      {twoDoor ? (
        <>
          <View aria-hidden style={[DOOR, {left: 14, backgroundColor: doorFill}]} />
          <View aria-hidden style={[DOOR, {right: 14, backgroundColor: doorFill}]} />
        </>
      ) : glyph ? (
        // Through TibetanText like every other Tibetan string: the leading token applies and
        // its half-leading is symmetric, so the glyph lands on the circle's optical centre
        // without a hand-set line height.
        <TibetanText
          inline
          unit="letter"
          size={size > 56 ? 'lg' : 'md'}
          textStyle={{color: tone.ink}}
        >
          {glyph}
        </TibetanText>
      ) : (
        <Icon
          name={icon ?? (state === 'browse' ? 'map-pin' : 'play')}
          size={size > 56 ? 28 : 24}
          color={tone.ink}
        />
      )}
      {state === 'done' && !twoDoor ? (
        <View aria-hidden style={[BADGE, {width: badge, height: badge}]}>
          <Icon
            name="check"
            size={Math.max(Math.round(size * 0.2), 12)}
            strokeWidth={3}
            color={color.teal700}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

const NODE: ViewStyle = {
  position: 'relative',
  alignSelf: 'flex-start',
  alignItems: 'center',
  gap: space['2'],
};

/** Absolute children with no insets fall back to this alignment, which is what centres them. */
const CENTRED: ViewStyle = {alignItems: 'center', justifyContent: 'center'};

const OVERLAY: ViewStyle = {position: 'absolute', transform: [{translateY: RING_DROP}]};

const BUTTON: ViewStyle = {
  position: 'relative',
  alignItems: 'center',
  justifyContent: 'center',
  // The check badge and the halo hang outside their parents. Stated rather than assumed:
  // Android clips to a rounded background unless overflow is explicit.
  overflow: 'visible',
};

const DOOR: ViewStyle = {
  position: 'absolute',
  width: 26,
  height: 38,
  borderTopLeftRadius: 13,
  borderTopRightRadius: 13,
  borderBottomLeftRadius: 3,
  borderBottomRightRadius: 3,
};

const BADGE: ViewStyle = {
  position: 'absolute',
  top: -3,
  right: -3,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radius.pill,
  backgroundColor: color.ground000,
};

/**
 * Vertically centred on the node without a percentage transform.
 *
 * The design system caps this at 84 with `width: max-content`, which lets a single long
 * word overflow rather than break. React Native has neither, and a `Text` narrower than one
 * word breaks *inside* it — "THE MONASTERY" came out as "THE MONASTER / Y". 104 holds the
 * longest single word in the district set at this size, and anything longer still breaks at
 * a space or a hyphen, which is where it should.
 */
const SIDE_LABEL: ViewStyle = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  justifyContent: 'center',
  maxWidth: 104,
};
const SIDE_LEFT: ViewStyle = {right: '100%', marginRight: space['3']};
const SIDE_RIGHT: ViewStyle = {left: '100%', marginLeft: space['3']};

const LABEL: TextStyle = {
  fontFamily: fontFamily.bodyBold,
  fontSize: fontSize['2xs'],
  lineHeight: fontSize['2xs'] * leading.tight,
  letterSpacing: CAPS_TRACKING,
  textTransform: 'uppercase',
};
