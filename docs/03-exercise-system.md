# Trungtrung — The exercise system

*The machine behind every drill. This is the doc Claude Code will consult
most, and the doc most of the unit tests come from.*

## 1. The catalogue

Family = shared layout anatomy; every family behaves identically inside.
Track and mode were inferred from the screen prefix for two years and stated
nowhere; they are columns now, because §7's dossiers turn on both.

| Exercise | Prompt → answer | Screens | Family | Track | Mode |
|---|---|---|---|---|---|
| Listen and pick | word audio → 4 English | V6 | tap-select (text) | Speak | recognition |
| Find the word | English → 4 Tibetan + romanization | V7 | tap-select (text) | Speak | recognition |
| Which one means | Tibetan → 4 English | S7 | tap-select (text) | Speak | recognition |
| Match the pairs | 5 Tibetan (audio+script+romanization) ↔ 5 English | V13 | pair-match | Speak | recognition |
| Phrase recognise | phrase audio → 4 English | E4 | tap-select (text) | Speak | recognition |
| Complete what you heard | phrase audio → transcript, one chunk blank → 4 chunks | E9 | tap-select (chip) | Speak | recognition |
| Order what you heard | phrase audio → its chunks shuffled, +2 decoys → arrange | E8 | chip-arrange | Speak | recognition |
| Say it | word audio → record → compare | V9 | record-compare | Speak | production |
| Phrase produce | English → record → the native take on reveal | E5 | record-compare | Speak | production |
| Flashcards | Tibetan → flip → self-rate | V4/V5, RB4/RB5 | flashcard | both | self-rated |
| Hear it, find it | letter audio → 4 glyphs (same row!) | RB6, R3 | tap-select (glyph) | Read | recognition |
| See it, say it | glyph → 4 sounds | RB7, R5 | tap-select (text) | Read | recognition |
| Find the root | stack → tap the མིང་གཞི | RB9, R8 | tap-select (chip) | Read | recognition |
| What attaches | root → multi-select letters | RB10 | multi-select | Read | recognition |
| Sort what changed | the stop's whole item set → tap the ones the affix changed | RB17 | multi-select | Read | recognition |
| Spot it | written question → 4 glyphs | RB18 | tap-select (glyph) | Read | recognition |
| Build the stack | sound → place parts in slots (incl. vowel slot) | RB12 | build-tray | Read | assembly |
| Read it aloud | syllable → record → compare | RB13, R4 | record-compare | Read | production |
| Read a word you know | glyph word → 4 English | B2 | tap-select (text) | crossing | recognition |
| Exam items | mixed from the above | X2, X4/X4-b | inherit | both | inherits |
| Just listen | none — playback | E7 | passive | Speak | neither |

**Mode is not decoration — it is the firewall's own vocabulary.** Only two
rows say `production`, and both are record-compare, which is imitative and
never scored. Exactly one says `assembly`, and it builds syllables, not
sentences. Everything else is recognition. If a new row ever wants to say
`production` and is not a recording, it is a sentence builder wearing a hat.

Pickers: V3 = 5 modes · E3 = 5 · RB3 = 4 · RB16 = the 3 stack drills.
(V3 was written as 6 here and 5 in §4.6 for a fortnight; the board draws 5 and
that is now the figure. It lost no mode when picture-match went on 2026-08-16 —
picture-match was never on it.)

- **RB8 is retired** (07, 2026-08-16). This section used to say "RB8 stands …
  don't re-drop it", after it was dropped from the board twice against explicit
  restore orders. The reason it kept going is now clear and is not stubbornness
  on anyone's part: **no `find-its-place` exercise has ever existed.**
  `content/json/read/exercises.json` holds zero, and `RB3`'s picker drops empty
  modes, so it would have disappeared at runtime — a third silent removal, in
  code, with nobody signing for it. Retired deliberately instead. The argument
  for it was real (the grid is the rule the stack drills lean on) and can be
  reopened by generating the exercises first, never by drawing the screen again.
