# Trungtrung — Backlog & parking lot

*Nothing gets lost. Ideas land here without interrupting the work; known
gaps are named so they read as decisions, not oversights.*

## Known gaps (ordered by weight)

0. **The §3 routing table sends verbs to the wrong districts.** Content spec §3
   maps CEFR topics to districts, and a topic is not a scene. The verb pass
   found the mismatch is systematic, not incidental: District 1 (greetings and
   apologies) was routed `avoid`, `prevent` and `provide`; District 12
   (instruction) got the assessment vocabulary and none of the four verbs a
   classroom actually runs on; Districts 8, 10, 16, 17 and 21 all received
   candidate lists their scenes could not hold. Thirty-one lemmas were routed
   to no district at all, including `explain`, `listen`, `stand` and `try`.

   **v3 does not depend on it** — every verb in v3 was placed by scene, and
   twenty-six were claimed back out of the unrouted pool by hand. The cost is
   forward-looking: the table will mislead whoever trusts it next, and the
   coverage figures computed from it understate what is reachable. Fixing it
   means re-deriving §3 from the district scenes rather than from topic names.
   Recorded as D-VERB-6 in `content/decisions.json`.


1. **The Read-track content spec — written, generated, validated; the native
   review stays open.** `claude/read-track-spec-v1.md` exists (2026-08-06):
   letter roster per section, stack inventory, rule sequence, drill data
   schema, validation rules, recording plan. `scripts/build_read.py`
   generates `content/json/read/` from `content/read/inventory.json`, and
   `scripts/validate_read.py` runs **59 checks, 54 passing** (2026-08-16) — it
   was described here as green, which it has not been since 2026-08-08. None of
   the three failures is a data defect: 11.1's corpus constant was outrun by the
   2026-08-15 export, 38 reports two more bare combining marks from a known
   board defect, and 53 is retired by O21. What no script closes is the one
   genuinely open piece: **a native reviewer confirming the inventory** — until
   then L4/L5/L6 remain DRAFT — DO NOT BUILD. O14 **closed** on 2026-08-08: the
   export carries the DRAFT marking on all three, verified in the markup.

   **What the spec's absence had cost** (first audited from the export,
   2026-08-05 — no native speaker needed, the board refutes itself; spec
   §4.5 has since *measured* it per row: L5's rows together forbid 37
   distinct syllables the board draws, and L6 is wrong in six of seven rows
   — this table's claim that only the ཡ-subscript row is correct held up):

   | Table row | Excludes | Word drawn elsewhere on the board that this forbids |
   |---|---|---|
   | L5 suffix ས | ཤ | `བཀྲ་ཤིས་བདེ་ལེགས།` — **C5 and O3**, the onboarding brand moment |
   | L5 suffix ས | ན | `ནས་` né, barley — U4 |
   | L6 ལ-superscript | ཅ | `དར་ལྕོག་` darchok, prayer flag — V10, V13, T2, U4 |
   | L6 ལ-superscript | ཧ | `ལྷ་ཁང་` lhakhang — U4; and `ལྷ་ས` Lhasa, the name of Section 2 |
   | L6 ལ-subscript | ཟ | `ཟླ་བ` dawa — **C4 teaches ཟླ as the exception L6 says cannot exist** |
   | L6 ཝ-subscript | ཚ | `ཚྭ་` Salt — a collectible the board itself draws as found; the eighth self-refutation, unrecorded here until §4.5 measured it |

   Two more, from the classical stack lists rather than board content:
   L6's ར- and ས-superscript rows omit ན (`རྣ་བ` ear, `སྣ` nose — both body
   parts, District 15 vocabulary); L5's two *second-suffix* rows are
   byte-identical (`ག ང བ མ ར ལ`) when second-suffix ས follows ག ང བ མ and
   ད follows ན ར ལ — one row was duplicated.
   The full per-row account, over-inclusions included, is spec §4.5 —
   measured against the corpus the board itself draws, and the authority
   this hand count handed over to. The board was corrected 2026-08-06.
