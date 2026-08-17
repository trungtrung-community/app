/**
 * @fileoverview CircuitRing — progress as a kora, not a bar.
 *
 * A walk round rather than a line filling up. The thick inner arc is the first circuit; the
 * thin outer arc is the second pass over the same ground.
 *
 * The rule that shapes it: **a second circuit is an overlay on a walk already made, never a
 * reset.** The inner arc keeps its finished fill while the outer one goes round, because the
 * first walk happened and nothing later un-happens it. That is the same commitment the
 * progression model makes by never demoting an item's state.
 *
 * Drawn with react-native-svg, since arcs are the one thing a View cannot be.
 */

import type {ReactNode} from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import Svg, {Circle, G} from 'react-native-svg';

import {color} from '../../theme/tokens.generated';

const DEFAULT_SIZE = 84;

/** Inset of each ring from the box edge, and its stroke. */
const INNER = {inset: 10, stroke: 5};
const OUTER = {inset: 2, stroke: 2.5};

export type CircuitRingProps = {
  size?: number;
  /** The first walk, 0–1. Clamped. */
  circuit1?: number;
  /** The second pass, 0–1. Clamped. */
  circuit2?: number;
  showCircuit2?: boolean;
  /** A count, or a check once both are closed. */
  children?: ReactNode;
  /** What the ring says, for assistive tech — the arcs themselves are decoration. */
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const clamp = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * Two concentric progress arcs.
 *
 * @example <CircuitRing circuit1={1} circuit2={0.4} label="First circuit done"><Icon name="check" /></CircuitRing>
 */
export function CircuitRing({
  size = DEFAULT_SIZE,
  circuit1 = 1,
  circuit2 = 0,
  showCircuit2 = true,
  children,
  label,
  style,
  testID,
}: CircuitRingProps) {
  const centre = size / 2;
  const r1 = centre - INNER.inset;
  const r2 = centre - OUTER.inset;
  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const f1 = clamp(circuit1);
  const f2 = clamp(circuit2);

  return (
    <View
      accessibilityLabel={label}
      style={[{width: size, height: size}, BOX, style]}
      testID={testID}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={ABSOLUTE}>
        {/* Rotated so both arcs start at twelve o'clock rather than three — a dash offset
            on a circle always begins at three.

            The `transform` string rather than `rotation` + `origin`: the `origin` prop
            leaks to the DOM as a kebab-case `transform-origin` on web, which React rejects.
            A plain SVG transform attribute is understood by both targets. */}
        <G transform={`rotate(-90, ${centre}, ${centre})`}>
          <Circle
            cx={centre}
            cy={centre}
            r={r1}
            stroke={color.ground300}
            strokeWidth={INNER.stroke}
            fill="none"
          />
          <Circle
            cx={centre}
            cy={centre}
            r={r1}
            stroke={color.railDone}
            strokeWidth={INNER.stroke}
            strokeLinecap="round"
            strokeDasharray={c1}
            strokeDashoffset={c1 * (1 - f1)}
            fill="none"
          />
          {showCircuit2 ? (
            <>
              <Circle
                cx={centre}
                cy={centre}
                r={r2}
                stroke={color.ground200}
                strokeWidth={OUTER.stroke}
                fill="none"
              />
              <Circle
                cx={centre}
                cy={centre}
                r={r2}
                stroke={color.teal600}
                strokeWidth={OUTER.stroke}
                strokeLinecap="round"
                strokeDasharray={c2}
                strokeDashoffset={c2 * (1 - f2)}
                fill="none"
              />
            </>
          ) : null}
        </G>
      </Svg>
      {children}
    </View>
  );
}

/** The arcs sit behind; whatever is passed in sits centred on top. */
const BOX: ViewStyle = {flexShrink: 0, alignItems: 'center', justifyContent: 'center'};

const ABSOLUTE: ViewStyle = {position: 'absolute', top: 0, left: 0};
