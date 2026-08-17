# 11 · Testing conventions

Written 2026-08-17, after the suite reached 121 tests across 20 files and nothing said
how a test should be shaped. `docs/06-testing.md` is still the authority on _what_ is
tested and at which layer; this document is only about _how a test is written down_.

---

## 1 · Given / When / Then

Every `it()` block marks its phases:

```ts
it('does not fall back to new when taught again', () => {
  // Given
  const met = markTaught(newItem(ITEM));

  // When
  const again = markTaught(met);

  // Then
  expect(again.state).toBe('met');
});
```

**The markers are bare.** No prose appended — not `// Given an item already taught once`.
The `it(...)` name is what carries the meaning and is what has to be self-explanatory;
the markers exist only so the three phases are findable at a glance. Prose on a marker
duplicates the name and makes the body noisier than it was without markers at all.

A blank line separates each phase from the next.

### A single expression is three phases collapsed

The convention is worth having because it forces the act into the open. This

```ts
expect(markTaught(markTaught(newItem(ITEM))).state).toBe('met');
```

says the same thing as the block above and is harder to read, because setup, act and
assertion are nested inside one another. Decompose rather than annotate.

### Where a phase does not exist, omit it

The markers must read `Given?` then one or more `When? Then` — in that order, and
**at least one `// Then` is always required**. The rest are required only where there is
something to mark:

- **No `// Given`** — the whole setup is in `beforeEach`. Say so once in the file's
  `@fileoverview` rather than writing an empty marker in every test.
- **No `// When`** — nothing happens. A guard on a constant asserts a decision; a marker
  for an act that never occurs is a lie about what the test does.

Both are rare. Almost every test has all three.

### A contrast is one test, not two

`When → Then → When → Then` is allowed, and is the shape of a test that states a
difference: render one variant, assert, render the other, assert.

```ts
it('turns audio off for a word not yet reachable', () => {
  // When
  const {unmount} = render(<WordRow status="known" … />);

  // Then
  expect(screen.getAllByLabelText(/Play/).length).toBeGreaterThan(0);

  // When
  unmount();
  render(<WordRow status="coming" … />);

  // Then
  expect(screen.queryByLabelText(/Play/)).toBeNull();
});
```

Five tests are written this way. Splitting each into a pair would say less: the
behaviour under test is the contrast, and two tests asserting halves of it no longer
state that the two cases differ.

### Component tests

A render-and-assert test has all three: **Given** is props and fixtures, **When** is the
`render()` call, **Then** is the assertions. The render is the act.

### Escape hatch

`// test-shape-allow: <reason>` on the line above `it(`, mirroring `adherence-allow:` in
`scripts/check-adherence.ts`. It takes a reason, and the reason is read in review.

### Enforcement

`scripts/check-test-shape.ts`, in `npm run validate` and in the pre-commit hook.

---

## 2 · Where a test file lives

**Colocate**, next to the module it tests:

```
src/domain/item.ts              src/domain/item.test.ts
src/components/learning/word-row.tsx    src/components/learning/word-row.test.tsx
```

One file per module, named for the module. A test file named for a _kind_ of test —
`contracts.test.tsx`, `regressions.test.tsx` — scatters a component's behaviour across
files nobody thinks to open when changing it. Both existed until 2026-08-17 and were
split into 15 per-component files.

Reserve `tests/` for tests whose scope does not belong to one module:

```
tests/integration/    crosses usecase -> engine -> ProgressStore -> MMKV
tests/e2e/            Playwright, against the Expo web build
```

There is no `tests/unit/`. A parallel tree mirroring `src/` is a second thing to
navigate and keep in step, for no gain over colocation.

The useful question is not whether a test is "technically" a unit test. It is **what
boundary am I testing** — one module's behaviour, several pieces working together, or
the application from outside.

---

## 3 · Named traps

These cost a bug each. They are written up once, here, and the tests that defend them
point at this section rather than repeating the reason.

### The state that never reaches the DOM

`accessibilityState` is dropped by react-native-web. It typechecks, it lints, and it
announces nothing — a `TabBar` shipped with four tabs and no current one. Anything
conveying selection, checkedness or currency has to be asserted **as a DOM attribute**,
not as a prop.

Defended by `core/tab-bar`, `core/segmented-control`, `core/tag` and `forms/checkbox`.

### The language that never reaches the DOM

The same failure, one prop over: `accessibilityLanguage` is what a device reads and
never arrives in the DOM, so `lang` has to be set as well or the web target marks
nothing. See `TIBETAN_LANGUAGE` in `src/components/learning/tibetan-text.tsx`.

`tibetan-text.test.tsx` carries two overlapping tests here on purpose — one is the
design system's rule that TibetanText marks its language, the other is this trap.
Deleting either leaves the other looking like a redundant duplicate.

### `flex: 0` is not `width: 0`

`flex: 0` expands to `flex-basis: 0%`, which outranks `width` on a flex item. It
produced a 26pt checkbox indicator that rendered at nothing on web and at 26 on a
device, and typechecked. A fixed-size box states its size and does not also state
`flex`.

Defended by `forms/checkbox.test.tsx`, and by `check-adherence`'s `flex-zero` rule.

### A control inside a control

A button nested in a button is rejected outright by React on web, and on a device the
outer press competes with the control the learner is reaching for. `PairBoard` shipped
this way — a tile that was itself pressable, holding a play control.

Defended by `learning/pair-board.test.tsx`.

---

## 4 · What these tests do not cover

The component suite renders through **react-native-web under jsdom** — see
`vitest.config.mts` for why React Native Testing Library could not be used. These are
DOM assertions, so they prove the web build.

Platform behaviour that differs on a device — Android's nested-`Text` line height, the
native keycap shadow, whether a compressed Tibetan line box clips — is provable only on
a device, and the Android leg of `docs/spikes/2026-08-17-tibetan-rendering.md` has still
not been run. The suite is honest about which half it covers, and that half is not this
one.
