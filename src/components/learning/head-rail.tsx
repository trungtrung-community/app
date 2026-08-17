/**
 * @fileoverview HeadRail — the brand's navigation motif.
 *
 * Named for the head line (dbu) that Tibetan letters hang from, which is the whole idea: the
 * map is a line you travel along, and the stops hang off it the way letters hang off the
 * dbu.
 *
 * - `winding` — the top-level journey between districts. You travel.
 * - `straight` — inside one district. Letters hang off a head line.
 *
 * The path draws on once over `--dur-rail`, and only the walked part is drawn in the done
 * colour: the track behind it is always fully painted, so the rail never looks unfinished.
 * Under the system's reduce-motion setting it is simply there — which is exactly what the
 * retired "Reduce motion" setting promised, rails appearing without drawing on.
 *
 * React Native has no `getTotalLength`, so the dash length is computed rather than measured:
 * each curve is flattened to line segments and summed. That is a change of method, not of
 * result — the animation needs one number and the geometry is ours, not the DOM's.
 *
 * **`width` is the rail's width, not the component's footprint.** A winding rail hangs its
 * labels outside that box on purpose, so that a long district name cannot move the stop it
 * names. Size the rail to leave room for them — roughly `amplitude / 2 + nodeSize / 2 + 116`
 * either side of centre — or a name will run off the screen rather than off the rail.
 */