- **Picture-match is retired** (07, 2026-08-16), with the `V8` id. Measured
  before deciding: 68 exercises over 68 words — **7% of the roster, 10 of 24
  districts** — and several prompts unillustratable in principle ("hello", "the
  Tibetan language", "heart / mind"). The board had also drawn it as `V7·p` with
  four **English** options, which defeats the one thing it existed to do.
- **Stack distractors differ from the answer in exactly one slot**
  (RB7, RB9, RB10, RB12): same root, different superscript, or same
  superscript, different root. A distractor differing in three slots is not
  a test of anything. The letter analogue is already in the table — glyph
  distractors come from the same row. **`B2` is not in this list** (corrected
  2026-08-15; it was, and wrongly). Its options are English glosses, so the
  slot model cannot be applied to them at all: B2's distractors are other
  words the learner can already read, `distractor_rule: "other words readable
  by section N"` on all twelve records.

## 2. One state machine for every answered exercise

```
unanswered ──tap (single-target) / Check (multi-part)──▶ committed
   committed ─ right ─▶ CORRECT band ──Next──▶ next item
   committed ─ wrong ─▶ WRONG band ──Continue──▶ next item
                         └─ missed item re-enters the queue
                            3–5 positions later, once
```

- **Commit rule.** One right answer to tap → commits on tap, no Check button
  (this removed Check from RB6/RB7/RB9). Multi-part (RB10, RB12, E8) →
  commits on `Check`.
- **Correct band** — teal; reveals only what the prompt withheld (`docs/04`,
  *Voice*); audio replayable, on both tones;
  `Next`. Manual advance everywhere; no auto-advance, no timers.
- **A band names the rule where there is a rule to name** (amended 2026-08-16;
  written 2026-08-08 as a blanket contract over every band). On a wrong answer
  the sentence is the correction; on a right one it is the lesson, which is the
  half usually thrown away. It is generated, never authored on a frame, and it
  never scores — naming a rule is not a grade.

  **It binds to the families where the rule *is* the lesson**, and to no
  others: the glyph and stack drills (`R3`, `RB6`, `RB7`, `RB9`, `RB10`,
  `RB12`), `spot-it`, and `sort-what-changed`.

  **Where it binds, the sentence goes in the headline, not in a second line**
  (2026-08-16, second pass). The 08-16 rewrite said `reason` "is already on
  those records" for the six glyph and stack drills. It is on **0 of 82** of
  them — `find-the-root` 36, `build-the-stack` 41, `what-attaches` 5, all
  empty — and it never was. What the board actually draws is one sentence that
  is verdict and rule at once: `RB9·✗` *"Not quite. One letter on the line —
  the ར underneath belongs to the ཏ, not beside it."*, `RB9·✓` *"Yes — one
  letter on the line, so all of it is root."*, `R8`, `RB6·✗`, `X5` the same.
  Two lines and no separate field, and it reads tighter than the three-line
  version the spec was asking for. **The spec bends to the board**: for these
  families the rule is carried by the headline, and the 82 sentences are not
  authored. Find-the-root's cue-ladder rung (§4.6) goes in the headline too.

  **`reason` survives as a field on `spot-it` alone** — 18 records, and the
  twelve Sanskrit ones (*"It is ཏ drawn backwards."*) are the only copy in
  either dataset that unambiguously earns a second line: they name the source
  letter the glyph mirrors, which is on no part of the screen.
  `sort-what-changed` **lost the field on 2026-08-16**: all 16 records carried
  *"§8 position 5 — the learner sorts the set before being shown it whole"*, a
  citation of this document sitting in the one field the band renders. Nothing
  bound it, so nothing leaked — it would have, the moment the app did what this
  section requires. `RB17·✓` already carried the meaning in its headline.

  **The recognition drills name the answer instead**, which is what `S7·✓`
  draws — it dropped its rule sentence on 2026-08-15, a day before the ruling
  that generalised it. The blanket version was unbuildable and would have been
  noise: `reason` is on **0 of 3,367** Speak exercise records and 18 of 559
  Read ones, and the sentence it implied for a vocabulary drill — *"ཞིམ་པོ is
  the word you heard"* — tells the learner nothing they did not just do.
  Thosam, ruling: *"if it is just text that pollutes the screen without adding
  anything new to the user, then this is just pollution."* `C·8 AnswerBand`'s
  `reason` prop is therefore optional, and a band without one is correct rather
  than degraded.

- **The band mounts no replay control where one is already on the frame**
  (2026-08-16). The band carries its own `AudioButton` by default, and on an
  answered frame the prompt's own play button is usually still visible — two
  controls for one sound. The parked `S13·2a` raised exactly this and left the
  scope open: *"only the second-look round, or every answered band that already
  carries audio above the fold."* **Every band.** The test is literal and the
  caller owns it: if a working play control is visible on the frame, the band
  passes `audio={false}`. Where none is — `S7·✓`, `RB18` — the band keeps its
  own, because `docs/04`'s rule that the replay belongs to both tones is about
  a learner having *some* way to hear it again, not about which element mounts
  it. Most of the board already did this; `V6·✓` and `Stop 1.1 · 10c` were the
  two frames that did not.
- **Wrong band** — neutral ink, never red-saturated. X5's register: `Not
  quite. That's kha — column two, aspirated. Listen once more.` Correct
  option highlighted, chosen one quietly marked, `Continue`.
- **A revealed answer is not retried inside the run — only in the second
  look** (2026-08-08, amending the 2026-08-04 rule that forbade it outright).
  The rule was written against parroting: being shown an answer and asked for
  it back thirty seconds later tests nothing. It was not written against
  *finishing on the thing you got wrong*, which is what §4.4 exists to do. So
  the ban holds everywhere it was aimed — a miss is never re-asked during
  positions 0–4 — and lifts once, at the end, after the rest of the stop has
  sat between the reveal and the retry. **The same sentence lives in the
  design system's `guidelines/exercise-machine.md`; both copies move together
  or the two disagree.**
- **Re-queue** — once, 3–5 positions later. Missed again → the second look;
  missed there too → summary's `worth another look`; the session moves on.
  A session always ends: no hearts, no fail state.
- **A round of unknown length still counts forward.** The progress bar counts
  script positions, done / total. The second look's length is not known until
  the mixed tail ends, so its positions are added to the total at that moment:
  the total goes up once, visibly, and the bar itself never moves backwards.
  This is the existing re-queue rule (`a re-queued item adds a position when
  it re-enters`) applied to a whole round rather than one item.
- **Feedback** — one soft tick for correct, nothing for wrong. Never a buzzer.
- **Partial correctness** (multi-select, build-tray only) — right picks fill
  and stay; wrong picks return; band names what's missing, neutrally.
- **Record-compare** has no correct/wrong: states are `before / recorded /
  compared`; buttons are `Again / Got it` only. Never auto-scored.

## 3. The firewall, restated for exercises

> No exercise ever asks the learner to **assemble** Tibetan from an English
> prompt. No exercise ever offers a choice between grammatical forms.

**Which clause is load-bearing.** The second does the work. The first describes
the shape of a task; the second describes what the learner is asked to decide.
An exercise breaks the firewall when it makes a beginner choose *how they know
what they say* — not when Tibetan appears on a chip.

**Why this used to read "the prompt always includes the Tibetan audio"**
(narrowed 2026-08-16). Taken literally that sentence outlawed `E5`, which
prompts in English and plays the native take on reveal — and `E5` has been drawn
that way, generated that way (all 132 records are `prompt: {en}`), and dossiered
that way in §7 the whole time, so the doc contradicted itself in three places.
Settled on E5's side. **Recalling a phrase you have already been taught whole
and saying it aloud is not assembling it**: there is nothing to choose between,
no forms on offer, and the comparison is against a recording rather than a
grammar. The learner hears the model immediately after, every time. What remains
absolutely barred is being handed English and a set of *parts* — that is the
sentence builder, and it is what the firewall was written against.

- **E8 Order what you heard** — chips are **chunks, not syllables** (O2,
  settled 2026-08-08: the tsheg separates syllables, and ordering syllables
  drills spelling rhythm, not word order). **Two decoy chunks**, drawn from
  another phrase in the same district, differing in *meaning* — amending the
  2026-08-04 "no decoy chips", which made the exercise a jigsaw rather than a
  check. English meaning small under the audio. Wrong → misplaced chips slide
  to position. The moment the prompt is English and the chips build Tibetan,
  the firewall is breached.
- **A copula may be a chip; a copula may never be a wrong answer**
  (2026-08-08). 295 of the 403 chunked phrases carry one, so excluding them left
  47 phrases and no exercise. The learner reproduces the copula they *just
  heard* — one is present, it is the right one, and nothing competes with it.
  What stays forbidden is the thing that was always forbidden: a decoy that is
  a copula, or a blank whose four candidates are grammatical alternatives.
  Either makes the learner pick an evidential. `validate.py` **rule 16b** fails
  the build on both, and it is proven to fire — do not weaken it.
- **E9 Complete what you heard** — one blank, 4 candidate chunks from the same
  district; distractors differ in *meaning*, never grammar. **The blank is
  never a copula.** The answer was heard seconds ago: recognition, not
  production.
- **V13 Match the pairs** — clear the board; wrong pair shakes once, stays.
  No timer, no score, no combo.
- **The gloss** — tap a chunk, see what it means. Tibetan → romanization →
  English, the
  naming triple, in a `Tooltip`. It reads the chunk's `gloss`; where the chunk
  has none it says so plainly rather than showing an empty popover. It is a
  reading aid on surfaces that already show the answer — the phrase card, the
  correct band, E8/E9's transcript, B2 — and **never on an unanswered
  exercise**, where it would hand over the answer.
- Read-track exception: **RB12 builds syllables** — spelling, never
  sentences. Two syllables in the tray = the rule is broken.
- Content impact, **executed 2026-08-08** (this closes O18, which called it
  "unexecuted plan that today reads as shipped"): `exercises.json` holds
  `phrase-arrange`, `phrase-cloze` and `pair-match`, all generated, no new
  authoring and no new recordings. They wait on §6.4a's `chunks[]`, so they
  exist only where the boundaries are settled — `pair-match` is the one of the
  three that is playable before a single take is recorded.

## 4. Session anatomy — the four loops

| Loop | Shape | Chrome | Leaving |
|---|---|---|---|
| **Lesson stop** | S4 → teach cards + exercises interleaved → G4 if a card lands → S8 | progress bar (narrative position) | `x` → P4; place kept |
| **Chosen drill** | picker → items over the chosen set → summary (V10/E6/RB14) | `n of m` counter, never a bar | immediate, no dialog; ratings kept |
| **Exam** | X: family-catalogue items over the section | counter | `x` → P4, exam wording. **Gate opens on completion, not score.** |
| **Review** | mixed due queue, interleaved families → Q3/RB14 | counter | immediate |

Summaries always return to where the drill was entered. Sets follow the
learner's choice whole — no silent cap. A set of 1–2 skips the picker →
flashcards, `1 of 1`.

**A stop belongs to exactly one walk** (decided 2026-08-05). The second
walk adds *new* stops — the district's held-back items, opened by warm-up
reprises of first-walk material; no stop is ever replayed. An S4 on the
second walk introduces a new stop with its own name, never "Stop 2, second
time round".

## 4.1 Inside a lesson stop — the script

*The minute-by-minute experience of the guided loop. The generator builds
each stop's script from its items with this algorithm. Defaults — Thosam
reviews before build. The lens for every rule: the stop names an outcome,
and every screen must move the learner toward it.*

```
input: a stop — vocabulary V (≤10), phrases P (≤4), reprises R
script:
 0  WARM-UP     if R non-empty: one recognition exercise per reprised
                item (max 3). The stop opens with success on familiar
                ground — this is how second-walk stops differ.
 1  S4 INTRO    names the stop and its OUTCOME, not its contents:
                "After this stop you can order tea — and say when to
                stop." Capability circles shown empty. Resume variant:
                bar part-filled, "Carrying on where you left off."
 2  TEACH-AND-CHECK, in batches of 2–3 words (spec order):
      a. one WORD CARD per word — Tibetan large, the romanization,
         English, illustration if any, register tag, audio plays once
         + replayable, a slower pass one tap away. One button: Continue.
      b. then ~2 recognition exercises per word over just that batch
         (listen-pick first — the ear before the eye; then
         then meaning-pick). Distractors from this stop.
 3  PHRASE BLOCKS, after all contained words are taught:
      S5 phrase card (natural + slow, literal gloss, usage note)
      → phrase-recognise. Arrange/cloze (E8/E9) may substitute on
      later meetings. Phrase-produce: at most one per stop, never a
      phrase's first exercise, always near the end.
 4  MIXED TAIL  one exercise per item over the whole stop, shuffled,
                preferring types the item hasn't seen. Re-queued
                misses land here.
 5  SECOND LOOK if anything is still missed: §4.4. Skipped entirely
                when nothing is — the stop must be able to end
                without one.
 6  S12 MOMENT  the stop is done, said once and warmly. §4.5.
 7  S8 END      the capability circles fill; what you can now say,
                replayable; counts, never scores; items still missed
                named quietly as `worth another look`.
 8  CARDS       G4 → G3 per artifact found in this stop, paged
                `1 of n`. 73 of 185 stops hold one; 112 hold none and
                end at position 7. Then back to D1.
```

**The artifact moved to the end** (2026-08-08). It used to interrupt at
position 2c, rising the moment an artifact word's card was shown. Two
reasons it moved: it broke the teach-and-check rhythm mid-batch, and a card
that arrives *because you finished* rewards more than one that arrives because
you scrolled past a word. Position 8 is where it pays off.

Rules the script obeys:

- **Heard before tested — two clauses, and they are not the same rule.**
  (a) A **new** item's first exercise is **audible** — usually `listen-pick`,
  and `phrase-recognise` in the handful of stops that hold no word to open on,
  since its prompt is the phrase's own audio; (b) production never precedes
  recognition, for any item, anywhere. A reprised item was heard in the stop
  that taught it, so (a) does not bind it — reading the two as one rule flags
  correct content. **The test is audibility, not a type name** (2026-08-16):
  `validate.py` rule 25 asks whether the opening prompt carries audio, which
  still fails the silent `meaning-pick` opener that O16 was written against.
- **"A slower pass" is the same clip, not a second recording** (2026-08-17).
  Every item has exactly one take. The control replays it at **0.65× with pitch
  correction**, which `expo-audio` does natively on both platforms, so a word
  and its slow reading cannot drift apart and 587 human takes leave the critical
  path. The one thing rate change cannot do is put a pause *between* syllables,
  which a human slow reading does naturally; the `audio` object keeps room for a
  real slow file if the native review ever asks for one on a specific long
  phrase.
- **(a) binds the generated script, not the substituted one** (2026-08-16). No
  recordings exist yet: **2,040 of 3,367 exercises carry `blocked_on: "audio"`,
  including all 1,041 `listen-pick`**, so under audio-free substitution (§A1)
  every stop currently opens on `meaning-pick` — the board states this outright
  and calls it "every stop's normal state, not a mode". That is legal. The rule
  is asserted over the script the generator produces, which is what
  `validate.py` rule 25 reads and why it passes; the substitution runs
  afterwards, at play time, and a substituted opener never violates it. **Do
  not** read (a) as a bar on running the app before the ~1,830 takes exist —
  read it as a bar on *generating* a stop that opens on the eye. When the
  recordings land, the substitution stops firing and nothing about the script
  changes.
- **Every new item is met ≥3 times in its stop** — card + two exercises
  minimum — before S8 can call it `met`. The stop's **new** items only: a
  reprise is material, not an item to be met again, and a rule-only stop
  (§4.2), whose `items` list is empty, satisfies the rule vacuously rather
  than violating it.
- **≤2 record-compare screens per stop** (mic fatigue is real), never
  first, never consecutive.
- **The progress bar counts script positions**, done / total. A re-queued
  item adds a position when it re-enters, and the second look adds its own
  when the mixed tail ends; the bar only ever moves forward.
- **Length target: 3–6 minutes** (Speak: ~25–40 positions; Read letter
  stops run 18–19, the Wylie stop 11 — the minutes are the rule, the
  position count is not). The generator flags a stop whose script exceeds
  it — the fix is splitting the stop, never cutting an item's meetings.
  The second look returns every miss and is not capped (§4.4), so a bad run
  can push a stop past the target — deliberately, and the fix is splitting
  the stop rather than truncating the round.
- **The script assumes the stop has items.** A stop that teaches a rule and
  introduces nothing takes the rule-only variant (§4.2) — track-neutral,
  though the Read track found it first.
- Leaving via `x` → P4 keeps the position; re-entry uses the S4 resume
  variant.

**Board gaps this exposed — all drawn**: the word card is the **S10 family**,
six frames including the no-illustration, no-Tibetan and variant-form cases;
**S4** has its outcome-first copy and four variants (postcard, second walk, no
phrases, resume); the **Stop 1.1 strip** samples the script in **14 frames**
(this said "one full stop script end to end, eleven frames" until 2026-08-16 —
it is neither eleven nor complete, and the board's own preamble says the strip
samples and that positions between the drawn ones are implied). O19 **closed**
on 2026-08-08 on proposal B, no marker on the word card; it was described here
as unpicked for a week afterwards.

**The strip's words are stale, and the strip is the fidelity reference.** Its
preamble names the stop's vocabulary as *trashi delek · roknhang · lakso ·
sungwa*; `content/stops.json`'s `stop.core.c1.1` holds `tashi-delek`, `yes`,
`slowly` and `to-talk`. Only one of four matches — `roknhang` and `lakso` belong
to no stop, and `sungwa` is not a vocabulary record at all. Corrected by board
order; do not read the drawn cards as the stop's contents in the meantime.

## 4.2 Inside a Read stop — the script

*The Read counterpart of §4.1, adopted from the Read content spec (§8) —
this document owns behaviour. The script was written as a mirror of §4.1's
shape; the input caps (letters ≤4, stacks ≤8) are the Read stop's sizing
rule, as V ≤10 / P ≤4 are Speak's.*

```
input: a stop — letters L (<=4), stacks K (<=8), rules R, reprises P
script:
 0  WARM-UP     if P non-empty: one recognition exercise per reprised
                item (max 3). Familiar ground first.
 1  INTRO       names the stop and its OUTCOME, not its contents:
                "Four letters. By the end you can read the ka row on
                sight." Capability circles shown empty.
 2  RULE CARD   if the stop introduces a rule: the C-card that carries
                it (§5.3), before any item that needs it. Never after.
 3  TEACH-TIP-CHECK, in batches of 2-3 items:
      a. one LETTER CARD or STACK CARD per item — glyph large,
         letter_name, its place in the grid, audio, one Continue.
      b. one TIP, once per batch. A named script position, not
         decoration: the shape mnemonic, the confusable it is nearest,
         or the rule's shortcut ("the prefix takes the breath away").
      c. ~2 recognition exercises over just that batch — hear-it-find-it
         first (the ear before the eye), then see-it-say-it.
 4  ASSEMBLY    from section 7 on: one build-the-stack over this stop's
                items. One syllable in the tray, always.
 5  MIXED TAIL  one exercise per item over the stop, shuffled, preferring
                types the item has not seen; re-queued misses land here.
                CLOSES with one SORT WHAT CHANGED over the stop's whole
                item set (RB17) — the enumeration arrives once, after the
                items have been drilled, not before them.
 6  END         the RECAP TABLE (R11): every combination this stop taught,
                the changed ones marked, each one playable. Then capability
                circles fill; items missed twice named quietly as `worth
                another look`; back to the section hub.
```

(§5.3 in the RULE CARD line is the Read content spec's — the C-card's
anatomy lives there; "section 7" is the Read map's, where stacks begin.)

**Every §4.1 rule binds here unchanged** — heard before tested (both
clauses), ≥3 meetings for new items, ≤2 record-compare, the forward-only
bar, the 3–6-minute target, `x` keeps the position. Only the Read deltas
follow:

- **RB17 closes the mixed tail; it does not open it** (07, 2026-08-16). This
  section and the 2026-08-15 entry both said it opened, and called the order
  deliberate. The board and `content/json/read/stops.json` had it at position 24
  of 25 all along, and they are what a coder builds from. Settled the board's
  way: **the enumeration arrives once, after the items have been drilled** —
  sorting what changed is a summary, and a summary before the work is a preview
  of an answer. `R11`, the recap table, still closes the stop after it.
- **TIP (position 3b)** — one per batch, and a named script position, not
  decoration. The one addition to the Speak shape: a letter is a shape
  before it is a sound, and the script otherwise has nowhere to say "this
  is the one with the flag on the left".
- **A tip states the procedure; it never enumerates the outcomes**
  (Thosam, 2026-08-15). A tip may say *what to do with every item* — "nothing
  you hear is the ད; cover it and read what is left" — and may point at the
  shape or the confusable in front of the learner. It may **not** work through
  which letters change and which do not. That is a table, and a table
  delivered one row at a time over three screens is what produced the two
  longest tips in the track: 47 words explaining a letter from the *previous*
  batch, and 69 words carrying three unrelated rules. **Enumeration moves to
  positions 5 and 6** — the learner sorts the set themselves, then sees it
  whole. Roughly 38 of the 122 tips are enumerative and are the ones this
  applies to; the remaining 84 are single observations, mnemonics,
  confusables and exceptions, and they stay exactly as they are.
- **A stop's batching stops being load-bearing, and that is the point.** The
  fault under those two tips was that `stop.3.1` split its two nasals across
  batches 2 and 3, so no tip could teach the nasal rule where it happened.
  Regrouping the batches by phenomenon was the obvious fix and is **not**
  taken: it would reorder every stop, renumber every position, and make the
  walk read as a sorted syllabus. Consolidating at the end makes mid-lesson
  batching irrelevant instead of tidy.
- **RULE CARD (position 2)** — the C-card that carries the stop's rule
  comes before any item that needs it. Never after.
- **ASSEMBLY (position 4)** — from Read section 7 on: one build-the-stack
  over the stop's own items, and one syllable in the tray, always (§3's
  Read edge — spelling, never sentences).
- **`teach_check`** — position 3c's exercise type is per stop, not fixed.
  Default hear-it-find-it; Read section 8 sets build-the-stack, because no
  tap-select can be generated there. *Heard before tested* holds either
  way: the clause says a new item's first exercise is **audible**, and
  build-the-stack is prompted by a recording.

**Section 8 is re-scoped by the cue ladder** (2026-08-08). Its three stops used
to be *find the root · the order to read in · any syllable*, with nothing
saying **how** to find a root. They now follow read spec §4.6's rungs: stop 1
teaches the two cues you can *see* — a lone line letter, and the letter
carrying the vowel mark or the stack — which between them settle 81% of the
vocabulary; stop 2 teaches counting the line, and the honest residue where the
shape cannot decide; stop 3 keeps `R-PROC` and absorbs the worked examples.
Find-the-root exercises carry the rung that settles them, and the band says it.

**Section 10, *Reading real text*, is new** and sits before the final test,
which becomes section 11. Its first stop is a rule-only stop (below) — tsheg,
shad and nyis-shad introduce no items with a sound. Its second teaches the six
letters outside the thirty as **recognition only**: they may be an answer to
"which of these is ཎ", never a chip in a tray.

**The rule-only stop.** The script above assumes a stop has items. Some
nodes teach a rule and introduce nothing — Read section 2's ninth node is
the Wylie unit, whose only new content is `R-WYL`; section 5's second
suffix, section 9's numerals and section 10's *the page* are the same shape.
Such a stop
takes a variant, and the difference is not cosmetic — running the main
script over it would present cards for letters the learner already knows
and then claim to have taught them:

```
 0  WARM-UP     up to 3 recognition exercises over already-taught material.
 1  INTRO       as above.
 2  RULE CARD   the C-card. This is the stop.
 3  TIP         one.
 4  CHECK       one recognition exercise per material item.
 5  END         capability circles fill.
    — no letter cards, no assembly, no record-compare: nothing is new to say.
```

Its `items` list is empty and its `reprises` list carries the material, so
the ≥3-meetings rule is vacuous rather than violated. That is the honest
shape, not a loophole: a stop with no new items genuinely has nothing to
meet three times.

## 4.3 The training ground — free drill, outside the walk

*Thosam's, 2026-08-06, from how he actually learned to read: Tibetan
children's books against a metronome, training the mind to get the
syllables right.*

Not an exercise family and not a stop — a **surface**, and the Read track
needs it for a reason the stop loop cannot cover. A stop teaches an item to
the point of recognition and moves on; reading fluently is not recognition,
it is the reflex that turns a shape into a sound before you have thought
about it. That reflex is built by volume, and the walk is deliberately not
built for volume.

```
 1  a card, one syllable, large. Nothing else on it.
 2  the learner says it aloud. No input, no prompt.
 3  they reveal — the recording plays and the reading appears.
 4  they mark it: got it / not yet.
 5  `not yet` goes back into the pile. `got it` leaves it.
 6  next card. The pile never empties by itself; the learner leaves
    when they leave, and leaving is not quitting.
```

**What it is not:** not scored, not graded — no run length, no personal
best, no streak. Nothing about it may be lost by stopping. The never-do
list is not relaxed here; this surface is where it would be easiest to
break, so it is stated twice.

**The piles** — anything already taught, drawn from the generated dataset
and nowhere else:

| pile | source | count today |
|---|---|---|
| the thirty | `letters.json` | 30 |
| letter × vowel | `syllables.json` family `grid` | 120 |
| stacks | `stacks.json` | 199 |
| stacks × vowel | `syllables.json` family `stack-grid` | 604 |
| the endings on one root | `syllables.json` family `demo` | 34 |
| every root, every ending | `syllables.json` family `ending-grid` | 2,064 |
| real syllables | `syllables.json` families `worked` + `corpus` | 246 |
| whole words | `words.json` | 452 |

**Four of those rows are new on 2026-08-18, and they are why the dataset grew.**
A stop teaches an item to recognition and moves on; reading fluently is the
reflex that turns a shape into a sound before you have thought about it, and
that is built by volume the walk is deliberately not built for. So the pile
needs forms the walk never drills — and a card it can show has to be a card
someone recorded, which is what took the Read track from 543 takes to 3,481.

None of it is curriculum. No stop names a single one of these items, and the
walk still generates 44 stops, 1,003 positions and 559 exercises — unchanged.
That invariant is the check: if adding pile material moves an exercise count,
it has leaked into the walk.

`ending-grid` is legal in full because §4.3's `root_constraint` is null at high
confidence — any of the ten suffixes follows any of the thirty. That is the
finding that refuted L4 and L5, and it is what makes the grid a grid.

The learner chooses a pile, or takes everything. **An item enters its pile
only after the stop that teaches it** — otherwise the training ground
becomes a way to meet content out of order, the one thing the walk exists
to prevent.

**The metronome** (decided 2026-08-07; the matching never-do amendment in
`docs/01` is signed the same date). A pacing instrument, never a timer:

- **Off by default.** The learner turns it on; it is never on when they
  arrive.
- **The learner sets the tempo**, and can change it mid-drill.
- **At the set tempo the pile advances to the next card** — the next
  syllable — automatically. Advancing is pacing, never scoring.
- **Nothing is scored, compared, or lost by stopping.** No run length, no
  personal best, no accuracy; falling behind has no consequence, and
  leaving mid-drill is leaving, not quitting.
- If any condition is dropped, the exception lapses and the feature goes
  with it (`docs/07`, 2026-08-07).

**Where it lives:** a fifth mode card on Q1, the practice tab — RB3 and
RB16, the Read pickers, keep their drills — plus a door from the Read
section hub. Never a new tab. Drawn as Q6, metronome state Q7; Q7's slabel
still carries a pre-signature `[PENDING]`, which clears next board round.

## 4.4 The second look — finishing on what you got wrong

*Position 5. Added 2026-08-08. The stop used to end by naming your misses and
offering nothing to do about them; a learner left on the one thing they could
not do. This is the round that fixes that, and it is the only place in the
product where a revealed answer comes back.*

```
input: the stop's misses M — items answered wrong at any position 0–4
script:
 a  skip entirely if M is empty. Most stops end here.
 b  a transition, once: the crane, and one line naming the work
    without naming a failure — "Two worth another look."
 c  for EVERY item in M, in the order it was missed: the exercise
      it was missed on, again, carrying a `Second look` badge so
      it is never mistaken for a fresh item.
 d  a miss here is not re-queued and does not repeat. It goes to
    S8's `worth another look` and to the due queue, as before.
```

Rules this round obeys:

- **Every miss returns. There is no cap** (Thosam, 2026-08-08, reversing the
  cap of four this section shipped with). If the round exists to send the
  learner away having done the thing, returning four of six chooses two things
  for them to leave undone. **The consequence is stated rather than
  engineered around:** a stop where ten things went wrong runs well past the
  3–6 minute target, and it does so exactly when the learner is struggling. If
  that proves wrong in testing, the fix is splitting the stop — never
  truncating the round.
- **The same exercise, not a new one.** This is what Thosam chose on
  2026-08-08 over re-meeting the item in a different family: if the point is
  to leave having done the thing, it has to be *the* thing. The gap between
  reveal and retry is the rest of the stop, which is what makes it a test
  rather than a parrot.
- **It is never a gate.** Getting them wrong again ends the stop just the
  same. No stop can be failed; there is nothing here to fail.
- **The copy never frames a deficit.** `Two worth another look`, never "2
  mistakes", never "you missed 2". The glossary owns that phrase and it is
  the same phrase the summary and the practice tab use, deliberately — one
  name per concept.
- **One exclamation mark in the product, and this is not it.** The register
  is calm and forward: this is the last thing before the stop ends well.

## 4.5 How a stop ends — three beats

*Positions 6, 7 and 8. Decided 2026-08-08. The stop used to end on one screen
that both celebrated and accounted; splitting it lets each beat do one job.*

| # | Screen | Job | Shows |
|---|---|---|---|
| 6 | **S12** the moment | say it is done, once, warmly | one line naming what was walked · confetti · `Continue` |
| 7 | **S8** the recap | what you can now do | capability circles filled · the phrases you can now say, each replayable · counts |
| 8 | **G4 → G3** the cards | give something to keep | the artifact found here, then its cultural note |

- **Confetti fires here and nowhere else** (2026-08-08, amending the never-do
  list). On S12 only — not on the cards, where a quiet arrival is the whole
  effect, and not on drills, exams or reviews, which are not stops. A stop is
  the narrative unit; that is the same reason it is the only loop with a bar.
- **No number on S12.** Counts belong to S8, where they are counts and not a
  verdict: `6 words met · 2 worth another look`. `docs/04` allows a count
  exactly where it forbids a percentage.
- **S8 is the fallback ending.** 112 of 185 stops hold no artifact, so
  position 8 simply does not run. Both paths must exist; neither is degraded.
- **Cards page `1 of n`.** One stop holds as many as five.
- **Drills and reviews keep their own summaries** (V10, E6, RB14, Q3) and get
  none of this. They have a counter, not a bar, and no narrative to close.

## 4.6 The drill machine — one loop, three parameters

*Added 2026-08-15. §4's table names the chosen drill as one of the four loops
and stops there. `V3`, `E3` and `Q2` are that loop three times over, each with
its pool welded in — which is why a fourth pool had nowhere to land: `Q1`'s
"Pick a district" rows arrived on `D1`, whose primary action starts new
material, and the district's only practice entry sat unrouted in an overflow.
The fix is not a fourth picker. It is that the loop takes arguments.*

```
pool  × selection   → set
set   + mode        → runner   (n of m counter, never a bar)
runner              → summary  (V10 · E6 · RB14 · Q3)
```

**Pool** — what the set is drawn from: everything · one district · one material
type within a district · one stop. **Selection** — which of the pool: all · due
today · still getting. **Mode** — which exercise family runs over the set.

Every surface below is this machine with different arguments. None is a
separate feature, and a new pool costs a scope, not a screen:

| surface | pool | selection | modes |
|---|---|---|---|
| `Q2` mixed review | everything | due today | interleaved, scheduler's order |
| `Q5` weak words | everything | still getting | as `V3` |
| `Q8` | one district | all · still getting | words and phrases interleaved |
| `V3` | one district, words | all · still getting | 5 |
| `E3` | one district, phrases | all · still getting | 5 |
| `Q8` from a done stop | one stop | all · still getting | as `Q8` |

**`Q1` is the pool picker for this table, and nothing else** (2026-08-15).
The Practice tab root chooses a pool — one row per district met, plus one
row for pool `everything` + selection `still getting` — and hands off. It
runs nothing itself and holds no mode. It had been drawing three arguments of
this machine as three unlike cards, which is what made it unreadable; the
order that fixes it is `claude/board-prompt-practice-2026-08-15.md`, and it
also draws `Q8`, specified here since 2026-08-04 and never on the board.

**Pool is a filter, not a field** — all 3,367 Speak exercises carry `stop`, and
every stop names its district. Nothing is regenerated to scope a drill.

Rules the machine obeys:

- **A mode is drawn when the set can fill it, and carries its count.** Otherwise
  it is absent — never greyed, never padlocked, never "coming soon"; `docs/01`
  forbids all three. Absence is honest and needs no explanation; a disabled card
  is an explanation nobody asked for.
- **Minimum fill is per mode, not global.** `V13` wants five distinct pairs a
  board (§7), so a set of four cannot offer *Match the pairs* however willing
  the learner is.
- **A set of 1–2 skips the picker** → flashcards, `1 of 1`. That rule is §4's
  and is not restated differently here.
- **An empty set is said, not filled.** `Q1`'s register — one line, no counts,
  no consolation. The machine never manufactures a session, at any pool. *(This
  cited `Q4` until 2026-08-16; `Q4` retired that day and `Q1` owns the state by
  being a short list rather than by gaining a mode.)*
- **Scope changes nothing about what is legal.** §3's firewall binds every mode
  at every pool: vocabulary stays recognition-only, phrases stay whole, and no
  prompt asks a learner to build Tibetan from English because the set got
  smaller.
- **No silent cap** (§4). A mode absent for want of items is a *stated* absence —
  the picker shows counts on everything it does draw, so the learner can see the
  shape of the set rather than infer it.

**What the counts actually look like, and why the fill rule earns its place.**
Generated figures, recomputed on every build — no screen hard-codes one:

- **At district scope the rule is nearly idle.** Departure is the only district
  of 24 that generates an empty mode (`pair-match`, 0). Every district is thin on
  `phrase-produce` — 2 to 5 — because §4.1 caps it at one a stop; that is a cap
  working, not a gap.
- **At stop scope it does real work.** Five of The Monastery's eight stops
  generate no phrase exercises at all, so all four phrase modes are absent there;
  and `pair-match` is 2 at nearly every stop, below `V13`'s board of five. A stop
  picker that always drew seven modes would be wrong more often than right.

**Fails when:** a mode is drawn that the set cannot fill, or a set is padded from
outside its pool to fill one. Both turn a stated scope into a lie, and the second
is worse — it is the drill quietly teaching another district's material under
this district's name.

## 5. Answered-state coverage

One drawn specimen per layout family (~8 frames); all siblings inherit by
rule. Canonical: V6 (text tap-select). Others: RB6 glyph, RB10 partial, RB12
misplacement, E8 slide-to-position, V13 mid-board, V9/RB13 record-compare,
X4-b revealed final. *(V8 picture and RB8 grid cell are gone with the two
exercises retired 2026-08-16.)*

Three specimens the 2026-08-08 work adds: **E8 with its decoys** (a chip that
belongs to no slot has to read as available, not as an error), **the second
look badge** on an otherwise ordinary answered frame, and **the gloss open**
over a phrase card. `docs/09` gap #2 tracks the sweep, which stood at 5 of ~10
before these.

**`AnswerBand` is extracted — done, not proposed** (verified 2026-08-16). The
2026-08-15 export ships `AnswerBand.jsx` and `AnswerBand.card.html`, and `C·8`
is its specimen. This section and `docs/07` both went on calling the extraction
"proposed, not done" after it had landed. It exists because every
correct/wrong band on 56 exercise frames used to be a hand-written
absolutely-positioned block, and `docs/04` says a reused pattern is promoted or
it does not exist.

**Two states still have no specimen and cannot inherit one.** `RB17` is a
multi-select over the stop's whole item set, with a band exception nothing else
has; and `E5`'s **pre-record** state is undrawn, which is exactly where the
firewall question lives (see §7's dossier — the prompt must carry the audio, not
only the English). Both are in the board order; until they land, an implementer
inventing them is inventing, not inheriting.

## 6. The progression model (defaults — override deliberately)

- **Item states:** `new` → `met` (taught in a stop) → `known` (correct in two
  different sessions on two different days).
- **Due:** intervals 1, 3, 7, 21, 60 days. A miss steps back one notch,
  never to zero. `Due today` = items past interval.
- **Worth another look:** missed ≥2 in the last 7 days.
- **Days walking:** any day with ≥1 completed stop/drill/review. Cumulative.
- No number in this model is ever shown as a score; no interval is ever
  shown at all.

## 7. The dossiers — one entry per exercise

*Added 2026-08-08. §1 says what each exercise is; §2 and §3 say how they all
behave. Neither said what any single one is **for**, which is the first thing
a designer or a test needs. These are those answers. Behaviour is inherited
from §2 by family and is not restated — a dossier says only what is true of
this exercise and not of its siblings.*

Every entry carries the same six lines. **Outcome** is the load-bearing one:
if an exercise cannot name what the learner can do afterwards that they could
not do before, it is not an exercise, it is a screen. **Fails when** is the
falsifiable half — the condition under which this exercise stops testing
anything, written so a reviewer can check it.

**Speak — vocabulary.**

**V6 · Listen and pick** — *Speak · recognition · tap-select (text)*
**Outcome:** the learner hears a word cold and knows what it means. This is
the ear arriving before the eye, and it is the mandated first meeting for
every new word.
**Prompt:** word audio, replayable; a slower pass one tap away.
**Answer:** four English options, commits on tap, no Check.
**Distractors:** three words from this stop, same semantic field.
**Without audio:** substitutes to V7 over the same four options (A2).
**Fails when:** the distractors come from another field — "enough / yak /
Tuesday / hammer" is a vocabulary test only in the sense that a coin toss is.

**V7 · Find the word** — *Speak · recognition · tap-select (text)*
**Outcome:** the learner meets the English and recognises the Tibetan that
carries it, which is the direction reading and listening actually run in.
**Prompt:** English. **Answer:** four Tibetan options, the romanization always
beneath.
**Distractors:** as V6.
**Without audio:** unaffected — this exercise is already silent.
**Fails when:** the romanization is dropped to make the options harder. Difficulty
comes from the distractors, never from hiding how a word is said. **O15 is
closed** (2026-08-08): S7 runs Tibetan → English, which is the direction
reading and listening actually run in, and the English-prompt direction lives
only in V7, a drill family. This table was the stale copy.

**V13 · Match the pairs** — *Speak · recognition · pair-match*
**Outcome:** the learner holds five words at once and sorts them, which is
the first exercise that tests a *set* rather than an item.
**Prompt:** five Tibetan tiles (script + romanization, each with its own play
control) against five English. **Answer:** clear the board; `ceil(set ÷ 5)`
boards, then the summary. **The last board is filled back** from the district's
own words when the set does not divide by five — rule 16 wants five distinct
pairs, and a short board would trip it. The generator floored until 2026-08-09,
which cost 31 stops their board and 284 words any appearance on one.
**Distractors:** none — every tile belongs. The difficulty is holding five.
**Without audio:** fully playable. The one new type that works before a
single take is recorded.
**Fails when:** it grows a timer, a score or a combo. It is a board that
empties, and an empty board is the whole reward.

**V9 · Say it** — *Speak · production · record-compare*
**Outcome:** the learner hears themselves next to a native take and judges
the gap. Nothing else in the product does this.
**Prompt:** the native audio. **Answer:** record, compare, `Again / Got it`.
**Without audio:** hidden entirely; there is nothing to compare against.
**Fails when:** anything scores it. No waveform verdict, no match percentage,
no pass. The learner is the only judge, and the recording is gone after.

**V4/V5 · Flashcards** — *both tracks · self-rated · flashcard*
**Outcome:** the learner rehearses at their own pace with no right answer to
get wrong — the surface for a low-confidence day.
**Prompt:** Tibetan. **Answer:** flip, then `Again / Got it`.
**Fails when:** a third rating appears. Two buttons, never four; the
scheduler infers the rest.

**Speak — phrases.**

**E4 · Phrase recognise** — *Speak · recognition · tap-select (text)*
**Outcome:** the learner catches a whole phrase at speaking speed and knows
what was said. This is the phrase's first exercise, always.
**Prompt:** full-phrase audio, a slower pass one tap away.
**Answer:** four English options.
**Distractors:** three other phrases from this stop.
**Without audio:** substitutes to a script-prompted variant (A2/A4).
**Fails when:** the options differ in length rather than meaning — a learner
who picks the long one has learned to count, not to listen.

**E8 · Order what you heard** — *Speak · recognition · chip-arrange*
**Outcome:** the learner shows they heard a phrase *as words*, not as one
undifferentiated noise — the step between recognising a phrase and using it.
**Prompt:** full-phrase audio, English meaning small beneath.
**Answer:** its chunks, shuffled, plus two decoys; commits on `Check`.
**Distractors:** two chunks from another phrase in the same district,
differing in meaning. **Never a copula.**
**Without audio:** cannot substitute — the prompt *is* the audio. Hidden.
**Fails when:** the prompt is English and the chips build Tibetan. That is
the firewall, and it is the only way this exercise can breach it. A copula
among the chips is fine; a copula among the decoys is a breach.

**E9 · Complete what you heard** — *Speak · recognition · tap-select (chip)*
**Outcome:** the learner locates one word inside a phrase they just heard —
finer-grained than E4, with no assembly at all.
**Prompt:** full-phrase audio and its transcript, one chunk blank.
**Answer:** four chunk options, commits on tap.
**Distractors:** three chunks from the same district, differing in meaning.
**The blank is never a copula.**
**Without audio:** hidden.
**Fails when:** the four candidates are grammatical alternatives. Then the
learner is picking an evidential, which is the one thing a beginner must
never be asked to do.

**E5 · Phrase produce** — *Speak · production · record-compare*
**Outcome:** the learner says a whole phrase aloud and hears how close they
got. At most one per stop, never a phrase's first exercise, always near the
end.
**Prompt:** English, plus the native take on reveal.
**Answer:** record, compare, `Again / Got it`.
**Fails when:** it is scored, or it arrives before the learner has heard the
phrase. Production never precedes recognition, anywhere.

**E7 · Just listen** — *Speak · neither · passive*
**Outcome:** the learner soaks in a section's phrases with no task at all —
the surface for a commute. Section-level, background playback.
**Prompt:** the audio. **Answer:** none.
**Fails when:** it grows a question. The moment it tests, it is not this.

**Read.**

**RB6/R3 · Hear it, find it** — *Read · recognition · tap-select (glyph)*
**Outcome:** the learner maps a sound onto a shape — the Read track's opener,
ear before eye, exactly as V6 is for Speak.
**Prompt:** letter audio. **Answer:** four glyphs, commits on tap.
**Distractors:** from the same row of the grid.
**Fails when:** the four glyphs come from four different rows. The row *is*
the lesson; a distractor from elsewhere tests nothing about it.

**RB7/R5 · See it, say it** — *Read · recognition · tap-select (text)*
**Outcome:** the learner reads a glyph and knows its sound. The name says
"say" and the answer is a tap — the mic is RB13's job.
**Prompt:** one glyph. **Answer:** four romanized sounds.
**Distractors:** differ in exactly one slot.
**Fails when:** a distractor differs in three slots and the answer is
obvious by elimination.

**RB9/R8 · Find the root** — *Read · recognition · tap-select (chip)*
**Outcome:** the learner finds the མིང་གཞི inside a stack, which is the single
skill the whole Read track is built to deliver.
**Prompt:** a stack, root highlighted by dimming the rest.
**Answer:** tap the root chip.
**Distractors:** the stack's own other letters.
**Fails when:** the band names the verdict instead of the rung of the cue
ladder that settles it. This exercise carries `reason` for that purpose.

**RB10 · What attaches** — *Read · recognition · multi-select*
**Outcome:** the learner knows which letters can attach to a given root —
a set, not a fact.
**Prompt:** a root. **Answer:** multi-select, commits on `Check`.
**Partial correctness applies:** right picks fill and stay, wrong picks
return, the band names what is still missing.
**Fails when:** partial state is scored. It names what is missing; it does
not count what was found.

**RB12 · Build the stack** — *Read · assembly · build-tray*
**Outcome:** the learner spells a syllable they heard — the one composition
exercise in the product, and the reason the firewall names an exception.
**Prompt:** a recording. **Answer:** place whole letters into slots,
including the vowel slot; commits on `Check`.
**Fails when:** two syllables reach the tray. One syllable, always. This is
spelling, never sentences, and the distance between those is the firewall.

**RB13/R4 · Read it aloud** — *Read · production · record-compare*
**Outcome:** the learner voices a syllable and compares. Read's twin of V9.
**Fails when:** it is scored, or there are more than two per stop.

**RB17 · Sort what changed** — *Read · recognition · multi-select*
**Outcome:** the learner produces the rule themselves. Having met each item
separately, they see the stop's whole set at once and decide which the affix
changed — which is a different act from being told, and the one the three
enumerating tips were failing to provoke.
**Prompt:** every combination the stop taught, together, **bare** — the root
letter against the affixed form, both playable. `Which of these did the ད
change?`
**Answer:** multi-select, commits on a Check; §2's machine, unchanged.
**Bare, not the drill form** (Thosam, 2026-08-15). Section 3 *drills* a vowelled
syllable because a bare string cannot be sounded on its own, but the rule is
about the combination, and every prefix-demo syllable already carries
`demonstrates` naming the bare stack it stands for. So the sort compares
ག `khaa` → དག `ga`, not གུ `khuu` → དགུ `gu`. Two reasons: it shows the general
case rather than one vowel's instance of it — **ད + བ is `wha` bare and `u` only
under ཞབས་ཀྱུ, so the ུ set was showing the exception and hiding the rule** — and
it makes section 3 read like section 6, which already pairs a root letter
against its stack.
**Distractors:** none — every item belongs. The difficulty is that the set is
mixed: `stop.3.1` splits four changed against two unchanged (དཀ `ka` and
དཔ `pa` stand; དག `ga`, དང `ngha`, དམ `mha`, དབ `wha` move).
**Without audio:** playable — the romanization beside each form carries the
contrast. Weaker, because the point is a sound, and it degrades to comparing
two spellings; it does not break.
**Fails when:** the bare form is absent. *Did this change?* is unanswerable
without the thing it changed from, and a learner who cannot compare is being
tested on whether they remember Section 2. It also fails if the answer band
names the three behaviours — that is `R11`'s job, one screen later, and doing
it twice makes the recap a repeat instead of a reveal.

**RB18 · Spot it** — *Read · recognition · tap-select (glyph)*
**Outcome:** the learner can name a glyph by what it *does*, not by how it
sounds — which is the only way punctuation can be tested at all, since a tsheg
has no pronunciation to hear.
**Prompt:** a written English question naming a function — `Which mark
separates one syllable from the next?` This is the one drill whose prompt is a
question rather than a stimulus, because the thing being asked about is a job
rather than a sound.
**Answer:** four glyphs, one right, commits on tap. §2's machine, unchanged.
`RB6`'s anatomy exactly — four glyph tiles, one band — with the audio prompt
replaced by text, which is also why it is the only Read drill that works
identically in audio-free mode.
**Distractors:** the four marks the curriculum does *not* teach — ༔ ༄ ༅ ༴
(Thosam, 2026-08-16, keeping them). They are real marks a reader meets in real
text, and a wrong answer that is a plausible unseen glyph tests the function
rather than the memory of a list.
**Where it runs:** Section 10 only, and it is **the whole of Section 10** —
`stop.10.1` is six of these over the three taught marks, `stop.10.2` twelve over
the six Sanskrit letters. Nothing else in the Read dataset drills either set, so
retiring this type would leave the last section before the final test teaching
and never checking.
**Without audio:** unaffected. The prompt is already text.
**Fails when:** the question names the glyph instead of its job (*"which one is
the tsheg?"* tests nothing but the label), or when a decoy is a mark the answer
could also legitimately be.

**R11 · The recap table** — *Read · not an exercise · the stop's END*
**Outcome:** the learner sees the system whole, once, at the moment they have
earned it — every combination this stop taught, what each became, and which
moved. This is the surface the enumerating tips should always have been.
**Shows:** one row per item — bare root, the affix form, the reading, playable;
the changed ones marked. Scrolls when the set is long.
**Scope:** **what this stop taught, never the full set.** Section 6's stop 1
teaches 8 of the 12 stacks that take ར; the recap shows 8. The other four —
རྟ `ta`, རྩ `tsa`, རྙ `nhya`, རྫ `dza` — are reference and live on `L2`/`L6`,
where browsing ahead is the point rather than a leak. §4.3's rule binds: an item
enters a learner's surfaces after the stop that teaches it.
**Fails when:** it grows a score, or it pads to the full set to look complete.
A recap that shows four rows the learner cannot read is a syllabus, not a
recap — and it would put `རྫ` *dza*, unchanged, on the same screen whose rule
statement claims a superscript takes the breath out of ཛ.

**B2 · Read a word you know** — *crossing · recognition · tap-select (text)*
**Outcome:** the learner reads, in script, a word they already say — the
moment the two tracks touch, and the emotional payload of the whole crossing.
**Prompt:** a word in uchen. **Answer:** four English options.
**Fails when:** the word is not decodable from the rules taught by that point.
Then it tests recall of a shape rather than reading, and the crossing is a
coincidence instead of a capability. **O9 closed 2026-08-08 on option B** —
readable is every letter met and every rule taught, track-independent, and the
Speak roster gates nothing.

**X2/X4/X4-b · Exam items** — *both · inherits · inherit*
**Outcome:** the learner demonstrates a section's worth of material in one
sitting. Nothing here is new; the families are the ones above.
**Chrome:** a counter, never a bar — nothing fills up on the highest-anxiety
screen in the product.
**Fails when:** a pass mark appears **on a section exam**. `X2` and `X4-b` open
on completion, not score. **`X4`, the final test, is the exception and the only
one** — 90% to pass, drawn as a percentage, signed 2026-08-16 when the never-do
list's percentage clause was dropped for exactly this surface. Under the mark
withholds nothing: no content locks, and the retake is the primary action on
the same screen (`X4·retake`). *(This line read "a pass mark appears" flat until
2026-08-16, a week after X4 was drawn with one.)*

## 7.9 Retired — do not reinstate without a decision-log entry

Both were live entries in §7 above until 2026-08-16. They are kept, rather than
deleted, because the reasoning is what stops a third round: `RB8` had already
been cut twice against explicit restore orders, and the record of *why it kept
coming back* is the only thing that answers the next person who wants it back.

**V8 · Match the picture** — **retired 2026-08-16** (07). *Speak · recognition ·
tap-select (picture grid)*. Only artifacts have illustrations, so the exercise
reached 68 words — **7% of the roster, across 10 of 24 districts**. Its screens
are parked at `V7·p` / `V7·p✗`; the `V8` id stays retired and is never reused.
*Original dossier:* the learner ties a word to a thing rather than to an English
gloss — the only exercise that skipped English entirely. Prompt: one
illustration; answer: four Tibetan options; distractors must themselves have
illustrations, from the same district; unaffected without audio. It failed when
the illustration was tinted, crossed or shaken on a wrong answer — images are
never marked wrong, the band carries the correction.

**RB8 · Find its place** — **retired 2026-08-16** (07). *Read · recognition ·
tap-select (grid cell)*. `content/json/read/` holds **zero** find-its-place
records and always did; the grid is taught by `C2` instead. `RB3` drops to four
modes with it. Its screen is parked; the `RB8` id stays retired.
*Original dossier:* the learner internalises the grid as a place with
coordinates, which is what every stack rule later leans on. Prompt: a glyph;
answer: tap its cell in the empty grid. Its stated failure mode was *"it is
dropped again"* — which is now what happened, by decision rather than by drift,
and that is the difference this section exists to record.
