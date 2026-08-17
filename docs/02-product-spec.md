# Trungtrung — Product spec

*The PRD. The screen board wins on layout; the content spec wins on data;
03-exercise-system wins on behavior. This doc holds the model, the IA, and
what exists.*

## The model

```
Track          Speak | Read
  └── Section        Speak 5 · Read 11 — track-scoped; scroll breaks
                     with an intro moment (J1/R6)
        ├── (Speak) District  24 places (Men-Tsee-Khang = one node, two doors)
        │     ├── Vocabulary   1,045 records (554 first walk · 491 second)
        │     ├── Phrases      416, drilled whole
        │     ├── Cards        133 artifact records → 110 cards in 10
        │     │                collections (computed)
        │     └── Stops        185 across both walks
        │           └── Exercises   generated, never authored
        └── (Read)  the Printing House, one place
              └── Stops        44 across the eleven sections
                    └── Items  44 letters · 226 syllables ·
                          |     122 stacks · 12 affixes ·
                          |     6 Sanskrit letters · 3 marks
                          |     (+ 7 combiner records, about stacks
                          |      rather than items a learner meets)
                          └── Exercises   generated, never authored
```

The journey is walked twice (first walk / second walk). **The second walk
adds NEW stops** — built from the district's held-back items, opening with
warm-up reprises of first-walk material. A stop is never "replayed": the Tea
House has e.g. 3 first-walk stops and 2 different second-walk stops
(decided 2026-08-05; the board's "same stop, second time round" framing is
wrong and gets redrawn). Finishing District 24 on the first walk triggers
the return moment (J3 → J4); declining is offered again quietly from Q1,
never nagged.

