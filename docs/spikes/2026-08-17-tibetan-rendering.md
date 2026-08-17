# Phase 0 spike — Tibetan rendering in React Native

_Run 2026-08-17. Expo SDK 57.0.13 · React Native 0.86.2 · Noto Serif Tibetan 400/500
· uniwind 1.11.0. Specimen screen: `app/index.tsx` (throwaway; becomes a dev route or
is deleted once the results below are absorbed)._

**Status: web leg complete. iOS and Android legs NOT RUN — this machine has no Xcode
and no Android SDK.** The two native legs are the ones that can still change the
answer on clipping, line breaking and `boxShadow`; see "Outstanding" below.

Specimens are real records from `content/vocabulary.json`, never hand-typed strings —
a typed stack can be malformed in ways a pipeline record is not.

## 1. Shaping — PASS

All five stack specimens shape correctly. `བསྒྲིབས` renders `སྒྲི` as a true
three-deep stack; `ཧྲཱིཿ` keeps subjoined `ྲ`, the long vowel and the visarga;
`ཀྲ`, `སྐུ` and `སྤྱི` are each one line letter as drawn.

This was the make-or-break question for the product and it passes. Nothing downstream
is blocked on script support.

## 2. Vertical metrics — the 2.1 rule is a compression, not an expansion

**Noto Serif Tibetan's natural line height is ≈2.8 × font size**, measured with
`lineHeight` unset:

| size | natural line box | ratio |
| ---- | ---------------- | ----- |
| 14   | 40               | 2.86  |
| 17   | 48               | 2.82  |
| 22   | 62               | 2.82  |
| 30   | 84               | 2.80  |
| 44   | 124              | 2.82  |

So `--leading-tibetan: 2.1` sets the line box _tighter_ than the font asks for. With
2.1 applied, ink exceeds the line box by a consistent **≈0.35 × font size**:

| size | box (2.1×) | ink | overflow |
| ---- | ---------- | --- | -------- |
| 14   | 29         | 34  | +4       |
| 17   | 36         | 41  | +5       |
| 22   | 46         | 54  | +7       |
| 30   | 63         | 73  | +10      |
| 44   | 92         | 108 | +15      |
| 68   | 143        | 167 | +24      |

**No glyph is clipped on web** — overflow is visible, and every stack draws in full at
every size. Multi-line blocks at hero size separate cleanly with no collision.

**Consequence for the components:** a Tibetan block's ink extends ≈0.35 × font size
beyond its layout box. Any layout that puts something immediately below Tibetan needs
that headroom — `AnswerBand`, `WordRow`, `FlashCard` and tight card layouts especially.
This is a padding rule to apply deliberately, not a bug to fix.

## 3. `fontWeight` is ignored for bundled families — PASS with a consequence

Three renderings of `བཀྲ་ཤིས` at 44px:

| variant                                 | measured width |
| --------------------------------------- | -------------- |
| control — `400Regular`, no `fontWeight` | 123px          |
| A — `400Regular` + `fontWeight: '700'`  | **123px**      |
| B — `700Bold` family, no `fontWeight`   | **132px**      |

A is pixel-identical to the control. React Native selects a face by family name and
does not synthesise weight, so **every weight must be addressed as its own family**.

Two consequences, both load-bearing for Phase 2:

- The design system's composed `--type-*` roles cannot emit
  `font-family` + `font-weight`. Each must resolve the (family, weight) pair to a
  single registered family name.
- **Uniwind's `font-bold` / `font-medium` utilities are inert** on text using a bundled
  family. Weight has to travel through the `@utility` type roles, never through a
  weight utility composed onto a family utility.

This also independently confirms decision 5: Uniwind's own rule is "single font only,
no fallbacks", so `--font-tibetan`'s three-family stack could never have worked in RN
regardless of Noto Sans Tibetan not being published.

## 4. Uniwind resolves unitless leading — PASS, and simpler than planned

`className="text-[22px] leading-[2.1]"` produced a 46.2px line box, identical to the
StyleSheet control `lineHeight: 22 * 2.1`. `className` itself works.

**This revises the plan.** Phase 2 does _not_ need to emit computed px line-heights;
`--leading-latin: 1.55` and `--leading-tibetan: 2.1` can stay unitless as the design
system writes them. One less transform, one less place to drift.

## 5. Tsheg line breaking — INCONCLUSIVE, needs the native legs

Two results, one good and one not:

- **The zero-width space after each tsheg is a no-op on web.** Chromium already treats
  U+0F0B as a break opportunity, so the treated and untreated columns rendered
  identically. `བཀྲ་ཤིས་བདེ་ལེགས`, `བརྩོན་འགྲུས་ཆེན་པོ` and `དུས་ཚོད་ཀྱི་རེའུ་མིག`
  all broke correctly after a tsheg in both columns.
- **A long phrase overflowed instead of wrapping.** `སྤྱི་སྤྱོད་རླངས་འཁོར` at 22px in
  a 140px column stayed on one line and ran past the box edge — in _both_ columns.
  Breaking at its final tsheg would still leave line one over 140px, so a correct
  greedy break should have come one syllable earlier. It did not.

`TibetanText` may therefore need explicit segmentation rather than relying on a break
opportunity, but that decision should not be made from the web leg alone: web is the
platform whose breaking we care about least, and iOS and Android use entirely different
text engines. **Do not implement a fix until the native legs run.**

## 6. The keycap edge — `boxShadow` works

`boxShadow: '0 4px 0 0 #12595E'` with `translateY(2px)` on press is visually identical
to stacking two Views, and needs one View instead of two. Prefer it. The two-View
stack stays the known-good fallback if native disagrees.

## 7. letterSpacing is px, not em

`--tracking-caps: 0.08em` at 12px is 0.96px and reads correctly on a Latin label.
Applying `letterSpacing: 2` to `བསྒྲིབས` visibly distorts the stack, which is the
measured basis for the design system's `--tracking-tibetan: 0` rule.

## 8. Font packages

`@expo-google-fonts/*` ship **static instances, one TTF per weight** — which is what
the plan wanted, and the only thing that works given finding 3.

- `@expo-google-fonts/gabarito` — 400…900
- `@expo-google-fonts/plus-jakarta-sans` — 200…800 plus italics.
  **`PlusJakartaSans_500Medium_Italic` is required**: `TibetanText`'s `roman` line is
  `italic var(--weight-medium)`.
- `@expo-google-fonts/noto-serif-tibetan` — 100…900
- `@expo-google-fonts/noto-sans-tibetan` — **does not exist.** Both Tibetan tokens
  resolve to the serif face.

## Outstanding — needs a device

Run on a phone with Expo Go (`npx expo start`, scan the QR) or install Xcode /
Android Studio. The three questions only the native legs can answer:

1. **Clipping.** Web overflows visibly; iOS and Android clip `Text` differently, and
   Android in particular has a history of cutting tall glyphs when `lineHeight` is
   below the font's natural metrics. Finding 2 says we are 25% below them.
2. **Line breaking.** Finding 5's anomaly needs iOS and Android before `TibetanText`
   is written.
3. **`boxShadow`.** Confirm it renders on New Architecture native, not just web.
