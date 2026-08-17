/**
 * @fileoverview Icon — Lucide, with the brand's stroke rules enforced.
 *
 * The design system's `Icon` wraps Lucide from a CDN and holds the weight optically
 * constant across sizes. Here it wraps `lucide-react-native`, which draws through
 * react-native-svg, and keeps the same `name` strings so a board screen and a route
 * name the same icon.
 *
 * The registry is explicit rather than a namespace import. Lucide ships ~1,770 icons
 * and importing the namespace would defeat tree-shaking for the sake of 34. Naming
 * them also makes `IconName` a closed type, so a typo is a compile error rather than
 * a blank square — which is what the CDN version would have produced.
 *
 * The 34 are exactly the icons used across the design system's components and the
 * six boards, counted from source.
 */

import {
  ArrowRight,
  Award,
  BatteryFull,
  Check,
  ChevronDown,
  Circle,
  CircleAlert,
  CloudOff,
  Columns2,
  Flame,
  Gauge,
  Hand,
  Heart,
  Info,
  MapPin,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Route,
  Search,
  Share2,
  ShoppingBasket,
  Shuffle,
  Signal,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  Type,
  User,
  Volume2,
  Wifi,
  X,
  type LucideIcon,
} from 'lucide-react-native';

/**
 * The design system's icon names, kept verbatim.
 *
 * `alert-circle` is the one that could not be passed through: Lucide renamed it to
 * `CircleAlert`. The design system's name is kept as the key so the boards stay
 * correct, and the rename is absorbed here rather than in 296 screens.
 */
const ICONS = {
  'alert-circle': CircleAlert,
  'arrow-right': ArrowRight,
  award: Award,
  'battery-full': BatteryFull,
  check: Check,
  'chevron-down': ChevronDown,
  circle: Circle,
  'cloud-off': CloudOff,
  'columns-2': Columns2,
  flame: Flame,
  gauge: Gauge,
  hand: Hand,
  heart: Heart,
  info: Info,
  'map-pin': MapPin,
  mic: Mic,
  pause: Pause,
  play: Play,
  'rotate-ccw': RotateCcw,
  route: Route,
  search: Search,
  'share-2': Share2,
  'shopping-basket': ShoppingBasket,
  shuffle: Shuffle,
  signal: Signal,
  'sliders-horizontal': SlidersHorizontal,
  sparkles: Sparkles,
  square: Square,
  star: Star,
  type: Type,
  user: User,
  'volume-2': Volume2,
  wifi: Wifi,
  x: X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Every icon name, for the specimen gallery. */
export const ICON_NAMES = Object.keys(ICONS).sort() as IconName[];

/**
 * Stroke weight per size, so the mark reads at the same weight at 16 as at 28.
 *
 * A constant stroke would look heavy when the icon is small and thin when it is
 * large; this is the design system's own table.
 */
const SIZE_STROKE: Record<number, number> = {16: 2.25, 20: 2.25, 24: 2, 28: 2};

const DEFAULT_SIZE = 24;
const DEFAULT_STROKE = 2;

export type IconProps = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  /** Defaults to the surrounding text colour, as the web original's currentColor did. */
  color?: string;
  /**
   * An icon is decoration by default and is hidden from assistive technology.
   *
   * Pass a label only when the icon is the ONLY carrier of meaning — a bare icon
   * button. Where a visible text equivalent already exists, leave it hidden so it is
   * not announced twice.
   */
  label?: string;
  testID?: string;
};

/**
 * A Lucide glyph at the brand's stroke weight.
 *
 * @example <Icon name="volume-2" size={28} />
 * @example <Icon name="x" label="Leave the lesson" />
 */
export function Icon({name, size = DEFAULT_SIZE, strokeWidth, color, label, testID}: IconProps) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      size={size}
      color={color}
      strokeWidth={strokeWidth ?? SIZE_STROKE[size] ?? DEFAULT_STROKE}
      accessibilityLabel={label}
      // aria-hidden rather than the native-only pair: React Native maps it to
      // accessibilityElementsHidden on a device and to aria-hidden on web, where the
      // native props leak into the DOM and React warns about them.
      aria-hidden={label === undefined}
      testID={testID}
    />
  );
}