import {useEffect, useMemo} from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import Svg, {ClipPath, Defs, Path, Rect} from 'react-native-svg';
import Animated, {
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {duration, easing} from '../core/motion';
import {color, layout} from '../../theme/tokens.generated';
import {RailNode, type RailNodeState} from './rail-node';
import type {IconName} from '../core/icon';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const STROKE = 6;

/** Room above the first node and below the last, so neither is flush to the edge. */
const END_PADDING = 24;

/** How finely a curve is flattened when its length is being summed. */
const FLATTEN_STEPS = 24;

export type RailStop = {
  id?: string;
  state?: RailNodeState;
  glyph?: string;
  icon?: IconName;
  label?: string;
  variant?: 'node' | 'twoDoor';
  circuit?: number;
};

export type HeadRailProps = {
  nodes?: readonly RailStop[];
  variant?: 'winding' | 'straight';
  width?: number;
  nodeSize?: number;
  /** Vertical distance between nodes. */
  gap?: number;
  /** How far the winding rail sways, side to side. */
  amplitude?: number;
  onSelect?: (stop: RailStop, index: number) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The rail, with its stops on it.
 *
 * @example <HeadRail nodes={districts} onSelect={enter} />
 * @example <HeadRail nodes={letters} variant="straight" />
 */
export function HeadRail({
  nodes = [],
  variant = 'winding',
  width = 360,
  nodeSize = layout.railNode,
  gap = layout.railGap,
  amplitude = layout.railAmplitude,
  onSelect,
  style,
  testID,
}: HeadRailProps) {
  const step = nodeSize + gap;
  const centreX = width / 2;
  const height = Math.max(
    step * Math.max(nodes.length - 1, 0) + nodeSize + END_PADDING * 2,
    nodeSize + END_PADDING * 2,
  );

  const points = useMemo(
    () =>
      nodes.map((_, index) => ({
        x:
          variant === 'straight' ? centreX : centreX + (index % 2 === 0 ? -1 : 1) * (amplitude / 2),
        y: END_PADDING + nodeSize / 2 + index * step,
      })),
    [nodes, variant, centreX, amplitude, nodeSize, step],
  );

  const track = useMemo(() => buildPath(points, variant, centreX), [points, variant, centreX]);
  const length = useMemo(() => pathLength(points, variant), [points, variant]);

  // The walked part stops at the current node. `findIndex` returning -1 becomes 0, which is
  // the honest default: nothing walked yet still shows the rail reaching its first stop.
  const currentIndex = Math.max(
    nodes.findIndex(node => node.state === 'current'),
    0,
  );
  const walkedTo = points[currentIndex]?.y ?? 0;

  const drawn = useSharedValue(length);

  useEffect(() => {
    drawn.value = length;
    drawn.value = withTiming(0, {
      duration: duration.rail,
      easing: easing.out,
      reduceMotion: ReduceMotion.System,
    });
  }, [drawn, length, track]);

  const animatedProps = useAnimatedProps(() => ({strokeDashoffset: drawn.value}));

  return (
    <View style={[{width, height}, style]} testID={testID}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={ABSOLUTE}>
        <Defs>
          {/* The done colour is clipped to everything above the current stop, so the walk
              ends where the learner is rather than where the rail does. */}
          <ClipPath id="head-rail-walked">
            <Rect x={0} y={0} width={width} height={walkedTo} />
          </ClipPath>
        </Defs>
        <Path
          d={track}
          stroke={color.railTrack}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        <AnimatedPath
          d={track}
          stroke={color.railDone}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length} ${length}`}
          animatedProps={animatedProps}
          clipPath="url(#head-rail-walked)"
        />
      </Svg>
      {nodes.map((node, index) => {
        const point = points[index];
        if (!point) {
          return null;
        }
        return (
          <View
            key={node.id ?? index}
            style={[
              PINNED,
              {
                left: point.x,
                top: point.y,
                // The node is centred on its point rather than hung from it, so the rail
                // passes through the middle of every stop.
                transform: [{translateX: -nodeSize / 2}, {translateY: -nodeSize / 2}],
                width: nodeSize,
              },
            ]}
          >
            <RailNode
              state={node.state}
              variant={node.variant}
              circuit={node.circuit}
              glyph={node.glyph}
              icon={node.icon}
              label={node.label}
              labelSide={variant === 'winding' ? (index % 2 === 0 ? 'left' : 'right') : 'bottom'}
              size={nodeSize}
              onPress={onSelect ? () => onSelect(node, index) : undefined}
            />
          </View>
        );
      })}
    </View>
  );
}

type Point = {x: number; y: number};

/**
 * The rail's `d`.
 *
 * A straight rail is one vertical line. A winding one is a chain of cubics whose control
 * points sit at the midpoint's height, which is what makes each turn symmetric.
 */
function buildPath(points: readonly Point[], variant: string, centreX: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) {
    return '';
  }
  if (variant === 'straight') {
    return `M ${centreX} ${first.y} V ${last.y}`;
  }
  return points.reduce((d, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    const previous = points[index - 1];
    if (!previous) {
      return d;
    }
    const midY = (previous.y + point.y) / 2;
    return `${d} C ${previous.x} ${midY}, ${point.x} ${midY}, ${point.x} ${point.y}`;
  }, '');
}

/**
 * How long that path is, in points.
 *
 * The straight case is exact. The winding case flattens each cubic into `FLATTEN_STEPS`
 * chords and sums them — the error at 24 steps on a curve this shallow is well under a
 * point, and the number is only ever used as a dash length that animates to zero.
 */
function pathLength(points: readonly Point[], variant: string): number {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) {
    return 0;
  }
  if (variant === 'straight') {
    return Math.abs(last.y - first.y);
  }
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (!from || !to) {
      continue;
    }
    const midY = (from.y + to.y) / 2;
    total += cubicLength(from, {x: from.x, y: midY}, {x: to.x, y: midY}, to);
  }
  return total;
}

function cubicLength(p0: Point, p1: Point, p2: Point, p3: Point): number {
  let total = 0;
  let previous = p0;
  for (let step = 1; step <= FLATTEN_STEPS; step += 1) {
    const t = step / FLATTEN_STEPS;
    const point = cubicAt(p0, p1, p2, p3, t);
    total += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return total;
}

function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

const ABSOLUTE: ViewStyle = {position: 'absolute', top: 0, left: 0};

const PINNED: ViewStyle = {position: 'absolute', alignItems: 'center'};
