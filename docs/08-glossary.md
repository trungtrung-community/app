# Trungtrung — Glossary

*One name per concept. If two names exist for one thing, one of them is wrong.*

## The journey

- **Track** — Speak or Read. Two routes through one walk, switched inside the
  Journey tab, never separate tabs.
- **Section** — a phase of a track. **Speak: 5** sections of the journey,
  learner-facing *Into Town · Around Lhasa · The Circuit · Living Here ·
  Out of the Valley*. **Read: 10** sections of the script, named for what
  they teach (*The four vowels · The thirty letters · …*). Track-scoped: the
  two do not correspond (read spec §1).
- **District** — a place, not a topic; 24 of them. "The Tea House", never
  "Food & Drink".
- **Stop** — one lesson sitting inside a district (~6–10 words, 2–3 phrases).
  Learner-facing word for what code may call a lesson. Never "unit",
  "chapter", "module". Open naming note (flagged 2026-08-07): the roster
  holds 150 stops, a fixed figure; generation currently produces 175 sitting
  records, a moving generated figure. Whether a
  learner-facing "stop" is the roster stop or the sitting is deliberately
  unadjudicated.
- **Walk** — one pass over the 24 districts. Learner-facing: *first walk,
  second walk, second time round*. Internal/data name: `circuit-1`,
  `circuit-2`. Never say "circuit" to the learner — Section 3 is named
  "The Circuit" and the collision is why.
- **The crossing** — the designed moments where the two tracks meet (B1–B4):
  reading a word you already say.
- **Readable** — a word the learner can decode: **every letter met and every
  rule taught** (option B, ruled 2026-08-08, closing O9). Track-independent —
  a read-only learner has a readable count too — and the Speak roster gates
  nothing and changes nothing the learner sees.
  The count is always computed, never stored.
- **Node** — a waymark on the Read map: 42 stops + 2 exams = 44 nodes. A
  rule-only node teaches a rule and introduces no items — a shorter thing
  than a full stop, not a different one.
- **The Printing House** — District 23 of the Speak walk, and the Read
  track's one place.
- **Men-Tsee-Khang** — districts 15+16, one building with two doors; a single
  map node.

## Learning objects

- **Item** — a vocabulary record or phrase record.
- **Vocabulary** — browsable, drillable words. Nouns, adjectives, numbers,
  quantifiers, determiners, adverbs, postpositions, particles and
  interjections. **Never copulas** — yin/red and yö/duk are the evidentiality
  distinction itself.
- **Verb card** — a vocabulary record with `pos: verb`, permitted only when it
  is recognition-only and names at least one **carrier phrase** that already
  taught the verb whole (content spec v3 §7.2 rule 7). Marked **[V]** in the
  spec. Never produced, never assembled from English.
- **Carrier phrase** — a phrase that states a verb in its own English, so the
  learner meets the verb inside an utterance rather than as a citation form.
  What §2.1 asks for in place of a bare stem.
- **Phrase** — a fixed utterance, drilled whole, never assembled.
- **Fixed set** — a pattern expanded into one concrete phrase per member
  (`expanded_from`), so the learner never composes. The only open templates
  are District 2's `my-name-is` and `im-from`.
- **Artifact** — a cultural object the learner finds and keeps: a churn, a
  khata, a mani stone, a torma. Marked **[A]** in the content spec, carries a
  `cultural_note` and an `illustration`, and belongs to exactly one collection.
  **"Found at…", never "unlocked".** Renamed from *collectible* on 2026-08-08
  — that word carried the sticker-album flavour `01-vision` bans, and the flag
  had come to mean "this word has a cultural note", which is how a greeting, a
  minibus and a radish came to sit in the collection.
  **The test:** *does this teach a Tibetan who grew up in the West something
  about being Tibetan they would otherwise miss?* A churn passes; a radish
  does not. People never qualify, however culturally particular the word.
- **Cultural note** — the writing on a record, held as `note_lines`, **one
  idea per line**. The first two show on the card; the rest sits behind a
  fold. Any word may carry one; only an artifact turns it into a card.
- **Grouped card** — one card teaching a whole **system**: zodiac (12),
  day-names (7), prayer-flag colours (5), humours (3). Never split, and judged
  as a system rather than member by member — the zodiac card is the
  twelve-year cycle, not twelve animals. *Siblings (4) is deliberately not one:
  its insight is about grammar, and its members are people.*
- **Seed / payoff** — a long thread planted early and paid off later (Dawa →
  day-names; the five colours → prayer flags → elements).

