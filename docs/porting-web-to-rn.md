# Porting a design-system component to React Native

The design system is drawn for the browser. Most of the crossing is mechanical, and the
mechanical part is in the table below. What is not mechanical is collected under it: the
places where a prop or a style is _accepted_ on both targets and _means something
different_, so the component typechecks, lints, and renders wrong.

Every entry below cost a real bug. They are here so the next component does not pay again.

## The mechanical mapping

| Web                         | React Native                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------- |
| `div` / text-bearing `span` | `View` / `Text`                                                                       |
| `button`                    | `Pressable` + `accessibilityRole="button"`                                            |
| `label` + `htmlFor` + `id`  | nothing — there is no label element and no id space. The control carries its own name |
| `input` / `select`          | `TextInput` / no equivalent at all, see Select                                        |
| `onChange(event)`           | `onChange(value)` — there is no event to read                                         |
| `lang="bo"`                 | `accessibilityLanguage="bo"`                                                          |
| `onMouseEnter/Leave` hover  | dropped; `pressed` from `Pressable` replaces it                                       |
| `whiteSpace: nowrap`        | `numberOfLines={1}`                                                                   |
| `cursor`, `wordBreak`       | dropped                                                                               |
| `transition`                | Reanimated, via `useToggleProgress` for on/off                                        |
| CSS `outline` (focus ring)  | `boxShadow: '0 0 0 Npx <colour>'` — layout-free                                       |

## Accessibility state: use the `aria-*` props, never `accessibilityState`

`accessibilityState={{checked, selected, expanded}}` **does not reach the DOM** on
react-native-web 0.21. It is silently dropped, so a tab bar announces four tabs and no
current one, and a switch announces no state at all. Only `disabled` appears, and that
comes from `Pressable`'s own `disabled` prop rather than from the state object.

React Native core accepts `aria-checked`, `aria-selected`, `aria-expanded`,
`aria-disabled` and `aria-valuetext` and maps them into `accessibilityState` on a device.
One prop, correct on both targets:

```tsx
<Pressable accessibilityRole="switch" aria-checked={checked} />   // yes
<Pressable accessibilityRole="switch" accessibilityState={{checked}} />  // silently web-broken
```

The same rule already applied to hiding decoration: `aria-hidden` rather than
`accessibilityElementsHidden` + `importantForAccessibility`, which leak into the DOM and
make React warn on every render. `disabled` needs no `aria-disabled` beside it — passing
the prop is enough on both.

Verify with the DOM, not with a screenshot: these are invisible either way.

## `flexShrink: 0`, never `flex: 0`

The web sources write `flex: "0 0 auto"` on every fixed-size box. The shorthand does not
survive the crossing. `flex: 0` resolves to `flex-basis: 0%`, and for a flex item
`flex-basis` outranks `width` — so on web the box collapses to nothing while Yoga renders
it at its stated width on a device.

This produced an invisible 26pt checkbox that typechecked, linted, and passed a DOM
attribute audit. Only looking at the picture found it.

```ts
const BOX = {flexShrink: 0, width: 26, height: 26}; // yes
const BOX = {flex: 0, width: 26, height: 26}; // collapses on web
```

`flex: 1` is fine — growing is the same instruction on both.

## An `experimental_` style is not a style you can ship

React Native does have gradients, as `experimental_backgroundImage`. **react-native-web does
not implement it**, and an unsupported style is dropped rather than warned about.

That turned `Skeleton`'s sheen into nothing at all on web — not a blunter sheen, nothing —
because the gradient was the band's only paint. A component that is invisible on the
platform the e2e suite runs on is worse than one with harder edges.

The rule that generalises: if an `experimental_` style is the _only_ thing painting an
element, the element has no fallback. Give it a plain floor first, then treat the
experimental value as an enhancement — or skip it, which is usually the right answer.

## Reanimated's easings are native-only

`.easing(...)` on a layout animation logs _"Selected easing is not currently supported on
web. Using linear easing instead."_ and runs linear. The animation still plays; only the
curve is lost, and only on web.

This is a platform gap, not a bug to fix. The curve on a device is the product, so keep it —
but expect the warning in the browser console and do not go hunting for its cause again.

## `pointerEvents` is a style, not a prop

`pointerEvents="none"` on a View is deprecated and warns on every render. It goes in the
style object.

## Fonts do not fall back

A browser silently substitutes a font that has no glyph for a codepoint. React Native does
not: a bundled family draws tofu instead. So a field set in `--font-body` with Tibetan
typed into it renders as boxes on a device even though the board looks correct.

Where content can be either script, choose the family from the content —
`hasTibetan(value)` in `src/domain/tibetan.ts` — rather than naming a stack, which Uniwind
does not support anyway. Flipping is safe: **Noto Serif Tibetan covers all 95 printable
Basic Latin characters**, verified against the bundled 400Regular face, so a mixed string
still renders whole.

## Tibetan in a box of fixed height

`--leading-tibetan: 2.1` is what a _paragraph_ of Tibetan is set at. It is about 25% under
the font's natural metrics, so ink overflows the line box — fine on web and iOS, clipped on
Android. Anything giving Tibetan a fixed height uses `tibetanBox(size)` from
`src/components/learning/tibetan-text.tsx`, which is the measured natural line box.

A single-line `TextInput` is the exception that goes the other way: it never wraps, so
leading has nothing to do in it, and a `lineHeight` on a `TextInput` pushes the text off
the vertical centre on Android. Set the height, not the leading.

## Dynamic class names do not exist

Tailwind scans source text at build time. A class assembled at runtime was never generated,
so it is not a wrong colour — it is no rule at all, and the element renders unstyled.

```tsx
className={label.replace('text-', 'bg-')}          // no such class is ever emitted
className={tone === 'danger' ? 'bg-crown-600' : 'bg-teal-600'}   // both are literals
```

Ternaries between whole literal class names are fine. Anything computed is not.

## Two components own rules the others must not restate

- **Tibetan typography** belongs to `TibetanText`. The one sanctioned exception is an
  editable field: there is nothing to wrap when the text is being typed. Those carry an
  `adherence-allow:` comment saying so.
- **Press behaviour** belongs to `core/press.ts`. A flat control scales; a keycap control
  sinks onto its edge while the edge shrinks by the same amount, so the footprint never
  changes and nothing below it moves.