2. **Board round-three execution** — **done**, verified against the export.
   All 11 removals landed (P3, P6, Y3, Z1, Z1-b, Z2, Z3, Z5, Z6, M4,
   V1-offline are absent). All 8 new screens landed — **RB8 ("Find its
   place") arrived with the 2026-08-06 Read round**, and was *retired* on
   2026-08-16: no `find-its-place` exercise has ever been generated. Outstanding: the
   answered-state sweep stands at **5 specimen frames of the ~10** called
   for. Contradiction fixes, sweeps and flow strips not individually
   re-verified.
3. **The S-flow, made real on the board** (from 03 §4.1, flagged
   2026-08-05) — the drawing is done: the **word card** exists as the S10
   family (six frames, including no-Tibetan, no-illustration, variant-form
   and the two register proposals — picking A or B is O19); S4 has its four
   intro variants (resume, second-walk warm-up, postcard, no-phrases); the
   Stop 1.1 worked strip shows a whole stop script end to end. What remains
   is the outcome-lens sweep: for each surface, what outcome is the learner
   being led to, and does the screen sequence actually lead there?
4. **Notification copy N1 → final** — drafts exist; finalize with the
   native reviewer alongside content.
5. **Shared-card artwork pipeline** — H2/H3 compositions are drawn; the
   actual 1:1 and 9:16 export rendering (and whether a share links back)
   is unbuilt.
6. **Mascot/logo assets** — no drawn logo; wordmark stands in. Crane pose
   set is small (rest, flight for J4).
7. **Curriculum v3 merge** — **done 2026-08-06**: additions folded into the
   content spec, §4 counts contract updated, reuse manifest extended, stops
   regenerated, §3 coverage refreshed. What survives of it is gap #0: the §3
   routing table still needs re-deriving from the district scenes.
8. **Artifact illustration production** — **110 cards (133 artifact records;
   58 illustrated)**, recounted 2026-08-16, generated per
   `docs/10-illustrations.md`; the Eight Auspicious Symbols are the largest
   unillustrated block, 8 of 8; batch by collection; cultural/respect check
   before any card ships.
9a. ~~**THE NEXT CONCRETE TASK: land `content/proposed-numbers.json`.**~~
   **DONE 2026-08-16.** The twenty records — 11–19, the eight decade joiners,
   ཆིག་ཁྲི/ཆིག་འབུམ/ས་ཡ — are in the roster, in District 5, through
   `V3_NUMBER_ADDITIONS` in `build_v3.py` and the whole chain. Two defects were
   fixed on the way in: the staging file wrote `"pos": "number"`, which is not in
   `validate.py`'s `VALID_POS` and would have failed all twenty on rule-3, and
   the joiners carried their Tibetan inside `en`, which is the `meaning-pick`
   option label. **It also exposed two real pipeline bugs** — `split_evenly`
   measured bucket capacity in blocks rather than items, and the stop count used
   `ceil(len/cap)`, which is only correct when items can be split freely and a
   group cannot. Both are fixed; see `docs/07`.

9b. **The eight decade joiners are bound forms on cards, and that tension is
   real.** ཉེར, སོ, ཞེ, ང, རེ, དོན, གྱ, གོ are never said alone, which is the exact
   ground on which v3 CUT `la` (`content/decisions.json`: "bound clitic, never
   occurs alone; a bare vocabulary card would teach a thing that cannot be said
   by itself"). O1 requires the pattern to be teachable and a joiner named inside
   its decade is not a bare citation form, so they ship — but the cost showed up
   within the hour: `chunks.py` glossed **99 chunks** off them, including "I" in
   `phrase.core.dont-understand`, which came out as *the fifties joiner*. Records
   now carry `bound: true` and the chunk lexicon skips them. Revisit whether the
   joiners want to be cards at all.

9. **Recording plan — CLOSED 2026-08-17, by making the count uncountable by
   hand.** The formula is settled and the figure is now derived, so this entry
   no longer carries one. **The slow take is gone**: there is one recording per
   item and the app plays it at 0.65× with pitch correction (`docs/03` §4.1,
   Speak §7.6 rule 26). That removed 587 takes and dissolved the question this
   entry existed to ask, along with the Read letters' A7.

   The total is **2,004 takes** — 1,045 vocabulary + 416 phrases + 543 Read —
   but do not quote that either. It is computed by
   `trungtrung-community/studio`, whose `lib/recording-plan.ts` reads this
   repository's content on every run and whose test asserts the figure against
   it. A count kept in prose is what produced the three contradictory numbers
   this entry used to list (1,858, 1,844, 2,848 — none of which agreed with each
   other or with the roster).

   Two notes that outlived the question. The **Read declaration undercounted by
   seven** until 2026-08-17: `combiners.json` declared seven takes that
   `build_read.py`'s recording script never walked, so they appeared in neither
   its total nor its "Not recorded" list. And the **~178 number takes for 11–99
   are still unplannable** — only 20 pattern cards are in the roster, and the
   21–99 combined forms exist in no dataset, so there is nothing for a generator
   to enumerate. They are excluded from the 2,004 by decision, not by oversight.
10. **`build_manifests.py` overwrites instead of merging** — **CLOSED
    2026-08-08.** It destructively regenerated `content/known-forms.json`,
    wiping the translation pass's enrichments. Reproduced deliberately while
    adding the artifacts: one run cost **10 anchors their `bo` and all 20
    their `wylie`**. It now merges — a field the spec does not author is
    carried forward from disk, a spec-authored field still wins, and the run
    reports how many it carried. Restored from backup and verified back at
    20/20.
11. **The crossing no longer waits on the Speak roster's Tibetan — CLOSED
    2026-08-16.** `content/vocabulary.json` carries Tibetan on **1,045 of
    1,045** records: the D9 pass of 2026-08-09 parked the 56 that had no form
    rather than shipping them empty, so every record that ships has script by
    construction, and the eighty-four landed later that day arrived with their
    Tibetan already in the overlay. `B1`'s trigger is testable now, and every crossing count on the board
    is invented and must be recomputed, never copied forward.
12. **`validate.py` rule 23 has 17 false positives.** It requires every
    artifact to carry both a `cultural_note` and an `illustration`, and fires on
    grouped members that are never drawn as their own card — 11 zodiac animals
    and 6 day names, whose card is drawn by a representative (`horse`,
    `saturday`) that does carry both. The rule should exempt a
    non-representative member of a `group`. Found during the note rewrite of
    2026-08-08 and left alone: it is a script change and a judgment about what
    the ship gate means, not a content fix. The other 38 of the 55 warnings are
    real and are gap 8.
13. **51 non-artifact notes are still in the old shape.** The 2026-08-08 rewrite
    reshaped the 103 notes that become cards; the rest belong to words that
    carry a note as editorial enrichment and show it on the `V2` word sheet, not
    on a card. The three-move template was written for a card and does not
    obviously apply to a sheet. Four of them — `apricot`, `sichuan-pepper`,
    `dialect`, `luck` — carry a `note_review` flag for a first line over 190
    characters. Worth a decision once the artifact set has been seen in the app.
14. **~~`CLAUDE.md` is stale about the board export~~** — **CLOSED 2026-08-08.**
    It said 254 screens and that the export predated all three handed orders;
    it now says 270 and records that the export moved again.
15. **`lint_prose`'s score rule matches the bare noun `rank`.** The pattern is
    `rank(ed|ing)?`, so *"a parasol held over someone marked their rank"* — an
    ordinary statement about social standing — reads as a game score and fails
    the never-do gate. It fired for real on `vocab.monastery.parasol` on
    2026-08-08 and was cleared by rewording the content to *standing*, which is
    backwards: **the tooling should not be shaping the prose.** Narrow the rule
    to the scored senses (`ranked`, `ranking`, `rank \d`) rather than reword the
    next legitimate use. Deliberately not narrowed in the pass that found it —
    `docs/01`'s never-do gate is a tripwire and weakening one needs a dated
    reason of its own.

## Parked ideas

- **A traveller character, to introduce animals that are not on the plateau.**
  Thosam, 2026-08-16: *"meeting a traveler character or a wildlife photographer
  or an adventurer would be a good way to have these introduced… they could talk
  about these animals that they have seen in real life."* It solves a real break:
  the import placed rhino, zebra, camel and crocodile in the Nomad Camp on his
  ruling ("place them anyway, in the nearest district"), and a walk through
  twenty-four districts of a Tibetan place does not contain a zebra. **Not
  designed, and deliberately.** There is no character system in the product — no
  narrator, no guide; what exists is the crane mascot (`docs/10`) and a
  "walking companion" voice (07, N1). A first embodied character touches
  `docs/01`, `docs/02`, the board and the illustration pipeline, and wants its
  own brainstorm. **It does not block anything:** placement is data and a
  character is presentation, so it retro-fits with no rework.

## Source materials (so links never live only in chat)

- Langeek A1 (32 topics / 608 words) and A2 (50 topics / 1,566 words)
  English lists — the coverage checklist, fully mapped in content-spec §3.
  Overview: https://help.langeek.co/cefr-english-vocabulary-pdf/#download-pdfs
  · A1 PDF: https://help.langeek.co/wp-content/uploads/2025/04/English-wordlist-A1.pdf
  · A2 PDF: https://help.langeek.co/wp-content/uploads/2025/12/English-wordlist-A2.pdf
- Steinert Tibetan dictionary — web app:
  https://dictionary.christian-steinert.de · data/build:
  `github.com/christiansteinert/tibetan-dictionary` (build-time lookup aid
  only; data under authors' copyrights — never vendor; build the SQLite DB,
  don't scrape the SPA).
- Tournadre & Sangda Dorje, *Manual of Standard Tibetan* (Snow Lion,
  ISBN 978-1-55939-189-4) — register/colloquial tiebreaker.
- **CTA standardised terminology** — the Central Tibetan Administration's
  Department of Education terminology board, 21,661 terms, DANIDA-funded:
  `tibterminology.net`. Admitted as a source 2026-08-09 (07). Queried by
  `scripts/content/tibterm.py` through `/wp-json/tdict/v1/search` — **set
  `mode=en-bo`**, the default is Tibetan-in, and the index is not lemmatised
  (`teapot` misses, `tea pot` hits ཁོག་ལྡིར). Responses cache to a gitignored
  `.tibterm-cache/`; nothing is vendored. **Read the register before using a
  hit:** these are standardised *written* coinages for law, science and
  machinery — `གླ་འཁོར` is the term for *taxi* and a Lhasa speaker says *taxi* —
  so every form ships `status: draft`, `spoken_confidence: low`, cited by entry
  URL. Its `robots.txt` disallows `ClaudeBot` and signals `ai-train=no`: targeted
  reference lookups only, never a crawl, and nothing trained.
- **tibetan101.com** — a free Tibetan-teaching site by **Penpa Lhamo and Amit
  A. Shapira**, dedicated to the Dalai Lama and Thonmi Sambhota. Admitted as a
  source 2026-08-16 (07) and ruled **authoritative** by Thosam, subject to a
  named errata list. Colloquial teaching material rather than written coinage,
  which is why it is evidence about speech where the CTA terminology is not —
  but it still ships `status: draft`, because publishing a wordlist is not
  reviewing ours. **No licence, no copyright notice, no reuse statement**; Thosam
  ruled permission unnecessary. Credit belongs on `P8 · About & licences`. Pages
  cache to a gitignored `.tibetan101-cache/`; nothing is vendored. Two traps: the
  Tibetan is delivered as HTML numeric entities, so a grep for literal UTF-8
  finds nothing, and the verb lessons 2–3 are rendered client-side and are absent
  from the static HTML. Audited by `scripts/audit/tibetan101_audit.py` →
  `reports/tibetan101-audit.md`.
- **Monlam Dictionary** — `monlamdictionary.com/search`. The fallback, and only
  where the CTA returns nothing (Thosam, 2026-08-09: *"only use this as a last
  resort"*).

## Ideas parking lot

- The Sixth Dalai Lama's white-crane verse — taste call; "it is there."
- ~~Home-screen widget for the card of the day (T1).~~ **Dead 2026-08-16** —
  `T1` retired (O22) and O8 ruled the widget goes with it. There is no card of
  the day to put in a widget.
- E7 car-mode / lock-screen transport specimen.
- Calligraphy practice (tracing uchen) — post-MVP, fits the Read track.
- Monastery-mode / quiet-hours theming.
- AI tutor / speech recognition — conflicts with the no-scoring stance;
  parked, likely never (would need to survive the never-do list).
- Uncover more crossings: Speak learner sees their first known word written
  (B1 exists; are there more moments?).
- **Buddhist orthography** — a later Read unit for learners reading pecha and
  Dharma texts: the Sanskrit **vowel signs** (ཱ ཻ ཽ ྀ ཾ ཿ), the wider conjunct
  set, and pecha layout. **Narrowed 2026-08-08**: the six letters themselves —
  ཊ ཋ ཌ ཎ ཥ and ཀྵ — came into the track and are taught in Read Section 10,
  reversing the 2026-08-05 scope decision (read-track spec §2.5, §3.5). The
  live content that always contradicted the old scope, `མ་ཎི་རྡོ་` with its
  ཎ outside the thirty, is now decodable rather than an exception.

## Deliberately deferred (named, not drawn)

Monetisation surface (free + support option stands) · localisation ·
tablet & landscape · reset/relearn per district (Y6 wipes everything; V5
undo covers the flashcard mis-tap) · B1 tier / grammar (different content
model, different document).