## Progression

- **Item states** — `new` (never met) → `met` (taught in a stop) → `known`
  (correct in two sessions on two different days). Status dot: hollow / grey
  / teal, always with a text equivalent.
- **Due** — a known item past its review interval (1, 3, 7, 21, 60 days; a
  miss steps back one notch, never to zero). Intervals are never shown.
- **Worth another look** — missed twice or more in the last 7 days. Never
  "words you keep missing", never "failed".
- **Days walking** — any day with ≥1 completed stop, drill, or review.
  Cumulative, never resets. The only streak-like number, lives in You.

## Language & script

- **Romanization** — *the* romanization, and there is only one: the Trungtrung
  system, in the `roman` field, on every learner-facing surface in both tracks
  (07, 2026-08-09). Answers *how do I say this*. Generated by
  `scripts/content/romanize.py` from `content/read/sounds.json`; a form that
  cannot be read from its spelling is reported, never invented.
- **THL** — THL Simplified Phonetic, in the `thl` field. Kept in the data and
  shown in exactly one place, the *also written* row on the word sheet, for a
  learner who has met the spelling in a book. Never the line under a word.
- **Wylie (EWTS)** — transliteration, generated from `bo`, never hand-typed.
  Labelled `Spelled`, off by default. Answers *how is this written*.
- **Register** — `colloquial` / `honorific` / `neutral`. Honorific is not
  optional politeness; it attaches to the **person being spoken about**.
  **A card has no referent, so a card is plain** (ruled 2026-08-08): the word
  card teaches མིང not མཚན, ནང not གཟིམ་ཁང, and the honorific lives in the
  phrases, where somebody is actually present. Thirteen cards were swapped;
  the 135 honorific phrases did not move. **Humble is the exception** — ཞུ་བ
  and the verbs taking it describe your own action towards someone, so there
  is no third party's honorific to remove and the plain form is the blunt one.
  Marked on the V1 row; **not** marked on the word card (O19, proposal B).
- **Evidentiality firewall** — the rule that keeps Tibetan's speaker-knowledge
  marking invisible at A1–A2: no copulas as vocabulary, recognition-only
  exercises, prompts always include the heard Tibetan audio.
- **Tsheg** — the syllable delimiter (་). Lines break only at tsheg;
  breaking mid-syllable is a spelling error, not a typographic one. It
  separates **syllables, not words**: nothing separates words, and that is the
  fact Read Section 10 exists to teach.
- **Shad / nyis-shad** — `།` closes a clause or sentence, `༎` closes a section
  or verse. Taught with tsheg in Section 10 (read spec §3.3).
- **Uchen / umé** — headed (printed) / headless (handwritten) script. The app
  teaches uchen.
- **Stack** — a syllable assembled from **prefix, superscript, root
  (མིང་གཞི), subscript, vowel, suffix and second suffix** — seven slots, of
  which only the root is required. Building one is spelling, never
  sentence-building.
- **Trungtrung romanization** — the app's own romanization, decided
  2026-08-06: two devices, each marking only the unexpected case — a
  **doubled vowel** for low where the spelling would read high (ག *khaa*
  against ཁ *kha*), an **inserted h** for high where the letter is normally
  low (རྔ *ngha* against ང *nga*). Supersedes THL on every learner surface in
  both tracks. Machine form: `content/read/sounds.json` (read spec §2.2a); a
  `connected` block there carries what changes inside a word.
- **Letter** — one of the thirty consonants, the four vowel marks, or the ten
  numerals. The Read track's unit of vocabulary; 44 of them, plus the 120
  letter × vowel syllables they generate.
- **Letter name** — the mark's traditional name, whose audio take is the name
  itself. Derived from the Trungtrung romanization — ག's letter name is
  *khaa* (read spec §2.2a, §7.1). Never THL, which collapses aspiration in
  four of the eight rows and so cannot name the letters.
- **Row / column** — the thirty are eight rows of four:
  *unaspirated · aspirated · voiced · nasal*. The columns are real for rows
  1–4 only; rows 5–8 are not a contrast set.
- **Combiner** — the umbrella noun for a **superscript** or a **subscript**:
  a letter that attaches to a root without being one. Seven of them, and each
  has a traditional name the product must use: ཡ་བཏགས་ *ya-tak*, ར་བཏགས་
  *ra-tak*, ལ་བཏགས་ *la-tak*, ཝ་ཟུར་ *wa-zur* below; ར་མགོ *ra-go*, ལ་མགོ
  *la-go*, ས་མགོ *sa-go* above. Never "modifier", never "attachment". A
  prefix and a suffix are **not** combiners — they sit on the line beside the
  root rather than stacking with it.
