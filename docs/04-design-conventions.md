# Trungtrung — Design conventions

*The rules that live outside the design-system code. The DS itself (tokens,
components, lint contract) lives in Claude Design:
`trungtrung-learn-tibetan-design-system-6cf2480d-…`. The screen board is the
source of truth for screens.*

## The contract with the design system

- **A component exists only when all three exist:** `components/<group>/<Name>.jsx`
  + `<Name>.card.html` specimen (every state, `@dsCard` marker) +
  `_ds_manifest.json` entry (and `_ds_bundle.js` block). Drawn-inline is not
  done. Prefer extending an existing component over adding one.
- **Tokens only.** No raw hex, no raw px where a token exists, no `1px solid`
  anywhere, no literal box-shadows (three sanctioned floating cases only).
  If a value has no token, add the token.
- **The lint contract runs.** `_adherence.oxlintrc.json` is wired into CI
  before any code is written; a board/codebase that fails it is not done.
- **Tibetan goes through `TibetanText`.** Every element containing ༀ–࿿.
  It enforces 2.1 leading, the Tibetan size ramp, tsheg-only line breaking,
  and the `roman` `aria-label`. Never hand-set `font-tibetan` or `lang="bo"`.

## Typography & language rules

- Gabarito (display) · Plus Jakarta Sans (body) · Noto Sans Tibetan (+ Serif
  optional editorial). Latin leading 1.55, Tibetan 2.1.
- **Romanization pairing:** Tibetan outside a reference grid is always paired
  with the **Trungtrung romanization** — the `roman` field, one system in both
  tracks (07, 2026-08-09). L5/L6 cells are the named exception.
- **The naming triple:** Tibetan first, then the romanization, then the English
  gloss — everywhere, including grids and tables.
- **THL appears in exactly one place:** an *also written* row on the word sheet
  (V2), for a learner who has met the spelling in a book. It is never the line
  under a word, never in an exercise, never an `aria-label`. It stays in the
  data because dropping it would strand anyone arriving from outside.
- Wylie is labelled `Spelled`, monospace-ish, off by default — never
  presented as an alternative pronunciation.
- Numerals always; words only sentence-initial.

## Buttons, states, chrome

- **Two button skins only:** teal primary and ghost. Nothing else — no white
  shadowed pill, no navy.
- **Leave grammar** (write once, applies everywhere):
  lesson stop `x` → P4 (place kept) · exam `x` → P4, exam wording · chosen
  drill: leaves immediately, ratings kept · sheet: handle/scrim · full-screen
  moment: its own named pair · OS surfaces: hand-off arrows, never mocked.
- **Not-yet state is a waymark** (hollow dotted RailNode), never a padlock.
- Colour-only signals always get a text equivalent (e.g. `19 known · 4 met ·
  1 not yet`).
- Last row in a scroll: bottom inset = docked CTA height + gap.
- Loading = skeleton, never a spinner. Empty states point forward.
- Drills use `n of m` counters; only lesson stops use a progress bar. `n of m`
  is a **position**, not a score — never pair it with a running tally of how
  many were right.
- **No dead ends.** A screen about one member of a set offers its siblings.
  Finishing ར་མགོ must not require two taps backwards to reach ལ་མགོ.

## The device the board does not draw

*Added 2026-08-18, after the first pass on a real iPhone. The board draws a flat 390×760
frame: no Dynamic Island, no home indicator, no keyboard. Everything below is a rule the
frame has no way to state, and each one is here because it was found by holding the phone
rather than by looking at a screenshot.*

- **Insets go on the content container, never on a wrapping `SafeAreaView`.** Content
  should scroll *under* the island with an inset in front of it, which is what iOS does
  everywhere else. A `SafeAreaView` cuts the scroll off at the inset line and leaves a dead
  band. `useSafeAreaInsets()` from `react-native-safe-area-context` is the mechanism;
  `SafeAreaProvider` is already mounted in `app/_layout.tsx`.
- **On a product screen the app bar owns the top inset.** `--appbar-height` is 60pt and it
  sits *below* `insets.top`, not at zero. A screen with no app bar takes the inset itself.