**Roster status: settled, and the bible is not the roster.**
`claude/speak-track-spec-v3.md` holds **1,004 vocabulary, 420 phrases, 150
stops**. **What ships is 1,045, 416 and 185** (recounted 2026-08-16 after the
day's three landings), and the differences are all explained: 56 records with no
Tibetan form were parked on 2026-08-09 into `content/parked-no-form.json`; 150 is
a fixed spec figure against 185 generated; and the roster then GREW past the
bible — O1's twenty numbers, sixty-four words from tibetan101.com, and nine
recognition-only verb cards, all landed 2026-08-16. The bible is rebuilt from
`build_v3.py` and recounts itself, so it is not behind; it simply is not the
roster — `docs/08` records that gap deliberately. **Quote
`content/`, never the bible, for anything shipping.**

The "additions skew ≥70% to the second walk" plan was **not** followed, and
deliberately: applied literally it would have put 55% of all vocabulary on the
second walk and made "ship circuit 1 across all 24 districts first" cover less
than half the track. Each addition's walk was decided on its scene instead.
Result: **44% on the second walk**, against v2's 32% — **534/418** after the
2026-08-07 promotion of 12 words whose first-walk phrases needed them, the
2026-08-08 artifact additions, and the 2026-08-09 parking of 56 formless
records.

Every Tibetan string is `status: "draft"` and awaits a native speaker; that
pass is deferred by decision until testing, and the app degrades around it —
a record with no audio simply hides its listen button.

## Information architecture — four tabs

| Tab | Holds |
|---|---|
| **Journey** | The map; Speak/Read segmented switch (S2 ⇄ R1 — R1 must carry the switch too). Sections → district hub D1 (Stops · Words · Phrases · Cards). |
| **Practice** | Q1 is **a list, not a hub** (2026-08-15): one row per district met, journey order, current district tinted, each landing on Q8; above them one *Everything · n you're still getting* row → Q5, present only when non-zero. Unreached districts are absent, never greyed. Nothing else on it — the due queue, the training-ground card, the readable-words block and the offer card all left (see 07). |
| **Collection** | G1 → G2 → G3 cultural card; grouped cards G5; sharing H1–H3. |
| **You** | P1 (a real tab: tab bar, no chevron, count without flame) → Y1 stats, Y2 district progress, P2 settings (incl. `Your tracks`, Wylie, audio-free A1, reminders N3, backup U1–U4, data Y6). |

## Feature areas

- **Guided lesson loop** — the core surface of the product. A stop runs a
  generated script: warm-up reprises (second walk) → S4 intro naming the
  *outcome* → teach-and-check batches (word card → recognition exercises)
  → phrase blocks (S5 card → recognise → produce near the end) → mixed
  tail → **the second look** (every miss, returned once, no cap) →
  **S12 the moment → S8 the recap → G4/G3 the cards**. The full script
  algorithm and its rules are **03-exercise-system §4.1**, the second look is
  §4.4 and the three-beat ending is §4.5 — those sections define the S-flow.
  The board gaps it exposed are drawn (the S10 word-card family, six frames;
  four S4 intro variants; the Stop 1.1 worked strip). **S12 and the second look
  are drawn** — `S12`, `S13`, `S13·2`, `sp10b/c/d` — and O19 closed on proposal
  B (2026-08-08); both were described here as outstanding until 2026-08-16.
  Leave grammar: `x` → P4, place kept.
- **Browse & drill (Speak)** — V1 word list (grouped as taught, register
  marker, status dots) → V2 word sheet (appears-in chips) → V3 picker
  (6 modes) → drills → V10 summary. Phrases: E1 → E2 (literal + usage note)
  → E3 (5 modes) → E7 Just listen (section-level, background playback).
- **Browse & drill (Read)** — each Read section opens a hub (RBH) with four
  segments: Stops · Letters (RB1) · Stacks (RB2) · Reference (L1) — drawn
  2026-08-07, closing the missing inbound arrows delta §7.1 recorded.
  RB1 letters, RB2 stacks → RB3 picker (5 modes), RB16 stack picker
  (3 drills) → RB14 summary. `RB3` drops to **4 modes** with `RB8`'s retirement
  (07, 2026-08-16). Reference: L1–L9, C1–C14 — including **L7 the
  combiner index and L8 the combiner sheet** (2026-08-08), the screens that
  finally name ཡ་བཏགས་, ར་མགོ and the rest. **Both are drawn.** `L8` is a
  was a templated frame (`sc-for` over the seven combiners) until 2026-08-16,
  so it rendered seven screens that appeared nowhere in `screens.json`. They are
  seven authored frames now — `L8·ya-tak` … `L8·sa-go` — and the index no longer
  under-reports.
- **The crossing** — B1 first readable word (letter-by-letter resolve) ·
  B2 read-what-you-say drill · B3 the Printing House hook (`Please teach me`)
  · B4 combined progress on P1.
- **Review** — spaced repetition per 03; Q2 mixed session, Q3 summary, Q5 worth
  another look. **There is no nothing-due screen.** `T2` retired 2026-08-15
  because "the Practice tab is now a list and is already that screen when its
  rows are few", and `Q4` retires with it — the export left `Q4` marked `active`
  while its own copy read "Retired — merged into T2", so the state had two
  owners and no live one. `T1` the card of the day retires too (O22), so nothing
  hands off to it.
- **Exams** — X1 gate (declinable with dignity) → X2 (has an exit) → X3. An
  exam is **the §4.6 drill machine with pool = the section**, not a new
  concept (07, 2026-08-16). **Section exams: 5–10 items, showing a count, no
  threshold. The final test: ~100 items sampled across everything met, showing
  a percentage and a 90% pass mark.** Items are drawn randomly, so a retake is
  a different paper; there is no mid-exam save, and the exit restarts rather
  than resumes. **Under 90% withholds nothing** — the retake is free and
  immediate, and the gate still opens on completion. Final: X4/X4-b → F-B.
  Speak finale F-A (both walks complete).
- **No skipping in v1** (07, 2026-08-09). Stops are walked in order, in both
  tracks. What makes that acceptable rather than restrictive is that **both
  tracks are open from the first launch** — a diaspora learner who already
  speaks goes straight to Read, which is the thing they came for, and does not
  have to get past Speak to reach it. `K1`–`K3` stay on the board, unwired, as
  the shape of the feature when it is decided; `K2b`'s `Start reading` and the
  `K3` bulk mark-known are the two controls that must not be reachable.
- **Onboarding** — S1 → K1 track choice (**three** cards: Speak / Read / Both —
  O1's form is retired and K1 is the survivor; its fourth card, *I speak some
  already*, went with the skip-ahead in v1) → O2 pace
  (smallest first, preselected) → O3 brand moment (recorded by a person, works
  anywhere) → O4 reminder (default 19:00, ghost decline) → S2 or R1 by track
  (sequence decided 2026-08-05). Returning: O5, no guilt.
- **Accessibility** — audio-free mode A1 (substitutions A2/A3, transcript A4),
  200% type check A5, screen-reader contract A6 (**Tibetan announced via its
  `roman` romanization**, never THL — corrected 2026-08-16 to match the
  2026-08-09 decision; the shipped `TibetanText` was always right, only the
  prose said THL), colour-only states always have text equivalents.
- **Microphone** — M1 primer (nothing sent, nothing kept) → system dialog;
  M2 denied fallback (listen-and-repeat); M3 busy toast.
- **Notifications** — N1 copy register (never loss-framed; silent after 60
  idle days), N2 deep-link into the stop, N3 cadence follows O2, N4 in-app
  nudge when declined.
- **Sharing** — H1 sheet, H2/H3 export cards (no CTA, no URL).
- **The dictionary** — an all-words browse surface (extends Y4): every word
  and phrase the app holds, searchable by Tibetan, its romanization and
  English, grouped
  by district, met/unmet visible; V1 is the per-district slice of it. Search
  tells you where an unmet word lives ("You'll meet it at Eating").
- **Backup** — U1 stated plainly, U2 dated JSON export, U3 restore with
  summary, U4 conflict (never silent). Y6 delete-everything → S1.
- **Failure states** — Y5 audio-failed-in-drill (toast + skip) is the one
  defensive audio state. Download/offline states do not exist: everything
  ships in the app. Z4 new-content = quiet `New` badge on the map.

## What is deliberately absent

Downloads and storage management (11 screens removed) · accounts · grammar ·
a B1 tier · monetisation surfaces (free + support option, post-beta) ·
localisation, tablet, landscape (named, deferred) · stored recordings.

## Board status

The board is **seven files, not one** since the 2026-08-08 split —
`Board-Index` (a registry, 0 frames) · `Board-Flows` 14 · `Board-Worked-Stops`
40 · `Board-Speak` 90 · `Board-Read` 76 · `Board-Systems` 53 ·
`Board-Parking` 23. **296 registered screens** in the 2026-08-16 08:06 export,
and **every screen that renders is registered** — the seven `L8` combiner sheets
`Board-Read` used to generate from `<sc-for list="{{ combiners }}">` are
authored frames now. *(This said 283 and "seven more that render but are not
registered" until 2026-08-16; four of the six per-board figures were wrong too.
Recount from `screens.json`, never quote.)* The pre-split monolith survives only
under `_archive/`.

*This doc said 270 before 2026-08-16, and 246 and 235 before that; each time the
export had moved and nobody recounted — and each time this paragraph told the
reader to recount while quoting. **Recount, never quote**, this paragraph
included, and prefer `Trungtrung app - all screens/screens.json` over parsing the
HTML.* The design system's manifest declares **51 components and 78 cards**, but
the export ships source for only **29 of them (and 23 `.card.html` specimens)** —
the other 22 are primitives that exist only inside the compiled `_ds_bundle.js`,
including `AnswerChoice`, `Button` and `RecordButton`. `docs/04`'s "a component
exists only when all three exist" and `docs/06` §3's "matching its `.card.html`
specimen" therefore cannot be verified from this copy for 43% of the inventory.

The Read content spec now exists (`claude/read-track-spec-v1.md`); its content
is generated under `content/json/read/` from `content/read/inventory.json`
and validated by `scripts/validate_read.py` (59 checks). The L4/L5/L6
reference tables were corrected on the board 2026-08-06 — read spec §3–§4 is
their authority, and §4.5 carries the *measured* audit of what the old tables
cost. That measurement supersedes this doc's old hand count of five refuting
words: the true board-word count is six, ཚྭ (Salt, drawn as a found
collectible) being the one nobody had recorded. **L4/L5/L6 stay DRAFT — DO
NOT BUILD until a native reviewer confirms the inventory** — the correction
changed the reason, not the status. O14 **closed** on 2026-08-08 — the export
carries the DRAFT marking on all three, verified in the markup.

## Ship order

**Everything, in one release** (07, 2026-08-16). Both walks, all 24 districts,
and the Read track. The staged alternatives this section carried for weeks —
Sections 1–2 first, or the whole first walk before any second-walk content —
were both rejected: the arc only closes when District 24 reprises District 1,
and neither staging delivers that.

**Recording is therefore the critical path, ahead of all code.** ~1,830 takes
for the roster as it stands, plus ~178 for the numbers 11–99 admitted under O1,
human-recorded, before any release. Every other workstream finishes in days
against that. The native-review pass over 339 flagged records sits on the same
path.

*The figures this section used to carry — "258 words, 116 phrases, 490
recordings" for Sections 1–2, and "545 words" for the first walk — were computed
before the 2026-08-09 parking and are wrong by 56 records. They are gone rather
than corrected, since the staging they described is no longer the plan.*