- **Line letter** — a position the eye reads left to right: a prefix, the
  stack column, a suffix, a second suffix. A superscript, its root and its
  subscripts share **one** line letter; a vowel mark is not one. This is the
  unit the cue ladder counts, and `བསྒྲིབས` has four of them (read spec §4.6).
- **Cue ladder** — the six ordered cues for finding the root: check the first,
  and only if it does not fit, check the next. Not a list of tips — an
  ordered procedure, and the order is what makes it work. Its wording lives in
  `scripts/audit/root_cues.py`, which is also its proof (read spec §4.6).

## Exercises (see 03-exercise-system.md)

- **Family** — a shared layout anatomy (tap-select, chip-arrange, pair-match,
  multi-select, build-tray, flashcard, record-compare, passive). Every family
  behaves identically inside.
- **Commit** — the moment an answer locks: on tap (single-target) or on
  `Check` (multi-part).
- **Re-queue** — a missed item returns once, 3–5 positions later.
- **Chunk** — the word-sized unit of a phrase. The tsheg separates *syllables*,
  and nothing in Tibetan separates words, so `chunks[]` is the dataset saying
  where the words are (spec §6.4a). A chunk is what E8 shuffles, what E9
  blanks, and what the gloss opens on. Never "token", never "word chip" — and
  never confused with a **syllable**, which is what the tsheg gives you free.
- **Second look** — the round at the end of a lesson stop that returns the
  items you got wrong, the same exercises, badged, **every one of them — the
  cap of four was removed 2026-08-08**
  (03 §4.4). It is the one place a revealed answer is retried. Distinct from
  **worth another look**, which is the cross-session pile in Practice: the
  second look happens inside the stop and ends it; worth another look is what
  survives it. Never "mistakes", never "corrections", never "review" (which is
  its own loop).
- **Gloss** — what a tapped chunk shows: Tibetan, the romanization, English, the naming
  triple. A reading aid on surfaces that already show the answer, never on an
  unanswered exercise. The verb is *tap*, not "look up"; the surface is a
  `Tooltip`, not a sheet.
- **Drill** — a learner-chosen practice session (picker → items → summary,
  `n of m` counter). A **lesson stop** is the guided loop (progress bar).
- **Training ground** — the Read track's free-drill surface (read spec §9.4):
  a pile of cards, one syllable each — say it aloud, reveal, *got it / not
  yet*; *not yet* returns to the pile. Outside the walk; an item enters the
  pile only after the stop that teaches it. Never scored, never graded;
  carries the metronome under the five signed conditions (07, 2026-08-07).
- **TIP** — a named position in the Read stop script (read spec §8, position
  3b), once per batch: the shape mnemonic, the nearest confusable, or the
  rule's shortcut. A script beat, not decoration — a letter is a shape before
  it is a sound.
- **Rule card** — the C-card that carries a rule, placed before any item that
  needs it, never after (read spec §8, position 2). In a rule-only stop, the
  rule card *is* the stop.
- **Worked stop** — a storyboard of one stop end-to-end, drawn once per track
  on the board (the `Stop 1.1 ·` and `Stop 3.1 ·` frames). The worked stop is
  not the stop: it samples the script for design, and is never a shipped
  surface.
- **`Again` / `Got it`** — the app-wide self-rating pair. The only two.

## Screen prefixes (the board)

S Speak lesson · R Read lesson · RB Read browse/drill · RBH Read section hub
· RS rule statement · RR rule reprise · SK stack card · C concept cards ·
X exam · L library · B crossing · D district hub · V vocabulary · E phrases
(expressions) · G collection · Q practice · J journey/circuits · O onboarding
· K skip-ahead (drawn, unwired in v1) · P/Y system & You · M microphone · A audio-free · WY Wylie
· N notifications · H sharing · U backup · Z failure states · T card of the day
· F finales. Worked-stop storyboard frames carry no prefix: they are labelled
`Stop n.n · <position>` (e.g. `Stop 1.1 · 01 intro`).

## Brand

- **Trungtrung** — the product; wordmark in Gabarito 800; no drawn logo yet.
- **The crane** — the mascot; appears only at sanctioned moments (see 04).
- **High Plateau** — internal palette name only, never user-facing.