- **Any scroll that contains a field takes `automaticallyAdjustKeyboardInsets` and
  `keyboardShouldPersistTaps="handled"`.** The first lifts the field clear of the keyboard
  on iOS — Android resizes the window instead, through Expo's default
  `softwareKeyboardLayoutMode: 'resize'`. The second is a separate bug: without it the
  first tap on any control with the keyboard open is swallowed dismissing it, so every
  button needs pressing twice.
- **A press must never move anything but the control pressed.** The keycap edge is a
  `boxShadow` and the sink is a `transform`; both are applied after layout, and nothing in
  `press.ts` may set a layout property. It did until 2026-08-18 — see `07`.
- **Tibetan leading is a layout rule, not a `lineHeight`.** `--leading-tibetan: 2.1` sets a
  box tighter than the font's own 2.8, and React Native shaves the top off any glyph that
  does not fit — the margin at 2.1 is 0.04 x the font size, which `བསྒྲིབས` clears and
  `སྤོས་` does not. `TibetanText` therefore renders the font's box and gives the difference
  back with negative margins, so the *occupied* space is still 2.1. A Tibetan block that
  wraps gets 2.8 between its lines rather than 2.1; that is the price and it is rare.
- **A mixed Tibetan/Latin row is taller than a Latin one.** A 14pt Tibetan run cannot sit
  inside a 16pt Latin line without either clipping or growing it. `mixedTibetan` grows it,
  by a fixed amount per size, so that two rows in one card are the same height whatever
  glyphs are in them — an uneven pair was the reported symptom.
- **No `lineHeight` on a `TextInput`.** A single-line field never wraps, so leading has no
  work to do, and setting it throws the glyphs off the vertical centre. The room comes from
  the field's height and its row's `items-center`.

## Feel — motion, sound, haptics

*Added 2026-08-18. The board draws states; it cannot draw the travel between two of
them, and it has no way at all to say "this makes a sound". So this layer is specified
here, where the rules that live outside the design-system code live. The decisions
themselves are in `07`, 2026-08-18.*

- **Motion communicates what happened. It never decorates.** If a movement would not
  survive the question *what did that tell the learner?*, it does not ship.
- **Tokens only, same as colour.** Durations and curves come from
  `src/components/core/motion.ts`, which parses the generated tokens once. A raw `300`
  or a hand-typed bezier is the same class of mistake as a raw hex.
- **One soft overshoot, no wobble.** `easeSettle` is the only curve that passes its
  target, and it is for a thing arriving at rest — never for a thing leaving, and never
  for a colour (see `clamp01`).
- **Reduce Motion is honoured everywhere**, via Reanimated's `ReduceMotion.System`. A
  collapsed animation must leave the state legible: `FlashCard` cuts between faces,
  `RecordButton`'s ring is drawn but still. Nothing is *only* animated.
- **Cues mark outcomes, never taps.** Four moments make a sound: a correct answer, a
  wrong answer, the run, a lesson stop completing. **Nothing else does**, and adding a
  fifth is a decision entry in `07`, not a call site. Ordinary presses answer with the
  keycap sink and nothing more.
- **One haptic, and it is the correct tick.** Nothing for wrong, nothing for a press,
  nothing for navigation. `docs/05`'s line is the whole specification.
- **Sound and haptics are one call.** `cue('correct')` from `src/composition/cue.ts`.
  A screen never reaches for `expo-audio` or `expo-haptics`, so the off-switch cannot be
  forgotten at one call site out of fifty.
- **A cue must never break a lesson.** `cue()` is fire-and-forget and swallows its own
  errors. A tick that fails is silence, not a crash.
- **P2's sound row is the single off-switch**, and it gates the whole class. It is
  separate from Reduce Motion, which is the operating system's to own.

## Teaching surfaces

Three rules that came out of the 2026-08-08 competitor review. All three are
things the reviewed app either does well and we did not, or does badly and we
can do better.

- **The prose contract, for any rule the product states.** A rule headline is
  a phrase, not a sentence. Under it, at most three words of emphasis naming
  the outcome (`THE MIDDLE ONE`). Under that, **one sentence** of explanation.
  Anything longer goes below a fold the learner can ignore. A rule that needs
  two sentences is two rules, or it is not understood yet.
- **Highlight by dimming, not by decorating.** To point at one letter inside a
  syllable, hold it at full ink and drop the others to a muted token. Same
  font, same size, same weight, same baseline — no box, no arrow, no
  underline, no second colour. It reads instantly, it survives small type, and
  it works identically for a root and for an affix. **It is colour-only, so it
  always carries a text equivalent**, per the rule above: the caption names
  what is highlighted (`root ག`).
- **Feedback names the rule, not the verdict.** An answer band says *why*:
  "three letters, and the last is ས — so the first is the root", never just
  "correct". A learner told the verdict has learned one item; a learner told
  the rule can use it on the next one. This is a data contract too — read spec
  §9.0 puts `reason` on every generated exercise.

## Voice

**An answer band reveals only what the prompt withheld** (2026-08-09, from
Thosam's board walk). The test is one question: *is this on screen already?*
V6's prompt is audio and nothing else, so its band **does** reveal the script
and the romanization — that is new information and the point of the beat. S7
shows the Tibetan and asks for the English, so its band restating *"Yes —
ཞིམ་པོ is 'delicious'"* names two things the learner is looking at, next to the
option they just turned green; the romanization is the one thing S7 withheld,
and it is what that band is for.

*This paragraph said "and always names the rule" until 2026-08-16, and asserted
that S7's prompt draws the romanization. Neither survived checking: the board
draws S7's prompt as glyph only, and `docs/03` §2 scoped the rule sentence that
day to the families where the rule* is *the lesson. `S7·✓`'s own slabel cites
this paragraph as the rule it is excepting itself from — which is how a stale
sentence stays load-bearing. `docs/03` §2 is the authority on the band; this
section governs what is on screen, not what a band must say.*

**The replay control belongs to both tones — but only one control per frame**
(amended 2026-08-16). A learner who got it wrong is the one who most needs to
hear it again, and the original complaint here was that V6's wrong band ended
*"Listen again."* with nothing to listen with. That is fixed, and it was fixed
at the prompt: the play button sits above the fold on both tones, so the band
passes `audio={false}` rather than mounting a second one. Where no control is
visible — `S7·✓`, `RB18` — the band keeps its own. And audio is never a reward
for answering: if a card holds Tibetan, it holds a play button before the
answer, not after.

Sentence case; no emoji; at most one exclamation mark in the product (S9's).
Praise the effort, name the thing. No guilt, no loss framing, no
gamification-barker register, no `An error occurred`. Corrections are
neutral and informative (X5's register). `Worth another look`, not "keep
missing"; `Met 3 times, not yet yours`, not "failed". Reviewer-facing
rationale lives in `.slabel`/`.snote` outside the frame — inside the frame,
only copy that ships.

## The mascot

One crane per screen, at rest unless the screen is J4 (the return — in
flight). Sanctioned appearances only: G4, J3, J4, F-A, F-B, O5, B1, X1's exam
gate (at rest), D5, empty states, rule reveals. Never on list screens, never as
wallpaper. Mascot secondary (crown red) = destructive actions only.

*`Q4` was on this list until 2026-08-16 and retired that day; the nothing-due
state it drew belongs to `Q1`, which is a list screen and therefore takes no
crane. `X4·pass` deliberately draws none either — the design system's
`guidelines/exercise-machine.md` carries the same list and must move with this
one.*

## Board authoring

- One board, no new pages; screens appended under their prefix group.
- Frame 390×760; app bar 60px; tab bar 76px; gutters 20px.
- Every screen: `data-screen-label` + `.slabel` stating the reasoning.
- Components via `x-import` from the DS global; real content-spec content
  everywhere — no lorem, no "Word 1".
- Device checks: 320×568 for the tightest layouts; 200% dynamic type for V1
  and G5 (A5); the screen-reader contract is A6.
- OS things (share sheets, pickers, permission dialogs, lock screens) are
  never drawn as screens.
