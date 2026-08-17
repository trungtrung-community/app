# Trungtrung — Decision log

*Newest first. Format: date · decision · reason · alternatives · status.
Every session that decides something appends here.*

## Open decisions (decide before the affected work starts)

| # | Question | Needed before | Notes |
|---|---|---|---|
| O1 | ~~Numbers 11–99: record in full or splice tens+units?~~ | — | **Closed** 2026-08-16: **in full**, ~89 words and ~178 takes, and the splice question does not arise. The tens join their units with a linking syllable rather than by concatenation, which is what made splicing a native-ear question in the first place. Thosam added ཁྲི · འབུམ · ས་ཡ at the same time. See the entry below. |
| O2 | ~~Tsheg-split chips acceptable for E8, or per-phrase `chunks[]`?~~ | — | **Closed** 2026-08-08: `chunks[]`. Syllable chips averaged 6.7 a phrase and 133 of 416 phrases produced 8–15 of them. See the entry below. |
| O3 | ~~Audio library: expo-audio vs expo-av (deprecated)?~~ | — | **Closed** 2026-08-16: **expo-audio**, migrated before any audio code exists, which is the cheapest this will ever be. It must satisfy background playback and lock-screen transport for E7 or E7 dies quietly; that requirement absorbs the surviving half of O8. |
| O4 | ~~Token bridge design: CSS tokens → nativewind config generator~~ | — | **Closed** 2026-08-16: **a build-time script**, re-run on every DS export, emitting the nativewind config and a typed `ds-tokens.ts`. Hand-maintenance was rejected because the DS export moved twice in the month this was open and nothing would have caught the drift. **Amended 2026-08-17**: the script shipped as `scripts/sync-design.ts` and is exactly this; the consumer is **uniwind**, not nativewind, because O4's reason for nativewind was that RN cannot consume CSS custom properties and Uniwind can. The typed object is `src/theme/tokens.generated.ts`. |
| O5 | ~~Localisation of the UI (Tibetan? Chinese? French?)~~ | — | **Closed** 2026-08-16: **English only for v1, behind a thin i18n shim** — every string through `t()` from the first screen, so a second language is a strings file rather than a pass over 296 screens. No language row in settings. A Tibetan interface is explicitly not a v1 goal. |
| O6 | Support-option mechanics (post-beta) | after beta | Free forever stands; only the "support this work" surface is open. |
| O7 | ~~Read-track content spec~~ | — | **Closed** by `claude/read-track-spec-v1.md` (entry of 2026-08-06/07 below); its §15 residue lives in `claude/read-track-open-questions.md`. |
| O8 | ~~E7 lock-screen transport + T1 home-screen widget~~ | — | **Closed** 2026-08-16, by being split and dissolved. The widget was a surface for `T1`, and `T1` retires with O22, so it goes with it. The lock-screen transport is not post-MVP at all — it is a hard requirement on O3's audio library, and lives there now. |
| O9 | ~~"Readable" definition~~ | — | **Closed** 2026-08-08: option B — every letter met and every rule taught. Track-independent; the Speak roster switches the *sentence*, not the count. |
| O10 | ~~Read-only path seeding: how a read-only learner marks words they already say~~ | post-v1 | **Deferred** 2026-08-09, not closed. v1 has no skip-ahead at all, so nothing has to seed anything: K2b's unwired "Start reading" stops being a gap and becomes the accurate state. The question returns whenever skipping does. |
| O11 | Suffix-བ romanization (-p vs -b) board-wide | native reviewer | R9/RB12 vs R8/L3 disagree today. Read spec §15.2 recommends `-p`. |
| O12 | Bare-ག sound convention (ga vs kha-softened) | native reviewer | Convention decided 2026-08-06 (entry below); this row tracks native confirmation only. |
| O13 | ~~Romanization of /ɛ/~~ | before the Speak roster's romanized Tibetan grows further | Only /ɛ/ diverges (`ö`/`ü` are common to both). THL writes `e` — *Tendzin, Milarepa* — and needs `é` for a genuine final e; Tournadre & Suzuki write `ä` — *Tändzin* — and need no accent. A product decision, not a linguistic one, and it changes every romanized string in the app; `content/read/sounds.json` currently implements `e` + `é`. **Closed** 2026-08-08: **`e`**, plain THL, with the collision cost measured and accepted — see the entry below. |
| O14 | ~~L4/L5/L6 DRAFT marking~~ | — | **Closed** 2026-08-08: the export carries it. Verified in the markup — L4, L5 and L6 each draw *"DRAFT — pending native review. The dataset existing does not make it reviewed; no native speaker has seen this set."* |
| O15 | ~~S7 meaning-pick direction~~ | — | **Closed** 2026-08-08: the board's direction stands — S7 is Tibetan → four English, and the English-prompt direction lives only in V7, a drill family. `docs/03` §1 was the stale copy and was corrected. |
| O16 | ~~§4.1 vs the generator~~ | — | **Closed** 2026-08-08: the generator was fixed, not the rulebook. It was worse than this row said — measured, **45 of 173 stops asked for the microphone four times** and **all 169 stops with exercises opened on meaning-pick**. |
| O17 | ~~X3 chip-tap half of delta §4.2~~ | — | **Waived** 2026-08-08 by Thosam. Verified absent from the export first: X3 carries no chips and no tap targets. Dropped rather than re-ordered. One line to reverse. |
| O18 | ~~docs/03's extra Speak exercise families (E8 phrase-arrange, E9 phrase-cloze, V13 pair-match)~~ | — | **Closed** 2026-08-08: generated, not retired. `exercises.json` holds all three. |
| O19 | ~~S10 register proposal A vs B~~ | — | **Closed** 2026-08-08: **B**, no marker on the word card. With the plain form on the card there is mostly nothing to mark, and the phrases already carry the (H) in the literal gloss. |
| O20 | ~~How is a **split** board export read whole?~~ | — | **Closed** 2026-08-15: a shared `<script>` payload is counted **once**, deduplicated by exact content; frame content is never deduplicated. Read spec §11.1 gains this as rule 6. The board is **328 distinct / 4,070 tokens** — the same 328 as before, because the union was always true, and 4,070 against the 6,179 the old reading gave. It is seven files, not six. See the entry below. |
| O21 | ~~Check 53 gates a **handed, historical** board order~~ | — | **Closed** 2026-08-16: **retire the check.** The file it guards became a record of what was actually asked, and a gate that can only be silenced by damaging the record is not a gate. `validate_read` drops to 58 checks and goes fully green, so the next red result means something. `board_prompt.py` was never run to green it. |
| O22 | ~~Where does the **card of the day** keep its daily entrance?~~ | — | **Closed** 2026-08-16 by removing the thing it asked about: **`T1` retires.** `Q1` and `G1` were both rejected as pollution, and Thosam declined a Journey row. A surface with no entrance cannot be "a reason to open it on a quiet day", so it is parked rather than left orphaned. Takes O8's widget with it. |

## 2026-08-17 — the app repo: six decisions the port had to make

*This entry is written from `trungtrung-community/app`, which did not exist when the
decisions above were taken. Each one below is a change to something `docs/05` proposed,
and each was forced by the keyboard rather than chosen at the whiteboard.*

**1 · Uniwind replaces NativeWind v4, amending O4.** O4's stated reason for NativeWind
was that the design system's tokens are "CSS custom properties RN cannot consume".
Uniwind is CSS-first and consumes them — `useCSSVariable`, `getCSSVariable`,
`updateCSSVariables` — so the vendored `tokens/*.css` stays closer to source instead of
being flattened into a JS config. **O4's build-time script is unchanged and is what
shipped** as `scripts/sync-design.ts`; only the consumer moved. The free tier is MIT and
sufficient: Pro buys perf and Reanimated-4 `className` animation, and this app has one
theme, no dark mode, and "one flip, no spring".

**2 · Content ships as a prebuilt SQLite asset, correcting `docs/05`'s "typed loaders
over the bundled JSON".** Metro inlines JSON into the JS bundle, so 9 MB of content is
parsed into the JS heap at startup — tens of megabytes on a low-end Android, before the
first screen. `expo-sqlite` opens a bundled read-only DB via `SQLiteProvider
assetSource`, is indexed and lazy, and ships FTS5 for `SearchField`. **The conversion
lives in the content pipeline, not the app**: `scripts/build_db.py` in the design-system
repo emits `content.db`, and the app contains no knowledge of how vocabulary was
generated or how the JSON files relate. Two adapters from day one, because `expo-sqlite`
web support is alpha and `docs/06` plans the whole Playwright suite on the Expo web
build — the port is load-bearing immediately rather than speculatively.

**3 · Noto Serif Tibetan serves both Tibetan tokens.** Google Fonts does not publish
Noto Sans Tibetan; `--font-tibetan` names a family that has never rendered anywhere, and
the board has always drawn Tibetan in the serif face. The token names are kept so a sans
face self-hosted later takes priority with no code change. `serif` therefore selects a
heavier weight rather than a second family.

**4 · All three ports are async, even though MMKV and a bundled DB are synchronous.** A
synchronous `ContentSource` makes going remote a rewrite of every caller. Async now is
nearly free. It does not make that migration cheap — `ProgressStore` in particular is a
subsystem, not an adapter, once auth and conflict resolution arrive — it makes it
*local*, which is the honest claim.

**5 · Component tests run through react-native-web under jsdom, not React Native Testing
Library.** `docs/06` planned RNTL and flagged that RN needs transform setup under
Vitest. It cannot run: React Native ships Flow-typed source, esbuild cannot parse it, and
every import fails on `Unexpected token 'typeof'`. `docs/06` permits falling back to
`jest-expo` for this layer; this is a third option that keeps one runner and no second
toolchain, and it exercises the components on exactly the path the browser verification
already walks. The cost is stated in `vitest.config.mts`: these are DOM assertions, so
device-only behaviour is still device-only.

**6 · `ShareCard`'s art band shrinks under pressure. This is the one deviation from the
board in the whole 51-component port.** At `square` the design system's own numbers do
not fit their own box: 320 square, a 141pt art band and the word triple come to 336
before any note at all, so the composition overflows, centres and slides under the
wordmark. Everything else in the card is meaning; the picture is the only element that
can lose height without losing any, so it is the one that yields. The format then always
fills exactly, and a long note costs picture rather than legibility.

**Two tokens added to the design system**, both by the sanctioned upstream-sync
procedure and both because a value the system clearly has an opinion about was written
as a raw px: `--focus-ring-width: 3px`, which `Input` needed because React Native cannot
express `outline` at all, and `--record-ring-width: 3px`, which was the last raw line
weight in the elevation group. They are deliberately two tokens and not one: they share
a value today and mean different things, and a token reused for its number cannot be
changed afterwards.

## 2026-08-16 — tibetan101.com admitted; O1's numbers land; 64 words and 9 verb cards; five thick letters

**Context.** Thosam found `https://tibetan101.com` — a Tibetan-authored teaching
site by **Penpa Lhamo and Amit A. Shapira** — and asked for its words to be
folded into the app. It turned out to be **already our source, unnamed**:
`content/proposed-numbers.json` cites "Thosam's own reference tables", and those
tables match the site's `/numbers/` page form-for-form **including its errors**
(`པརྒྱད`, the `ཉེར` joiner, `ཆིག་ཁྲི`/`ཆིག་འབུམ`). The previous session consumed
it as an authority and never recorded the URL. This entry cites it.

**1 · The source is admitted, and ruled authoritative — with a named errata
list.** Thosam: *"We dont need permission, its litteraly out there for free"* and
*"It may have a few typos but you can treat it as authoritative."*
`bo_source: "tibetan101"` joins `merge_tibetan.PRIOR_SOURCES` and is never
downgraded. Unlike the CTA terminology, whose standing caveat is that it is
*written* committee coinage, this is colloquial teaching material, so it is
evidence about speech. **`status` stays `draft` on everything** — a wordlist's
author vouched for her list, not for our card, its district or its gloss, and
that rule is stated as the single most important one in four places. Three
verified errors are on the live pages: 8 written `པརྒྱད` and 18 `བཅུ་པརྒྱད`, the
`༡༣` row labelled "10", and a broken audio player. Errata ruled by Thosam: 8/18
keep `བརྒྱད`, monkey keeps `སྤྲེའུ`, 1,000 keeps `ཆིག་སྟོང`. Father takes the
site's `པ་ལགས`.

**2 · Precedence was ruled "beats everything", and the records overrode it —
correctly.** Read literally the ruling produced 14 head swaps. Reading each
record's own `review_notes` produced **4**. `vocab.family.relative`'s note says
`སྤུན་མཆེད` *"is not shipped, because it reads as the written-register word and
§2.5 drops what cannot be confirmed as spoken"* — and `སྤུན་མཆེད` is exactly what
the site gives. So the note decides the head: our form yields only where its own
note says it was **uncorroborated or constructed**. That is `brown`, `pink`,
`orange` and `afternoon`. **Both forms are kept in every row**, the loser as a
`variants[]` entry, because it all goes to a reviewer anyway. Known typos are
barred from `variants[]` — §2.4a says that field is "never a form that failed
corroboration".
- **Two of the four are answers to questions we had parked.** `vocab.market.orange`'s
  note said the spoken source has `ཚ་ལུ་མ` the *fruit* and no colour term at all,
  and that *"until that is answered this card cannot ship"*. The site gives
  `ལི་ཝང`. `vocab.meeting.afternoon`'s note admits `ཕྱི་དྲོ` was *"written from
  the paradigm"* rather than attested; the site gives `ཉིན་གུང་རྒྱབ`.
- **The postpositions stand on a citation, not a preference.** Asked whether to
  strip their particle, Thosam said *"i dont know"*. Five carry a cited
  corroboration in the **spoken** source, and `vocab.way.in-front` states that
  *"the bare མདུན does not stand alone in the source"*. A wordlist prints a
  citation form; a spoken corpus records what is said; this app teaches speech.
- **The honorific tail is never stripped by an import.** Thosam on `རྨོ་རྨོ་ལགས`:
  *"this is correct; the ལགས is to be formal/polite."* Ruled as a principle, so
  it is a rule in the script. The site is itself inconsistent here — it writes
  `པ་ལགས` and `ཨ་མ་ལགས` with the honorific, then drops it for the grandparents.

**3 · O1's twenty numbers land.** 11–19, the eight decade joiners, and
ཆིག་ཁྲི/ཆིག་འབུམ/ས་ཡ, into District 5 via `V3_NUMBER_ADDITIONS`. Two defects were
fixed on the way in: the staging file wrote `"pos": "number"`, which is not in
`validate.py`'s `VALID_POS` and would have failed all twenty on rule-3; and the
joiners carried Tibetan inside `en`, which is the `meaning-pick` option label.
**The joiners are bound forms and the cost was immediate** — `chunks.py` glossed
**99 chunks** off them, including "I" in `phrase.core.dont-understand`, which
came out as *the fifties joiner*. Records now carry `bound: true` and the chunk
lexicon skips them. Whether a bound form should be a card at all is `docs/09` 9b.

**4 · Sixty-four words imported, placed by scene.** Everything the roster held in
no spelling, minus three named exclusions: the **11 composed numbers** (O1 rules
the pattern, not the eighty-nine), the **verb stems** (parked), and **two clock
particles** `ཡོལ་ནས`/`ཟིན་པར`, which are bound in exactly the way that got `la`
cut. Placement is by scene, never by the §3 routing table, which `docs/09` gap 0
records as broken. Staged in `content/proposed-tibetan101.json`. `en_definition`
was authored for all 84 new records, because every other record in the roster has
one and a card without it draws empty.

**5 · Nine verb cards, and no invented phrases.** §7.2 rule 7 permits `pos: verb`
only where a carrier phrase **resolves**. Nine verbs already appear as glossed
chunks in existing phrases, so they cost no new Tibetan: eat, make, drink, write,
know-how, go, stay, read, and walk-a-kora. `to do` and `to get` are barred
permanently as auxiliaries. `to-look` was dropped before landing — `to-watch` is
already ལྟ་བ, and two cards with one form and one meaning is a duplicate, not the
V16 case; its carrier moved to `CARRIER_APPENDS` instead. **Tier 2 — the twelve
verbs with no carrier — is NOT done.** Carding them needs phrases authored from
nothing, which is new unreviewed Tibetan with no second witness, and the day's
four defects were all caused by adding forms without enough care. Staged, not
guessed.

**6 · The five thick letters come into Read Section 10.** `གྷ ཛྷ དྷ བྷ ཌྷ` join the
six reversed ones on the 2026-08-08 precedent and at the same price:
recognition-only, no sound value taught, **0 recording takes**. They are not
mirrored shapes — each is a base with subjoined ཧ, the same mechanism as ལྷ. The
set moves 6 → 11, the spec roster 413 → 418, Section 10's positions 59 → 74, and
`spot-it` 18 → 28. Both set names — `ལོག་ཡིག` and `མཐུག་ཡིག` — are the source's
words and carry `[REVIEW]`.

**7 · `set` is admitted as a browse-only field, distinct from `group`.** Thosam
asked for the animals "grouped so it's easy for the learner", which `group`
cannot deliver: rule 6.5.7 caps a group at one district and one stop, and there
are 52 animals. `group` stays a teaching constraint; `set` reads across districts
and gates nothing. `animals` 52 · `time` 42 · `numbers` 41 · `family` 26 ·
`colours` 12. A card still lives where the learner meets it.

**Three latent pipeline bugs, found because the new data stressed them.**
- `split_evenly` measured bucket capacity in **blocks, not items** —
  `len(buckets[b])` counts blocks and was compared against an item cap. Correct-
  looking while every block is one item; false the moment a district holds a
  group of nine.
- Stop counts used `ceil(len/cap)`, which is right only if items split freely. A
  group cannot. Now first-fit-decreasing via `bins_needed`.
- `romanize.py` never repaired chunk romans. `chunks.py` runs first, knows
  nothing of the override table, and reads cards before they have romans, so a
  clean regeneration silently reverted `rok nhang` to `roknhang` and blocked a
  whole phrase. HEAD's chunks were correct by run-order luck.

**And a learner-facing one the audit surfaced.** `rule-27`'s "one form, several
cards" warnings were not cosmetic: they were producing **wrong glosses inside
phrases**. `ལོ` was glossed *age* inside "victory to the gods", "how old is it"
and "I'll return next year", where it is *year*; `ཡི་གེ` was *letter of the
alphabet* in "I'll write to you"; `ཐང` was *soup* inside "I'm tired". Worst,
`འབྲི` was glossed *dri (female yak)* in all four phrases containing it, where it
means *to write* — and the yak glosses no chunk anywhere. Fixes: an authored
`chunk-glosses.json` entry now outranks a roster match, and where several cards
share a form with no same-district tie-break the gloss is **withheld with a
question naming the competing cards** rather than guessed. 13 wrong glosses
became 13 questions.

**Also found, not fixed.** Our `uncle` (`ཨ་ཁུ`) and `aunt` (`ཨ་ནེ`) are the
**paternal** terms carrying generic English glosses — the site files exactly
those two as paternal and gives `ཨ་ཞང`/`སྲུ་མོ` for the maternal ones. Both forms
are right and both glosses are too wide, so a learner uses one word for two
relatives and is wrong half the time. `uncle`'s own definition admits it: *"kept
here as the general term"*. The two maternal cards are added; the two glosses
need a reviewer.

- **Status:** applied. `reports/tibetan101-audit.md` is the record, regenerated
  by `scripts/audit/tibetan101_audit.py` (`--check` gates it). Roster
  **1,045 / 416 / 185 / 3,367**, all `status: "draft"`, `validate.py` 0 errors,
  `validate_read.py` 56 passed / 0 failed, never-do violations 0.
- **Not done, and deliberately:** Tier 2 verb phrases (above); the board prompt
  `claude/board-prompt-sets-2026-08-16.md` is **written and not handed** — it
  must wait until `_ds/` is synced upstream, because handing it causes an export
  and the export is written top-down.

## 2026-08-16 — The answer band de-noised; four rulings on the second audit pass

**Context.** The 2026-08-16 board order was handed and executed the same day.
Thosam reviewed the new export and objected to the `C·8 AnswerBand` specimen:
*"there is too much noise / info that does not bring any value"*, quoting three
bands. **The objection was his own ruling, made earlier that day and never
propagated** — §2 of `docs/03` was amended to scope the rule sentence, `S7·✓`
had already dropped it on 08-15, and no board order carried it further. This is
the failure mode this log's 08-16 audit entry names, occurring again inside
twelve hours.

**1 · The band drops the rule sentence on recognition drills, and its own replay
button where one is already on the frame.** Asked how far to cut, Thosam chose
the propagation fix **plus** the duplicate-replay cut, and declined to cut the
romanization. The scope turned out to be two frames — `V6·✓` and
`Stop 1.1 · 10c`; every other band already suppressed its replay. The parked
`S13·2a` had raised exactly this and left the scope open (*"only the second-look
round, or every answered band that already carries audio above the fold"*); the
answer is **every band**, and the test is literal: if a working play control is
visible, the band passes `audio={false}`.

**2 · `sort-what-changed` loses its `reason` field.** All 16 records carried
`"§8 position 5 — the learner sorts the set before being shown it whole"` — a
citation of `docs/03` sitting in the one field `AnswerBand` renders. Nothing
bound it, so nothing leaked; it would have the moment the app did what §2
requires. Dropped rather than re-authored, because `RB17·✓` already carries the
meaning in its headline. Read `reason` coverage: **34 → 18 records, `spot-it`
only.** The twelve Sanskrit ones (*"It is ཏ drawn backwards."*) are the only
copy in either dataset that unambiguously earns a second line.

**3 · The stack drills keep the rule in the headline; the 82 sentences are not
authored.** §2 named six glyph and stack families as carrying `reason` and said
it *"is already on those records"*. It is on **0 of 82** — `find-the-root` 36,
`build-the-stack` 41, `what-attaches` 5 — and never was. The board draws these
correctly as one sentence that is verdict and rule at once (`RB9·✓`, `R8`,
`X5`), which reads tighter than the three-line shape the spec asked for. **The
spec bends to the board.** Rejected: authoring the 82, and splitting the ruling
by family.

**4 · Retired exercises move to a dated `§7.9 Retired` appendix.** `V8` and
`RB8` still had live catalogue dossiers in `docs/03` §7, and `RB8`'s stated
failure mode read *"Fails when: it is dropped again"* — which is what had just
happened, by decision. Kept rather than deleted: `RB8` had been cut twice before
against explicit restore orders, and the record of why it kept coming back is
the only thing that answers the next person who wants it back.

**Found on the way, and not asked for.** `docs/04` §Voice still carried the
superseded blanket rule *"and always names the rule"*, and `S7·✓`'s slabel cites
that paragraph as the rule it is excepting itself from — a stale sentence
staying load-bearing. Its factual premise was wrong too: it claimed S7's prompt
draws the romanization, and the board draws glyph only. Both corrected. The
crane's sanctioned list in `docs/04` and in the design system's
`guidelines/exercise-machine.md` both still named retired `Q4`.

**Verification.** `validate.py` 0 errors / 108 warnings · `validate_read` 56
passed, 0 failed (rule 11.1 re-baselined 350/5,787 → **353/6,221** against the
08:06 export, with the reason recorded in the constant's comment) ·
`build_v3 --check` exit 0 · `check_doc_figures` **caught six live regressions
and now passes**, with nine new bans · `check_readonly` OK · `board_prompt
--check` drift cleared.

## 2026-08-16 — The percentage ban is dropped; the final test carries a mark

**Decision.** `docs/01`'s never-do clause forbidding "a percentage, grade, score,
or accuracy figure" is **removed outright** — the first line of that list deleted
rather than excepted. The final test shows a **percentage and a 90% pass mark**.
Section exams show **a count** of what was right, no threshold. Nothing else in
the product shows a number as a score.

**Reason.** Thosam's, in his words: streaks, haptics and sound "can be thought as
in-built feedback and UX — subtle", and the mark is the weight a final test
should carry. Asked to choose between a narrow carve-out for the final test, a
broad one for exams generally, and deleting the clause, he chose deletion.

**The concern was raised once and reaffirmed.** A 90% mark collides with four
things on record: the clause itself, the philosophy's "no fail state", `docs/02`'s
"gate opens on completion, no pass mark", and Thosam's own answer earlier the same
session choosing a review set "since nothing may be failed or scored". He
confirmed after seeing all four.

**What keeps it coherent.** *Under 90% withholds nothing* — the retake is free,
immediate, and nothing is locked behind the mark, so the philosophy line survives
as "nothing withheld for getting something wrong" rather than as "no fail state".
The exam is randomly sampled, so a retake is not the same paper. There is no
mid-exam save: leaving restarts with fresh questions.

**Alternatives rejected.** Completion-only (his first answer, reversed);
pass/fail recorded but never shown; a narrow carve-out naming only the final
test. **Not weakened by this:** `docs/03` §6's progression model, `S8`'s "counts,
never scores", `docs/04`'s `n of m` position rule, and the separate and untouched
ban on auto-scoring a learner's voice. `docs/01` carries a paragraph fixing the
three scored surfaces so the deletion cannot be read as a licence.

## 2026-08-16 — The run counter and interface sounds are signed

**Run counter.** `S7·✓`'s `4 in a row` **stays**, and the never-do list's "combo
counters" clause gains its first exception, worded as narrowly as the metronome
and confetti ones: a run inside a single set, from three upward, reset when the
set is left, never persisted to the profile, never compared between learners,
never a gate. It was found in the audit as an unsigned violation — adopted on the
board 2026-08-15 and recorded nowhere else — which is exactly the state the
never-do list exists to prevent. Signing it closes that.

**Interface sounds.** Admitted as a class distinct from teaching audio: the
correct tick, the run, the stop-complete moment. "Human recordings only" is
narrowed to *anything the learner imitates* — nobody repeats a UI sound back.
P2's sound/vibration row, which the 2026-08-09 settings order already added, is
the off-switch. Rejected: haptics-only (already specified, `docs/05`), and
deferring the spec.

## 2026-08-16 — Exams are review sets; picture-match and RB8 go

**Exams.** Neither exam node had an item-selection rule, and
`read-track-spec-v1.md` §15 said so: "nothing in this dataset decides its item
selection." Decided: an exam is **the §4.6 drill machine with pool = the
section**, not a new concept. **Section exams 5–10 items; the final test ~100,
sampled across everything met.** Items are drawn randomly, so retakes differ.
`X1`'s declinable-with-dignity framing and `X2`'s exit are unchanged; the exit
now means restart-with-fresh-questions rather than resume.

**Picture-match is removed entirely** — `V7·p` off the board, `V8` out of
`docs/03` §1/§5/§7, and its 68 exercises retired. Measured before deciding: it
reaches **68 of 952 words (7%) across 10 of 24 districts**, and several prompts
are abstract (a picture of "hello", "the Tibetan language", "heart / mind").
Thosam: "i dont think this exercise make sense". Note the premise that only
artifacts carry pictures is not quite right — 31 illustrated words are not
artifacts and 67 artifacts have no illustration — but the thinness held.

**`RB8 Find its place` is dropped deliberately.** `content/json/read/` holds zero
`find-its-place` records, and the picker drops empty modes, so it would have
vanished at runtime — a third silent removal of a screen `docs/03` §1 defends at
length. Retiring it by decision is the honest version. `docs/03` stops defending
it.

**The answer band's rule sentence is scoped, not universal.** §2's contract —
every band names the rule, bound from the record's `reason` — had **no data**:
`reason` is on 0 of 3,005 Speak exercises and 34 of 549 Read ones. Thosam: "if it
is just text that pollutes the screen without adding anything new to the user,
then this is just pollution." Bound now only to the families where the rule *is*
the lesson (`spot-it`, `sort-what-changed`, the stack drills — exactly the 34
that have it); recognition drills name the answer, as `V6·✓` already draws.

## 2026-08-16 — The ya-btags is absorbed before i; three segmenter rulings

Thosam supplied romanizations for the 26 shipping records that had Tibetan and no
`roman`. Checking them against the 400+ already in `content/` surfaced five
conflicts, and resolving them produced one real sound rule.

**The rule.** *"khaa with the yatak is khyaa, but with the vowel i, it is khii."*
The ya-btags glide is **absorbed before `i`** — a cluster × vowel interaction, not
a change to the `གྱ` cluster itself. **22 records, 3 words:** `khyi`→`khi` (dog),
`khyii`→`khii` (the genitive particle, 16 records), `khyimtshe`→`khimtshe`. Tone
survives untouched, carried by vowel doubling, so `khi` (high) stays distinct from
`khii` (low). **Before `e` the glide is kept** — `khyerang`, `khyer`, `khyen`,
`khyerwa`, 58 records — marked `[REVIEW]` in `sounds.json` as *tested and kept*,
not assumed.

This was nearly much worse. Asked whether to collapse `khyii` to `khii`, the first
answer would, applied at cluster level, have changed **94 records** — dog, husband,
neighbour, clothes, `khyerang` — and contradicted the Read track, which teaches
`combiner.ya-tak` as the first of its seven combiners. Quantifying the blast
radius before applying it is what turned a wrong global edit into a correct local
rule.

**Segmenter rulings** (spacing comes from `chunks.segment()`, and a phrase's
romanization is its chunks joined, so each of these re-chunks its phrases and
regenerates their E8/E9 exercises): `roknhang` → **`rok nhang`**; `chichö` →
**`chi chö`**, with `lang khor` standing and `lang gor` rejected as a slip;
**`phööke` stands** as one word with no accent, consistent with the accent-dropping
of 2026-08-15.

## 2026-08-16 — Ship everything; numbers recorded in full; T1 retires

**Ship scope.** `docs/02` had offered Sections 1–2 versus the whole first walk and
never resolved it. Resolved: **everything** — both walks, all 24 districts, plus
the Read track. No staged release. The consequence is stated plainly because it is
now the project's critical path: **~1,830 recording takes plus ~178 for the
numbers, human-recorded, before any release.** That is ahead of all code, and the
native-review pass sits on it.

**Numbers 11–99 recorded in full**, closing the Market district's inability to say
a price, plus ཁྲི (10,000), འབུམ (100,000) and ས་ཡ (1,000,000) at Thosam's
request. Claude authors the forms; every one ships `status: "draft"`,
`reviewed_by: null`, `[REVIEW]` flagged, and enters the same native pass as the
other flagged records. Nothing here is marked reviewed.

**`T1` retires**, closing O22 by removing what it asked about. `T2` was its only
daily door and retired 2026-08-15. `Q1` was rejected (it is now strictly the pool
picker), `G1` was rejected — "its gonna pollute for no reason" — and a Journey row
was declined. A surface with no entrance cannot be "a reason to open it on a quiet
day". The ~110 cards stay browsable through the Collection tab, which is where you
go to look at them anyway. `O8`'s home-screen widget goes with it.

**The four coding decisions**, all previously deferred to "coding start":
**expo-audio** over deprecated `expo-av` (O3); **a build-time token script**
rather than hand-maintenance (O4); **English-only strings behind an i18n shim**
(O5); and **`TibetanText` appends the trailing tsheg at render** (R2, open since
2026-08-07) — the content set stores none on any of its 1,368 records, the board
draws 87 with and 19 without, and one render-time rule is the only version that
cannot drift.

## 2026-08-16 — Numbers: the pattern, not the eighty-nine

**O1 has two halves and only one was about recording.** *Record 11–99 in full*
stands — ~178 takes, no splicing, and the linking syllable that made splicing a
native-ear question never arises. **What became a vocabulary card is a separate
question**, and it was put back to Thosam once the cost was measured.

**Decided: the pattern.** The roster gains **20 records** — 11–19, the eight
decade joiners, and ཁྲི / འབུམ / ས་ཡ — and 21–99 are taught as what they are, a
decade plus a joiner plus a unit. Not 89 cards.

**Why, measured before deciding:** 89 cards would have taken Market from 80
words to **169 — 4.4× the median district (38)** and roughly nine extra stops of
counting before a learner reached anything else. Market is already the largest
district in the roster. Eighty-nine facts where the language has eight patterns
is also simply the wrong shape, and it is the same reason the Read track teaches
stacks rather than syllables.

**Staged, not shipped.** `content/proposed-numbers.json` holds all 20, following
the `proposed-verbs.json` convention. Nothing enters the roster until it goes
through `build_v3.py` and the full chain — which rebuilds `vocabulary.json` from
the spec and carries no Tibetan, so it must be run whole or the translation pass
dies. That run is deliberately left as its own step.

**What the staging file proves and what it does not.** Every one of the 20 forms
**decomposes legally** under the taught inventory and romanizes without a gap.
That is a well-formedness proof, not a correctness one — a legal string can
still be the wrong word. All 20 carry `review_flag: true`, `status: "draft"`,
`reviewed_by: null`. The eight joiners get their own sharper flag: the joiner is
the load-bearing part of 21–99, one wrong joiner is wrong nine times over, and a
native reviewer confirms each before any of the 89 are recorded.

**Corrected the same day against Thosam's own reference tables — four of the
twenty were wrong.** 18 was `བཅོ་བརྒྱད` (**only 15 takes བཅོ**); the twenties
joiner was `རྩ` and is **`ཉེར`** — 21 is ཉེར་གཅིག, not ཉི་ཤུ་རྩ་གཅིག; 10,000 and
100,000 were `ཁྲི` and `འབུམ` and take the ཆིག prefix, **`ཆིག་ཁྲི`** and
**`ཆིག་འབུམ`**. Seven of the eight joiners were right. *This entry originally
claimed "15 and 18 take བཅོ" and flagged that as the likeliest error — the flag
pointed at the right line and drew the wrong conclusion from it.*

**The roster needed no correction.** Checked against the same tables: 0, 1–7, 9,
10, 20, 30, 40, 50, 60, 70, 80, 90, 100 and 1,000 all match what already ships.

**`པརྒྱད` is a typo — ruled 2026-08-16.** Thosam's tables write 8 as `པརྒྱད` and
18 as `བཅུ་པརྒྱད`; he confirmed both are a པ/བ slip in the source. It could be
put to him as a settled question rather than a guess because **པ is not one of
the five prefixes** (ག ད བ མ འ), so `པརྒྱད` has no legal parse and cannot be
romanized at all — an impossible spelling, not a variant. His own material
already disagreed with itself three ways: 80 is `བརྒྱད་ཅུ`, the ordinal is
`བརྒྱད་པ`, and the roster shipped `བརྒྱད`. **The inventory's prefix set stands
unchanged.**

## 2026-08-16 — Every record is romanized; the ya-btags is absorbed before `i`

**1,368 of 1,368, 0 blocked.** 26 shipping records had Tibetan and a blank
romanization line where every other card shows one — and a populated `thl` in
the same record, which is how `hpa(?) ren si` came within one null-fallback of
being read as the pronunciation of *France*.

**Thosam supplied 22 romanizations** (23 records; two "I'm from" records are
byte-identical). They live in `romanize.py`'s `OVERRIDES`, which is where a
claim about how Lhasa is spoken belongs — "kept here rather than in the data,
because every entry is a claim a native speaker has to sign." Ten are loan and
Sanskrit orthography the parser is not built for (པདྨ, མོ་ཊ, ཀི་ལོ་མི་ཊར); twelve
are frame phrases whose `___` the machine was silently dropping, turning
`ངའི་མིང་___་ཡིན` into `ngé ming yin`, which reads as a finished sentence and is
not one.

**The sound rule.** *"khaa with the yatak is khyaa, but with the vowel i, it is
khii."* The ya-btags glide is absorbed before `i` — a cluster × vowel
interaction, now `glide_absorption` in `sounds.json`. **22 records, 3 words**:
`khyi`→`khi` (dog), `khyii`→`khii` (the genitive particle, 16), `khyimtshe`→
`khimtshe`. Tone is untouched, carried by the doubled vowel, so `khi` (high)
stays distinct from `khii` (low). **Before `e` the glide is kept** — `khyerang`
and 57 others — marked `[REVIEW · native]` as tested and kept rather than
assumed.

Two things this nearly became, both caught by measuring:

- **The first answer would have changed 94 records, not 22.** Collapsing the
  `གྱ` cluster outright would have taken dog, husband, neighbour, clothes and
  `khyerang` with it, and contradicted the Read track, which teaches
  `combiner.ya-tak` as the first of its seven combiners on its own `L8` sheet.
- **The first implementation was wrong and the derived views said so
  immediately.** Testing "onset ends in `y`" rather than "the `y` comes from a
  ya-btags" turned ཉིན (day) into `nin`, ཉི into `nhi` and ཡིག (letter) into
  `ik` — ཉ's sound is inherently `ny` and ཡ's is `y`, and neither has a glide to
  absorb. With the structural guard the whole Read corpus moves by exactly two
  readings, both real ya-btags cases.

**Word division, ruled against the roster:** `roknhang` → **`rok nhang`** (6
records), `chichö` → **`chi chö`** (3). `phööke` **stands** as one word with no
accent. Both propagate into every phrase containing them, because a chunk takes
its `roman` from the card it resolves to.

**One parser bug, and it is open question A6's.** The last two records —
`ང་འདི་བརྗེད་ཀྱི་མིན།` and the momo phrase — failed on `བརྗེད` and `བརྔོས`, and
the cause was not the shad this session first guessed. The prefix-legality check
tested the prefix against the **bare root through a superscript**: ཇ and ང are
not in བ's bare-root set, so two ordinary words were rejected. The inventory's
own review note states the test that licenses the fix — *"A prefix set that
rejects a word either of those draws is wrong"* — and both are drawn by the
Speak roster. **The sets were not touched**: adding ཇ and ང to བ would assert
བཇ and བང are legal, which they are not. The check now simply does not reach
through a superscript, and བཇེད and བངོས are still correctly rejected. The five
sets remain `[REVIEW · native]` under A6.

## 2026-08-16 — Every phrase is drillable; `thl` leaves the exercises

**`thl` is out of every exercise prompt, and rule 29 keeps it out.** All 948
`meaning-pick` records carried `prompt: {bo, roman, thl}` against the 2026-08-09
decision that THL never appears on an exercise. They **differed on 822 of 948**
(`trashi delek`/`tashi delek`, `khaaler`/`ga ler`), and 10 carried `roman: null`
beside a populated `thl` — one reading `hpa(?) ren si`, an unreviewed machine
guess with the uncertainty marker still in it. Anyone writing the obvious
null-fallback shipped the retired system. `validate.py:255` documented the rule
in a comment and enforced nothing; **rule 29** now fails the file.

**Picture-match's 68 exercises are gone**, per the retirement above. 3,005 → 2,937.

**All 416 phrases are now drillable — it was 328.** The generator drilled a
phrase only if its own stop held four of them (`if len(others) < 3: continue`),
so **88 of 416 had no exercise anywhere**: taught on an S5 card, then
unreachable forever, including from Practice, because the drill machine
(§4.6) filters these same records. Fixed by giving phrases the widening words
already had — stop, then district, then the walk. The third ring is not
optional: circuit 2 holds 32 phrases across 24 districts, so a district's
second-walk pool is one to three and can never reach four, which is exactly
where the last 22 sat. Total 3,152, `phrase-recognise` 416. The one-per-stop
`phrase-produce` cap still holds at max 1.

**Rule 25 now tests audibility rather than a type name.** Four phrase-only or
single-word stops began generating exercises with the widening and open on
`phrase-recognise`, whose prompt is the phrase's own audio — the ear does come
first, and the literal `type == "listen-pick"` test failed them wrongly. §4.1's
clause says *audible*; `listen-pick` was its parenthetical. Verified not to be a
weakening: `meaning-pick`'s prompt is `{bo, roman}` and carries no audio, so the
169-stop bug O16 was written against still fails.

**Four second-walk words remain undrilled** and are left as they are for now —
the same structural cause, on a set small enough to see individually.

## 2026-08-16 — Three places the spec lost to the board and the data

Each of these had `docs/03` on one side and both the board *and* the generated
dataset on the other. Precedence says `docs/03` wins on behaviour — but a rule
that neither the drawing nor the data has ever obeyed is a rule nobody wrote
down correctly, and all three were settled the other way.

**`RB17` closes the mixed tail, it does not open it.** §4.2 and the 2026-08-15
entry both said it opened, and called the order deliberate. The board draws it at
position 24 of 25 and `content/json/read/stops.json` agrees. Settled the board's
way: the enumeration arrives **once, after the items have been drilled**. Sorting
what changed is a summary, and a summary before the work is a preview of the
answer. `R11` still closes the stop after it.

**`E5` prompts in English, with the model on reveal.** §1 said "audio (+EN)",
§3's firewall said "the prompt always includes the Tibetan audio", and §7's
dossier said "English, plus the native take on reveal" — the doc contradicting
itself three ways, while the board and all 82 records did the last of them.
Settled on §7's side, and §3 is **narrowed rather than waived**: what is barred
is being handed English and a set of *parts*. Recalling a phrase already taught
whole and saying it aloud is not assembling it — nothing is chosen between, no
forms are offered, and the comparison is against a recording rather than a
grammar. This removes a regeneration the plan had scheduled: the 82 prompts stay
as they are.

**`spot-it` gets a screen and a dossier as `RB18`.** 18 generated exercises had
no catalogue entry, no dossier, and a `screens` field pointing at `C13`/`C14`,
which are static teaching cards. Retiring it was considered and rejected on a
measurement: **Section 10 is nothing but `spot-it`** — `stop.10.1` is six and
`stop.10.2` is twelve — and nothing else in the Read dataset drills the three
taught punctuation marks or the six Sanskrit letters. Retiring it would leave the
last section before the final test teaching and never checking. Its anatomy is
`RB6`'s with the audio prompt replaced by a written question, which also makes it
the one Read drill unaffected by audio-free mode. **Decoys stay** as the four
untaught marks (༔ ༄ ༅ ༴): they are real marks a reader meets, and a plausible
unseen glyph tests the function rather than the memory of a list.

## 2026-08-16 — Audit: the export is ahead of the documentation

A full audit of the prototype and specs ran before the decisions above. The
headline reverses what this repo believed: **`CLAUDE.md`'s warning that the export
"still predates all three orders" is false in every particular.** The five-type
catalogue, `E8` without decoys, `G4` interrupting mid-stop and the one-screen stop
ending are all fixed. Ten rounds of orders have executed, two of them ones the
docs still called "not yet handed".

**The structural finding, which outlives the instances: decisions land in this
file and stop here.** The 2026-08-09 romanization decision reached `docs/04` but
not `docs/02`, `05` or `06` — where `docs/06` would have encoded the retired THL
aria-label *in a test*. O19 closed 2026-08-08 and was still called open in
`docs/02`, `docs/03` **and** on the board, because
`claude/board-prompt-decisions-2026-08-08.md` was **never handed** and five of its
six parts are untouched.

Verified defects the remediation carries: `Q4` and `T2` each name the other as the
owner of the "nothing due" state, and both are unusable as drawn · `thl` sits in
all 948 `meaning-pick` prompts against the 2026-08-09 decision, differing from
`roman` in 822 of them · `phrase-produce` carries `{en}` and no audio, which built
literally is the shape the firewall exists to prevent · `SyllableChip` bypasses
`TibetanText` on 236 glyphs · seven `L8` screens render but are absent from
`screens.json` · the roster is **952 / 416 / 175**, not the 1,004 / 420 / 150 every
document states. `scripts/audit/check_doc_figures.py` knew about none of it, and
gains those figures so it cannot recur.

**Clean, and worth recording as clean:** referential integrity is exact — 3,005
Speak and 549 Read exercises, every one bound to a stop, zero dangling, zero
orphans, every word and phrase taught somewhere. No emoji, no padlocks, no
paywall, no lorem. Zero raw hex, zero `1px solid`, zero literal box-shadows in the
board files. `build_v3 --check` byte-matches. No script regressions exist.

## 2026-08-15 — The Practice tab is a list, not a dashboard

**`Q1` stops being a hub.** One row per district met, in journey order, each
carrying `{n} words · {m} phrases` and landing on `Q8`; the current district
is tinted, no badge. Above them, one row — *Everything · n you're still
getting* — pool `everything` + selection `still getting`, landing on `Q5`,
**present only when the count is non-zero**. A district the learner has not
reached is absent, never greyed and never padlocked. Nothing else is on the
screen.

**What was wrong was not density, it was that one machine was drawn as six
features.** `docs/03` §5 defines practice as `pool × selection → set`. On the
old `Q1`, *Due today* was pool `everything` + selection `due today`, *Worth
another look* was pool `everything` + selection `still getting`, and *Pick a
district* was pool `one district` — the same function with three arguments,
rendered as three unlike cards with three differently-worded buttons, beside
three things that were not the machine at all. Measured: **`min-height:1520px`
in a 390×760 frame**, the second-tallest frame on the board after `J2`, which
is a map; around nineteen tap targets; **five of them starting something**,
two of those labelled *Start*.

**And it was drawn in a state a beginner cannot occupy.** The shortest review
interval is one day (§6), so nothing is due until the day after a learner's
first stop: a beginner's Practice tab has zero due in both tracks, and the
frame drew both queues full. The beginner's real state was `T2`, filed on
`Board-Systems` as the edge case. For a product whose primary audience is
diaspora beginners, the default and the exception were the wrong way round.
The new shape has one state that grows by gaining rows, so `T2` retires.

**`Q8` is drawn at last.** It has been specified in §5 since 2026-08-04 —
pool `one district`, words and phrases interleaved — and existed on no board
and in no order. Because it had no destination, `Q1`'s district rows were
routed to `D1`, which is where the Journey tab already lands; they read as
redundant navigation because their real target was missing. `Q8` now takes
both entrances — `Q1`'s rows and `D1`'s existing *Practise this district*.

**Four blocks leave `Q1`, none is deleted.** The training-ground card goes
(all five of its piles are Read data, §4.3, and `RBH` already draws its door —
verified in the export). *Words you can now read* moves to `RBH`. The
second-walk offer moves to `S2`, which is the tab it was always nudging
toward. The two due cards come off the tab root — the scheduler is unchanged
and still orders `Q2` and `RB15`; it simply stops announcing itself on
arrival, which §6 already forbids doing with intervals.

**Four of the six worth-another-look chips were defective**, found while
redrawing the block and checked against the roster: **`ག་ཚོད · ka tsö · how
much` is not a vocabulary record at all** — no vocabulary entry holds ག་ཚོད,
it exists only inside phrases and is romanized **khaatshö** there, so the
frame drew a word card for a record with no form, the defect the 2026-08-09
parking pass closed. `དར་ལྕོག` is **thaarchok**, not *darchok*; `ཆུ་ཚོད` is
**chhutshö**, not *chu tsö*, and is a **District 13** record no
District-8 learner has met; `སྤོས` is one stop past the specimen. The order
carries a replacement set of six, all inside the specimen's met pool.

**Status:** the order is `claude/board-prompt-practice-2026-08-15.md`. It was
**handed and executed** — `Q1` is the list, `Q8` is drawn in four variants, `T2`
is retired. `O22` closed 2026-08-16 by retiring `T1`. *(This line read "not yet
handed" until 2026-08-16, a day after the export carrying it landed.)*

## 2026-08-15 — The build-the-stack tray is the whole writing system

**The tray is complete and identical on every assembly.** Four rows, each in
the order its own section taught it: the thirty drawn **four to a line** (the
Section 2 grid, so the learner reaches where the curriculum put it), then `ར ལ
ས` on top, then `◌ྱ ◌ྲ ◌ླ ◌ྭ` underneath, then `◌ི ◌ུ ◌ེ ◌ོ`. The frame
scrolls; `Check` pins to the bottom. Read spec §9.1a is new and owns this.

**Why, and it is the opposite of the objection first raised against it.** The
old tray held the answer's own letters plus two distractors — four to seven
chips — which *names the letters of the answer*: the learner was only choosing
slots for a set already handed to them. A constant tray gives nothing away
**because** it never varies, and it is the harder exercise, since the letters
have to be recalled rather than recognised. Per-exercise slot bays would leak
the parse; a constant complete tray cannot.

**A chip is a letter, not a token.** It may be placed as many times as the
answer needs and stays in the tray. Seven of the 41 assemblies require it —
`བསྒྲིབས` wants `བ` and `ས` twice, `གཅིག` wants `ག` as root and as suffix — and
the generator de-duplicates the answer's letters, so a spend-on-use tray could
not have solved them at all.

**The carrier is `◌` (U+25CC), not `ཨ`.** Both were legal under §2.4. Thosam:
`ཨ` is Section 1's teaching scaffold — a base put under the mark so the mark is
visible while it is being taught — and what a learner places in an assembly
slot is the mark itself. `ཨི` would also read as a syllable in its own right.
§2.4 is rewritten; the vowel-chip-on-`ཨ` rule is gone.

**A rival is a syllable the roster teaches.** Rule 50 asks that exactly one
buildable syllable match the reading, or the glyph is shown. With a complete
tray, "buildable" is "is a syllable", so the boundary had to be drawn
somewhere: the slot rules permit `རྐྲ`, `དསྨིག`, the da-drag `དགོནད`, none of
which Tibetan attests. Counting those put the glyph on **31 of 41** and stopped
the exercise being a listening test in order to defend against stacks the app
has never shown anyone. Rule 49 already draws this line for options; it now
draws the same one for the answer space.

**The measured cost, accepted: 27 of the 41 show `prompt.glyph`, against 9.**
All 17 in section 7 do, because `ཀླ གླ བླ རླ སླ ལ ལྭ` all read `la` and a
complete tray builds every one. That is not a loss — §3.3 already held that
showing the glyph makes the exercise a test of *which slot each letter goes
in*, which is exactly what section 7 teaches. 14 stay sound-only, all of them
the whole-syllable assemblies of sections 8 and 11.

**Two defects found under it, both pre-existing.** `rivals()` enumerated
permutations of at most three *distinct* chips into a fixed base+subjoined
shape, so it could see neither a repeat nor a four-letter form: it passed `ཀྲ`
against `རྐྲ`, `ཏྲ` against `རྟྲ`, `དབྱངས` against `དབྱང`, `འབྲས` against
`སྦྲས` — five exercises whose recording chose no single answer, under a rule
asserting that it did. And validation rule 15 never looked at the tray at all,
which was safe only while chips were whole letters; it now sweeps all four
rows.

**Status.** Generated and green — `50 one answer per assembly: 41 assemblies;
27 need the glyph`. The board still draws the old tray; the order and its
correction are `claude/board-prompt-read-assembly-2026-08-15.md` and
`…-correction-2026-08-15.md`, the second because the first was handed before
this decision landed.

## 2026-08-15 — ལ is heard again · འི fronts · the diminutive parses · O20 closes

Four sound-value corrections and one extraction rule, all from Thosam reading
the zodiac collectible screen and asking why `བྱ` was romanized `ja`.

**`བྱ` and `འབྲུག` were never wrong in the data.** `chhaa` and `druk` are what
the roster holds; the board was showing the `thl` field for one and an invented
form for the other. THL never appears on a card (2026-08-09) and this is the
first time that leak has been caught on a shipped-looking screen.

**Final `ལ` is `l` again, and this is its third trip.** It was `l`, became
silent on 2026-08-06 on Tournadre & Suzuki Pt 2 §9.6.6 (*final L is preserved
only in Tö dialects*) with Sung §3.2.3 agreeing, and was briefly reverted and
re-reverted on 2026-08-09. Thosam's ground this time is his own speech and is
different in kind from the last exchange: *"it depends on the tibetan speaking,
sometimes i pronounce it sometimes i dont as a native"* — variation, not error.
A romanization has to print one form, and where a native says both, the one
that shows the letter can be un-learned while the one that hides it cannot be
recovered from the page. **The sources are not overturned**; they describe a
norm this speaker varies from, and a second speaker has never been asked.
Consequence: `ཀད` and `ཀས` stay `ke` and `ཀལ` becomes `kel`, so section 4 stop
10's three-way homophone is a two-way one; `ར` and `ལ` now agree, which they
did not before. 86 roster strings changed. It also made a piece of learner copy
true that had been false — the section 4 overview says *"Two of the four
vanish"*, which it was not while `ལ` was silent.

**`འི` fronts the vowel exactly as a `ས` suffix does.** Thosam: *"འི behaves
like a ས in terms of pronunciation"*. The cell was the flat string `é` and was
wrong in four cases of five — `ཀོའི ཀུའི ཀེའི ཀིའི ཀའི` all returned `ké`,
where the vowel survives as `kö · kü · ke · ki · ke`. The fronting map was
already in the file; it had simply never been wired to this cell. It passed for
as long as it did because the one form anyone tested was `མའི`, whose `a`
fronts to `e` and reads correctly either way. Side effect, and an improvement:
`མའི` is now `me`, not `mé` — the accent was a THL artifact, and nothing else
in the Trungtrung path produces one.

**The diminutive `འུ` had no legal parse at all.** `འ`-carrying-a-vowel was
handled in exactly one case, `འི`, because R1's Section 10 title needed it —
which was never a decision. Four roster records were blocked by the omission
(`སྤྲེའུ` the monkey, `བེའུ` the yak calf, `དཔལ་བེའུ` the endless knot,
`སྒེའུ་ཁུང` the window) and **rule 38 reported `སྤྲེའུ` as an undecomposable
*board* syllable for a week, pointing attention at the export when the parser
was the problem.** `འུ` adds a `u`; `འོ` adds an `o` and is **[REVIEW ·
native]** — recalled rather than attested, and nothing exercises it yet.
Blocked records fell 31 → 26; the monkey reads `treu`.

**A sounding subscript owns the onset.** The word-internal `connected` override
is keyed by the root letter and replaced the whole onset, so a cluster was
discarded wholesale inside a word: `བ་གླང` → `phaakang`, `གྱ` → `ka`, `བྲ` →
`pa`, `དྲ` → `ta`. Four roster records shipped that way and Thosam caught the
first. `ཝ` stays exempt because it is genuinely silent. The doubling still
drops — tone belongs to the word.

**O20 closes: a shared `<script>` payload is counted once.** Updating the
tripwire constant to `328/6179` would have baked in a number the extractor's
own docstring called an over-count. The export is **seven** files (this repo's
`CLAUDE.md` says six) and blocks 1–3 of each are byte-identical. Deduplicating
by content gives **328 distinct / 4,070 tokens**; distinct never moved. Read
spec §11.1 gains this as rule 6.

**Rule 46: three worked syllables rebound rather than waived.** A board
re-export dropped `བདུན`, `གཉིས` and `མདོང`, leaving three of section 8's
twenty-four pointing at syllables no learner meets — red since 2026-08-08.
`བདུན → སྨོན` (mhön, keeps a silent affix changing the root plus a fronting
`ན`, and adds the nasal pitch-raise the stop lacked) · `གཉིས → རྗེས` (dje) ·
`མདོང → སྡོང` (**dong — the identical reading**, a superscript where there was
a prefix, so any copy saying "dong" stays true). The first pick for `གཉིས` was
`དགོས`, dropped because it shares root `ག` with `རྒྱུགས` and rule 51 deduped a
what-attaches; rule 57 caught the count drop.

**Status.** `validate.py` 0 errors / 134 warnings · `validate_read.py` 56 of 59,
the one failure being check 53, which is O21's known-bad gate on a handed
historical order. Two things left flagged, not fixed: `འོ` is unverified, and
`བེའུ → pheeu` is mechanically correct (`བེ` is low) but reads oddly.

## 2026-08-15 — ད + བ drops its w before every vowel mark

Thosam, seeing the four forms for the first time: *"དབི wh — this is `i`, an
exception"*, and of the set, *"i u e o all with higher pitch"*. `དབྱ yha` and
`དབྲ rha` he confirmed correct and they are untouched.

**This answers a `[REVIEW]` rather than reversing him.** The condition it
changes was not his: an earlier session added `vowel_forms {ོ: "", ུ: ""}` from
**Tournadre & Suzuki Pt 2 p.176 rule 6**, quoted verbatim in the file —
*"DB (in front of A, E, I) > w; DB (IN FRONT OF O, U) > u"* — and flagged it
*"Thosam specified དབ, དབྱ and དབྲ with the vowel a in every example he gave, so
this condition contradicts nothing he said — but he has not seen it."* He has
now seen it.

- **The rule is now: the onset survives only before the inherent a.** `དབ` stays
  `wha` and `དབང → whang`, his own corroborated example, is unaffected — ང is a
  suffix and the vowel there is the inherent a. All four marked forms are bare:
  **དབི `i` · དབུ `u` · དབེ `e` · དབོ `o`**.
- **It overrules Tournadre on ི and ེ, and that is recorded in the file, not
  hidden.** Tournadre keeps the w before E and I; a Lhasa speaker does not. That
  disagreement is the stated reason this project has its own romanization —
  `sounds.json` `_why_not_a_published_system`, Thosam 2026-08-06: western
  systems are "not consistent with the standard spoken tibetan".
- **Pitch is unmarked and cannot be otherwise.** All four are high; the h device
  attaches to a consonant onset and these have none. `u` and `o` were already in
  that position, so nothing new is lost.
- **Still `draft`.** No native pass has run and this does not constitute one.
  Only two forms were previously visible to anyone (`u`, `o`); the four-vowel
  coverage added the same day is what put `whi` and `whe` on screen and made the
  question answerable at all.

## 2026-08-15 — the enumerating tips become a sort and a recap

Thosam, on `stop.3.1`'s tips: *"the best for the tips is at the end of the
reading lesson, maybe the user needs to click on those for which the sound
changes — this would look much better than fragmenting them."*

Measured first: the track's 122 tips have a **median of 27 words**; that stop's
two ran **47 and 69**, the longest in the track. The 47-word one explained ག, a
letter from the *previous* batch, and opened *"Now look at what it did"* with no
glyph on screen. The 69-word one carried three unrelated rules, one of them
about syllables the stop never teaches — every item in it is a ུ syllable.

- **The rule, now in `docs/03` §4.2: a tip states the procedure, never the
  outcomes.** *"Nothing you hear is the ད; cover it and read what is left"* is a
  procedure and stays. Which letters change and which do not is a table, and a
  table delivered one row per screen is what produced those two.
- **Two new surfaces.** `RB17 sort-what-changed` — a multi-select over the
  stop's whole set, each item beside its bare form, both playable — opens the
  mixed tail; `R11`, the recap table, closes the stop. The learner sorts the set
  themselves, then sees it whole. Order matters and is deliberate: showing the
  table first turns the sort into a memory check of the screen just closed.
- **Both are derived, never authored.** An affixed syllable pairs with the
  syllable of the same root and vowel carrying no affix; a stack pairs with its
  root letter; `changed` is the two readings differing. **16 of 44 stops
  qualify** — the ones teaching an affix over roots already known. The other 28
  teach bare letters and have no before-and-after.
- **The recap shows what the stop taught, never the full set.** Section 6 stop 1
  teaches 8 of the 12 stacks taking ར; the recap shows 8. `རྟ` `རྩ` `རྙ` `རྫ`
  stay reference on `L2`/`L6`. §4.3's rule binds: an item reaches a learner after
  the stop that teaches it.
- **The sort teaches no single item, on purpose.** It touches every item, and
  counting it as a meeting for each would let a thin stop reach §8's ≥3 on one
  exercise. Consolidation is not a meeting.
- **Batch regrouping is cancelled, not deferred.** The fault under those tips was
  `stop.3.1` splitting its two nasals across batches 2 and 3. Regrouping by
  phenomenon was the obvious fix and is rejected: it would reorder every stop,
  renumber every position, and make the walk read as a sorted syllabus.
  Consolidating at the end makes mid-lesson batching irrelevant instead of tidy.
- **Counts: positions 974 → 988, exercises 533 → 549**, spec §13.4 updated with
  the split reason. Check 57 caught it, as designed. `stop.3.1` is 26 → 25
  positions, which renumbers every worked-stop frame from 10 on — the real cost,
  and the argument for doing it before more stops are drawn.
- **One bug worth recording.** The first pairing keyed on root and vowel alone,
  so `ཀུས` (suffix ས, read *kü*) overwrote `ཀུ` and was offered as the bare form
  of `དཀུ` — teaching that the prefix changes *ku*, the one pair in the set where
  nothing happens. Bare now means bare in every slot.

**The sort and the recap compare BARE forms, not the drill form.** Thosam asked
why every Section 3 screen shows ུ. The first answer given — that a bare
combination is ambiguous — is *true*: run the decoder over the six and four
come out as root+suffix, `དག` reading `thaak` rather than `ga`, because ག ང བ མ
are legal suffixes and ཀ པ are not. That is the spec's "17 of 48", and it is
the behaviour of the engine, not a linguist's footnote. **But it is an argument
for declaring the root, not for adding a vowel** — which is what he said, and he
was right. The bare stacks were already in the dataset, already correct
(`stack.dga` reads `ga`, `ambiguous: true`, root declared), and every
prefix-demo syllable already carried `demonstrates` naming its bare stack. They
were parked as reference. The sort and recap now use them.

- **What it buys:** `ད` + `བ` is `wha` bare and `u` only under ཞབས་ཀྱུ. The ུ set
  put the one irregular form in front of the learner and hid the general rule.
  It also makes Section 3 read like Section 6, which already paired a root
  letter against its stack — Section 3 was the odd one out.
- **The drill items keep their vowel**, and the reason survives intact: a bare
  string cannot be sounded on its own, and §8's cue ladder — the vowel sits on
  the root — is Section 8's, not available here.
- **A real bug fell out of it.** `pronounce_syllable` took `parses[0]` blindly,
  so any ambiguous string was read whichever way the parser happened to order
  it, silently. Spec §4.4 already required an explicit root on ambiguous items
  and there was no parameter to pass one; `root=` now exists. `build_read` was
  never exposed — it declares a parse, and its own comment records the same bug
  being fixed for the 17 ambiguous stacks: *"an item reads by the parse it
  declares."* The library had not caught up with the generator.

**Still open, and both are Thosam's:**

Roughly 38 of the 122 tips are enumerative; two are done. The rest are listed
for review rather than rewritten by rule — tip copy is authorship, not a
transform.

**Four-vowel coverage, done as forms rather than items.** Thosam: *"do the full
coverage."* Every prefix-demo combination now carries all four vowel marks —
**48 items, 192 forms**, each with its own reading and audio path, one flagged
`drilled` (ཞབས་ཀྱུ, the form the item is keyed on).

- **Forms, not items, and the distinction is load-bearing.** The thing taught is
  ད + ག; ི ུ ེ ོ are instances of it. Four items apiece would be 48 → 192, would
  multiply §8's ≥3-meetings rule by four, and would push every section-3 stop
  well past the 3–6 minute target — splitting five stops into about twenty to
  teach nothing new. Item count, stop count and position count are all unmoved.
- **It immediately caught an error in copy we had already deleted.** The removed
  69-word tip said *"Before ུ nothing is left but the vowel — དབུ is u. Before
  other vowels a w stays behind."* The generated forms are **དབི `whi` · དབུ `u`
  · དབེ `whe` · དབོ `o`** — so ོ drops the w as well, and the tip was wrong about
  which vowels are exceptional. One vowel of coverage could not have shown that.
- **144 new recording takes** — 48 × the three undrilled vowels. Thosam:
  *"recordings are not an issue, I can do all of them once."* **They are not in
  the §13.4 declared-takes figure**, which still reads 392 and which check 57
  still passes, because a form's audio is a new field the recount does not walk.
  That is a gap in the recount, not in the data, and it needs closing before the
  recording session is scoped from that number.

## 2026-08-15 — the crossing sentence is removed

Thosam, working the UI/UX in Claude Design: the line looked wrong on the frame.
`B2` carried one of two sentences depending on `speak_ref` — "You have been
saying this. Now you can read it." for a word already in the Speak roster, "You
just read a word you were never taught." for one that is not. **Removed from the
frame and from the specification.** The exercise, its outcome and its place in
the crossing are unchanged; only the sentence goes.

- **Where it went:** `docs/03` §7's `B2` dossier (*Fails when* was "the sentence
  does not match the learner"; it is decodability now, which `validate_read`
  check 49 already tests) · `docs/08`'s **Readable** entry · `build_read.py`,
  which stopped emitting `crossing_copy` · `read_words.py`'s docstring ·
  `board_prompt.py`'s `B2 says` column · and the `crossing_copy` field on all
  **455** `words.json` records.
- **The dataset was stripped, not regenerated.** `content/read/inventory.json`
  and `build_read.py` both carried uncommitted work from another session, so a
  rebuild would have folded in changes this decision did not make. Every other
  field on all 455 records was asserted identical. `validate_read` is unmoved at
  53 passed · 4 failed · 1 board finding · 1 skipped.
- **`speak_ref` stays and now gates nothing and selects nothing.** It remains a
  resolvable link into the Speak roster. The field was never a count: the
  crossing count is a function (§10.1) and still is.
- **`claude/read-track-board-prompt.md` keeps the sentences** in its §3.4 table.
  It was handed and executed on 2026-08-06 and is the record of what was asked
  then; O21 says do not regenerate it, and that still holds.

**Consequence for D3, and it is not cosmetic.** O9 closed on option B partly
because *"`B2` recovers C's whole emotional payoff by switching its sentence on
whether the word is one the learner already says"* (2026-08-08, below). That
compensation no longer exists. Option B still stands — a read-only learner
genuinely crosses, and that was always the load-bearing half — but it stands on
that half alone. The D3 entry is left as written; it records what was decided
then, not what is true now.

**And the same slabel's distractor claim, checked and settled the same day.** It
read *"distractors are other words this learner can already read — meaning
distractors, not one-slot-apart spelling ones"*, which contradicted `docs/03` §1,
where `B2` sat in the list of families whose *stack distractors differ from the
answer in exactly one slot*. **The board was right and the doc had drifted.** All
twelve `read-a-word` records carry `distractor_rule: "other words readable by
section N"`; their options are English glosses, so the slot model cannot be
applied to them at all, and `check 27` passes precisely because it never touches
them. `build_read.py`'s own comment says the same thing in the generator. `B2`
was struck from that list in `docs/03` §1.

**A defect found while checking it: the option chips were reading `gloss[0]`.**
`gloss` is a record, not copy — twenty word records lead with a quoted utterance
or a romanization in prose italics and carry a plainer English gloss behind it.
So B2 offered `*mo*` and `"po-po la"` as answer options beside `apple` and
`forty`. `display()` now prefers a gloss needing no cleaning and only cleans the
first when every entry carries marks; internal quotation is left alone, because
`year (as in "twenty years old")` is correct English. Three option labels changed
in `exercises.json` — `grandfather`, `goodbye (said to the one who is leaving)`,
and `mo`.

**Chasing `word.rtsis` found a D9 leak, and Thosam removed three words.** Its
only gloss was `*mo*` — not an English meaning but the English of a *parked*
roster record. རྩིས was never chosen as a Read word: it was harvested as a
candidate form for `vocab.astrology.divination`, matched out of `53-Bialek` on
the key *divination*, and **D9 parked that record and withdrew the form** —
`bo: null`, "the roster's current form is withdrawn rather than kept", with the
CTA dictionary offering མོ · པྲ instead. Two others were in the same state, one
of them rejected in as many words: `vocab.postoffice.counter` says *"EXISTING
FORM REJECTED. བགྲང་གྲངས་ཆས is not a service window: it is a counting device."*

| Read word | gloss | parked record |
|---|---|---|
| རྩིས | `*mo*` | `vocab.astrology.divination` — form withdrawn |
| ཕྲུ་སྣོད | `pan` | `vocab.kitchen.pan` — reverse-index candidate, no form |
| བགྲང་གྲངས་ཆས | `the service window` | `vocab.postoffice.counter` — form rejected |

- **The cause is a hold-out that was never propagated.** D9 taught `generate.py`
  and `build_manifests.py` to read `parked-no-form.json`'s `ids`; **the Read
  chain was never told**, and `word-candidates.json` had been harvested before
  the parking. `build_read.py` and `read_words.py` both read the hold-out now.
  `read_words.py`'s existing `bo` guard would have caught these three by
  accident — D9's records happen to carry `bo: null` — and that is a property of
  D9, not a rule about parking, so the filter is by id like everywhere else.
- **Removed, not re-glossed.** Thosam: *"well then remove the three."* Setting
  `calculation` on རྩིས — correct as a translation — would have promoted a form
  the roster had discarded, under a meaning the rejected record never had. A
  word enters the Read set through a roster record with a confirmed form; if
  རྩིས is wanted, it comes in that way.
- **Words 455 → 452, `with_speak_ref` 454 → 451**, `readable_by_end_of_section`
  recomputed (6: 336→335, 7: 407→405, 8: 455→452). None was a taught item in any
  stop. `exercises.json` was **rebuilt, not patched** — a smaller pool changes
  the generator's deterministic picks, and rule 22 re-renders every view and
  byte-compares, so a hand-chosen replacement fails it by construction. The
  `docs/03` §4.3 and read-spec §9.4 training-ground tables now read 452.
- **Zero dangling `speak_ref`s remain**, and `validate_read` is back to the
  53 / 4 / 1 / 1 it stood at before any of this.

## 2026-08-09 — One romanization; the CTA dictionary admitted; the board audited

Thosam walked the screen board and raised sixteen defects. Working through them
turned up five more that nobody had raised, and one decision that had been open
without being written down anywhere: **the two tracks romanized the same
language two different ways, and the board had already drifted into drawing
both.** ཞིམ་པོ is `zhim po` on seven frames and `shiimpo` on six; ཐུགས་རྗེ་ཆེ has
three spellings across the export.

**D1 — the Trungtrung romanization ships app-wide, in a new `roman` field.**
`thl` is untouched and stays in the data; it surfaces once, on the word sheet,
as an *also written* row. What made this cheap rather than dear: the Speak
`thl` field was never authored — **1,316 of its 1,342 strings came out of a
third-party converter at `thl_confidence: "low"`**, and only the 26 anchors were
hand-written. 1,334 of 1,365 forms convert; **92% of the strings change on the
page**.
- **`scripts/content/romanize.py`** wraps `read_pronounce.py` and adds the two
  things a Speak learner needs that a Read learner does not. **Word division**:
  one or two syllables is one word (644 of 949 records, and it is what the board
  already draws — `shiimpo`), three or more are segmented by `chunks.segment()`,
  the same segmenter the phrase chunks use, so there is one answer to where a
  word ends. **Connected speech**: `sounds.json` gains a `connected` block and
  `pronounce_syllable` a `connected=` flag — tone belongs to the word, so no
  syllable after the first takes the doubled vowel, and the five that lose the
  breath under a prefix lose it after a vowel too. Thosam's datapoint is the
  whole of the table: ཕྲུ་གུ reads `thru khuu` and is said *thruku*.
- **Anchors are not exempt, by the D9 precedent** (བོད is *phöö*, "the rule wins
  over the convention"). `tashi delek` becomes `trashi delek`. If that is wrong
  it is one row in `OVERRIDES`, which today holds exactly one entry: ལགས is
  `lak` by rule and *la* in the mouth.
- **31 forms block and are reported, never guessed** — Sanskrit and European
  loans whose spelling the thirty do not describe (པདྨ, ཌ་མ་རུ, ཧྥ་རན་སི,
  ཀི་ལོ་མི་ཊར). New rule 28 warns on script without a romanization.
- 365 pronunciation notes opened by naming the form in italics and now name the
  right one; 16 more spell the old form mid-sentence and are named for a human.

**D2 — V13 keeps its five-pair board.** Thosam: *"this is like duolingo
exercises, should be familiar."* Not the shape — **the generator**. It floored
where the spec and its own comment said ceil, so 31 stops emitted no board and
**284 of the 999 words reachable by `listen-pick` appeared on none**. Ceil needs
a remainder policy because rule 16 wants exactly five distinct pairs: the last
board fills back from the district's own words. **143 boards → 272, 715 words
covered → 995, 140 stops → 168.** The missing play control is the board's to
fix.

**D3 — tibterminology.net is an accepted source; Monlam is the fallback.** The
CTA Department of Education's terminology board, 21,661 standardised terms.
Thosam: *"if it is in the standardized dictionary, then this holds as the
truth."* `scripts/content/tibterm.py` queries it and writes the overlay.
**82 records carried `bo: null`; 23 now have a form** — 18 exact headwords and
5 extracted by hand from a compound entry, each with the split reasoned in its
note. Everything it writes is `status: draft`, `spoken_confidence: low`, cited
by entry URL. **These are written coinages for registers this app does not
teach** — `གླ་འཁོར` is the standard term for *taxi* and a Lhasa speaker says
*taxi* — so the script raises the evidence and never the confidence.
- **The query direction was wrong the first time and it is worth recording.**
  The API defaults to `mode=bo-en`, so English queries ran backwards. It is also
  not lemmatised: `teapot` returns nothing, `tea pot` returns ཁོག་ལྡིར.
- **Only a match on the record's own gloss may fill `bo`.** A synonym an agent
  chose is weaker evidence, and the first run proved it: `pile / heap` reached
  *piles* and filled the card with གཞང་འབྲུམ, which is haemorrhoids; *the man at
  the press* reached *printer* and got a printing machine. Those are candidates
  now, with the search that found them named.
- **43 records are still empty and should not be cut.** They are teapot, cousin,
  scissors, kettle, candle, angry, noodles — ordinary words a terminology board
  for law and machinery was never going to index. Their emptiness is a fact
  about the dictionary, not about Lhasa.

**D4 — lightning is གློག་འཁྱུག.** Bare གློག is electricity and light, and shipping
it here put one form on three cards. The record's own note had already quoted
the source headword `glog 'khyug pa`; the CTA entry gives གློག་འཁྱུག and
གློག་དམར. **`V16`'s premise goes with it** — "one word · three cards" is now one
word, two cards, and the screen needs re-basing on a real collision.

**D5 — rule 27: a form on more than one card is warned, not failed.** One
Tibetan word carrying several English glosses is a fact about Tibetan, and V16
exists to teach it. What cannot stand is the same form on two cards of the same
district, where they can land in one stop: those are marked `[SAME DISTRICT]`
and there are eight. `light`/`electricity` — both bare གློག in the Guesthouse —
is the one the record itself calls *"two cards cannot ship with identical
`bo`"*. **Not resolved here: which of the two goes is Thosam's.**

**D6 — the literal gloss takes the case its particle marks.** Thosam, on
ང་ལ་བོད་ཇ་གང་བླུགས་རོགས་གནང: *"word by word would be more like Me - to - butter
tea - pour - please"*. English marks case on the pronoun and Tibetan on the
particle, so reading the two independently produced `I — to`, which is not
English and reads as an error. `I — to/at` is now `me — to`, and `གང` glosses
*a cupful* rather than *full*, which described the tea instead of counting it.

**D8 — v1 has no skip-ahead. K1–K3 stay drawn and stay unwired.** Thosam:
*"for the first version lets not allow the user to skip like that … we only allow
the user to progress one by one."* Stops are walked in order in both tracks.
- **What makes that acceptable rather than restrictive is his own reasoning:**
  *"from my understanding the user can access the speak and read track anyways."*
  Both tracks are open from the first launch, so a diaspora learner who already
  speaks goes straight to Read — the thing they came for — instead of having to
  get past Speak to reach it. The skip existed to solve a problem the two open
  tracks already solve.
- **The screens stay on the board**, on his instruction, as the drawn shape of a
  feature that is not built. **`K1` is the exception and it is not a small one:**
  `K1` is the live track-choice screen — `O1`'s three-card form was retired into
  it on 2026-08-05 — so parking `K1` would leave onboarding with no track choice
  at all. Claude Design caught this in the removal order, which had said to park
  all four. `K1` stays on Flows and loses only its fourth card, *I speak some
  already*; `K2`, `K2b` and `K3` are parked. `docs/06` asserts the absence in the
  onboarding end-to-end rather than leaving it to memory.
- **O10 is deferred, not closed.** It asked how a read-only learner marks the
  words they already say; with no skip there is nothing to seed, and K2b's
  missing wiring stops being a gap and becomes the accurate state. It returns
  whenever skipping does.
- **The historical board orders are not rewritten.** `screen-board-round-two.md`
  §K1–K3 and the two 08-07 orders record what was asked at the time and stay as
  they are; this entry is what supersedes them.

**D9 — the roster holds no record without a form. 56 are parked.** Thosam:
*"all of the others, just remove them completely from the app, vocabulary and so
on … maybe you can add them in a separate file so in a few years i can get back
to it, but for now it does not make sense to pollute the app."*
- **Every one was searched three times first** — the seventeen dictionaries of
  the original translation pass, the CTA standardised dictionary
  (`tibterm.py`, en-bo, compound-splitting), and Monlam Tibetan-English
  v2.0.0.209 read backwards (`monlam.py`, 88,933 headwords inverted into 91,179
  English senses). 40 of the 55 had candidates recorded; 15 had nothing anywhere.
- **Roster 1,004 → 952 vocabulary and 420 → 416 phrases, and every remaining
  record has Tibetan.** `blocked_on: "translation"` is now **0** exercises,
  down from 77. Walk split recomputed: **534 / 418**.
- **`content/parked-no-form.json` holds the whole record**, every candidate and
  every review note, plus what was searched and how to restore one. Nothing is
  deleted. `generate.py` and `build_manifests.py` both read its `ids` and hold
  them out, or a regeneration would resurrect fifty-six empty cards.
- **The absence is about the dictionaries, not the language.** Cousin, kettle,
  scissors, cupboard, noisy — a native speaker supplies these in an afternoon,
  and the parked file says so at the top so nobody reads it as a finding about
  Tibetan.
- **Forms Thosam confirmed the same day, and they are the only ones that
  landed:** `to cross` བརྒལ་བ · `to hire` གླ་བ · `job` ལས་ཀ. Provenance `thosam`,
  the only one in the file a person vouched for.
- **`job` duplicates `work`, knowingly.** Both are ལས་ཀ in District 19 and rule
  27 flags it `[SAME DISTRICT]`. Filled on his explicit confirmation; merging
  them into one card glossed *work / job* is the likely resolution and is his.
- **Two things recorded without a card to put them on.** `socket / power outlet`
  is གློག་སྒོ་ (his word) and the roster has no socket record — noted on
  `charger`, which is the card it sits beside. And `momo steamer` *"sounds like
  moksang"*, which is a sound and not an orthography: མོག་བཟང, མོག་སྲང and
  མོག་གཟངས are all consistent with it and only one, if any, is the word. Parked
  until he spells it.
- **Three screens retire with the state they drew** — `V14`, `V15` and `S10·c`,
  the "Tibetan · not found yet" family. To the parking lot, not deleted. `K1`,
  `K2`, `K2b` and `K3` go with them under D8. Both are in the 08-09 board order.

**D7 — the final ལ was queried, reverted, and reverted back. It stays silent.**
Reviewing the board order Thosam stopped on one row: *"`ngül -> nghü` is wrong,
it must be `nghül`."* The cell was flipped to `l` on that instruction and flipped
back the same day — *"my bad, i think i made a mistake"*. **Recorded because the
round trip is the useful part, not the outcome.**
- The value was never a slip. `finals["ལ"]` was set silent on **2026-08-06 in a
  deliberate second pass** citing Tournadre & Suzuki Pt 2 §9.6.6 on the Central
  section that contains Ü — *"the following final consonants B, M, NG, R are well
  preserved. THE FINAL L IS PRESERVED ONLY IN TÖ DIALECTS"* — with Sung & Lha
  Byams Rgyal §3.2.3 agreeing, and with this file's own ད+བྲ entry quoting Sung
  glossing དབྲལ as [rɛ̄ː], a long vowel with no l in it.
- **Why it reads as an error, and why that will keep happening.** The fronting
  already carries the ལ: ུ + ལ is `ü`, so `nghü` has the letter in it twice over
  and looks like it has it none. Anyone meeting `kyi` for དཀྱིལ or `tshe` for ཚལ
  will reach for the same correction. The note in `sounds.json` now says so, and
  says the homophony it creates — `ཀད`, `ཀས`, `ཀལ` all `ke` — is what Section 4's
  stop 10 teaches rather than a defect to route around.
- The 2026-08-06 note had ended *"Thosam confirms or reverts; this is a sound
  value and sound values are his."* It has now been confirmed, out loud.
- **A real defect fell out of the same review and was kept.**
  ན་འགྲིག་གི་རེད་པས་ arrives from `chunks.py` as one five-syllable chunk, and the
  joiner glued it into `nadrikkirepe`. A Tibetan word is one to three syllables;
  past that the syllables stay apart (`MAX_JOIN` in `romanize.py`). It reads
  `na drik khii re pe` now, which is the shape THL had.

### Found on the way, and not asked for

- **`vocabulary.json` is not where `bo` lives**, and a first pass wrote 23 forms
  into it directly. They would have survived exactly until the next
  `generate.py`. Rewritten to target `content/tibetan/`; `merge_tibetan.py`
  gained `bo_source` in `FIELDS` and the two CTA values in `PRIOR_SOURCES`, or
  the provenance arrived as `model`.
- **A revert deleted 119 real candidates.** `sources == ["48-TibTermProject"]`
  identified the entries the CTA pass had added — and also 119 that the original
  dictionary pass had. Rebuilt from `.dict-cache/index.json` via
  `generate.candidates_for`, and the candidate lists are deterministic and
  duplicate-free now. **The lesson is the tag, not the revert:** a provenance
  value that a second writer reuses stops identifying anything.
- **The V2 "French eu" line does not exist in the content.** The record's note
  reads *"The ས prefix and the final ས are both silent and the vowel rounds to
  ö"*, which is the rule doing its job. The board wrote its own sentence. Three
  more of Thosam's findings are the same shape — the frame inventing copy the
  data does not carry.
- `phrase.postoffice.ill-call-you-tomorrow` still said ཞལ་པར after its card was
  corrected to ཁ་པར. Fixed, with the verb flagged.
- District 1 spelled the honorific `གསུངས` where District 12 spelled it `གསུང`.
  Settled on `གསུང`, the source's own form. **The three near-duplicate "please
  speak slowly" sentences are still three** — cutting two is content, not
  correction.

## 2026-08-08 — The dri gets a card; "yak milk" does not exist

Thosam: *"if in Tibetan you say yak milk, people might look at you with weird
eyes."* English uses **yak** for the whole species; Tibetan does not. **གཡག་** is
the male, **འབྲི་** the female, and the milk — so the butter, the cheese and the
yoghurt — comes from the dri.

- **`dri` was in `ARTIFACT_CUT` and is now out.** The 2026-08-08 re-cut dropped
  it under *"animals beyond the iconic"*, alongside `mastiff`, `eagle` and
  `dzo`. That reading was wrong for this one record: **the dri is not fauna, it
  is half of a distinction English cannot make.** The `yak` card already said
  *"the female is a dri"* and *"the milk comes from the dri"* — so the cut left
  a card pointing at a card that did not exist. The other three stay cut.
- **It needed no promotion.** `dri` carries its own `[C]` in v2; the cut was
  what suppressed it. It stays in `ARTIFACT_PROMOTE` purely as a tripwire, so
  the un-cut cannot silently stop working. **135 artifact records → 112 cards**,
  and it lands in *The herd* by district with no override.
- **The distinction moved onto the visible card, not behind the fold.** On
  `butter` it was line 3 of 4 and is now line 2; on `dri` the lexical point is
  line 1; on `cheese` it moved into line 1. A fact that only appears after a tap
  on `More` is a fact most learners never see.
- **`butter`'s `en_definition` now names the dri**, which is what Thosam asked
  for: *"churned from the milk of the dri, the female yak."*
- **The two cards are deliberately not merged.** `yak` states the male and the
  work; `dri` states the female and the milk. Each is worth a card because the
  pair is the teaching.

## 2026-08-08 — The note template applied to the twelve records written after it

The Eight Auspicious Symbols, `amber`, `gyaling`, `sand-mandala` and `tea-bowl`
were added the same day, after the note rewrite below, and **every one of them
opened line 1 on a physical description** — *"A white shell, blown like a
horn."*, *"A parasol on a long handle, fringed and often silk."*, *"Two fish,
always a pair."* That is the exact defect the template exists to remove, so the
rule was landing on old records and not on new ones.

- **Reordered, not rewritten.** The writing is good and is kept intact; the
  sentences were resequenced so move 1 states what the thing means and the
  material description drops to move 3. No new claims were authored.
- **`parasol` also cost a lint failure.** Its *"marked their rank"* tripped
  `lint_prose`'s score rule, which matches the bare noun `rank`. The word is now
  *standing* — the same meaning — but **the regex is too broad and is logged in
  `09-backlog`**: the next legitimate "rank" should not have to be reworded
  around a false positive. The lint was red before this session's chain ran, not
  because of it.
- **Anything that adds an artifact must now apply the template**, or the
  collection drifts back one record at a time.

## 2026-08-08 — Every artifact note rewritten: meaning first, material last

**This reverses "the writing was never the problem"** from the entry below,
signed the same day. Thosam opened `G3 Cultural card butter`, could not find
Tibet in it, and said so. He is right, and the earlier judgment was wrong.

The card read: *"It comes from the milk of the female yak, and is sold in a
market as solid blocks wrapped in cloth or hide rather than in packets. Three of
the things this walk teaches you are built on it: the tea you are drinking now,
the dough you meet in the next district, and the lamps kept burning in the
monastery in District 8."*

- **The defect was designed in, not accidental.** `split_notes.py` was told the
  shape was already latent in the prose — *"what the thing IS, and how it is
  made"*, then *"what people DO with it"* — so it split rather than rewrote. That
  ordering **puts manufacture before meaning**, and the split faithfully
  preserved it. `G3·t`'s own `.slabel` went further and named the
  table-of-contents sentence as the card's purpose.
- **The audit measured it rather than asserting it.** Of 99 artifact notes,
  **54 carried at least one defect**: 24 opened line 1 on a recipe, a material or
  a measurement; 25 opened on a bare *It* or *They* with only a two-word gloss
  above them; 17 talked about the walk, the districts or the card itself instead
  of about Tibet; 11 had a first line too thin for the card (the shortest ran to
  33 characters); 2 addressed a reader raised on supermarket butter, when the
  primary audience is the diaspora. **45 were clean** — `dzi-bead`, `coral`,
  `turquoise`, `chuba`, `yak`, `black-tent` among them.
- **Thosam chose to rewrite all of them to one template anyway**, having seen the
  45/54 split, so that the collection reads as one voice. Recorded because it
  was a choice, not an oversight.
- **The first audit pass undercounted.** It scanned `vocabulary.json` only and
  missed `phrase.pass.victory-to-the-gods`, the one *phrase* carrying
  `artifact: true` — and it had both defects, an anaphoric first line and a
  closing clause about "the card the district is built around". Caught on the
  verification pass and rewritten. The entry below had **120** right all along;
  the audit was the thing that was wrong.
- **Two figures in the entry below are now stale.** It records *"120 artifact
  records → 98 cards, 57 illustrated"*. Recomputed 2026-08-08 the count is **97
  cards, 59 illustrated** — 120 records, less 27 sitting in four groups, plus one
  card per group. Nothing checks these numbers, which is how they drifted; the
  earlier entry stands as the record of what was decided and this is the current
  count.
- **The template is three moves**, one idea to a sentence: *what it is and what
  it means* · *where you meet it* · *the qualification — material, provenance,
  regional or modern variation, hedged*. Moves 1 and 2 are what the card shows;
  the rest sits behind the existing `More` fold. Move 1 adapts by category so the
  rule survives a palace as well as a block of butter.
- **Four artifacts had no note at all** and now have one: `hat`, `boots`,
  `carpet`, `saddle`. **99 rewritten + 4 written = 103.**
- **The butter/dri contradiction is closed.** The butter note hedged to *"the
  milk of the female yak"* while the `yak` note in the same content set teaches
  that the animal is a **dri** and that *"yak butter"* is a small English error.
  Butter now teaches the word.
- **`en_definition` was deliberately not used on the card.** Drawing it as a lead
  paragraph was considered and rejected — Thosam: *"writing definition is an
  issue because it does not generalize to locations for example."* The note is
  self-contained instead, and `en_definition` stays where it is, feeding `V2`.
- **The cross-link idea was dropped.** A *"Connects to"* row of artifact
  thumbnails — butter → butter tea → tea churn → butter lamp → tsampa — was
  proposed as the structural home for the 16 app-referential sentences and
  Thosam set it aside as not important for now. Recorded so it is not
  re-proposed as new.
- **The card got shorter; the note did not.** First line median **158 → 132**
  characters and what the card shows is a median of **275** across two lines.
  The whole note went **515 → 560** median, because displaced material moved
  behind the fold rather than being thrown away. The plan predicted 330–480 and
  was wrong about it.
- **Nothing is reviewed.** All 103 notes are freshly authored English,
  `status: draft`, and no native speaker has read any of them. This *adds* to the
  deferred review backlog rather than reducing it.

The board order is `claude/board-prompt-artifact-copy-2026-08-08.md`, which
supersedes Part 1 of the artifacts order and leaves its fold anatomy intact.
`validate.py` holds at **0 errors, 105 warnings**; `lint_prose.py` at **0
never-do violations**.

## 2026-08-08 — Eleven rulings: the open decisions worked through

Thosam asked what the open questions actually were and ruled on eleven of them
in one sitting. What follows is each ruling, what it cost, and what it changed.
Three of the rows turned out to be **already answered by the new export** (270
screens, up from 254) and open only because nobody had gone back to close them.

**D1 · O16 — fix the generator, not the rulebook.** `docs/03` §4.1 caps the
microphone at one screen a stop, near the end, and says a new item is heard
before it is tested. Neither was enforced anywhere and the generator had drifted
off both: **45 of 173 stops held four `phrase-produce` screens**, and **all 169
stops with exercises opened on `meaning-pick`**. Alternatives offered: amend
§4.1 to match the code, or cap at two. Chosen: obey §4.1.
- **Result:** every stop opens on `listen-pick` (169/169); `phrase-produce`
  328 → 82, never more than one, never a phrase's first exercise.
- **New tripwires, because prose no checker reads is a suggestion:**
  `validate.py` rule 25 (a stop must open audible) and rule 26 (one production
  screen, never first).
- **Found while fixing it, and worse:** exercise ids dropped the circuit, so
  `stop.core.c1.1` and `stop.core.c2.1` both emitted `ex.core.1.1` — **960 of
  2,998 ids collided** and 66 stops' `exercises[]` arrays resolved to the other
  walk's script. Fixed; rule 24b now fails a duplicate id.

**D2 · O13 — the fronted `a` is written `e`, not `ä`.** The dataset wrote `ä`
and the board's `C9` had been changed to `e` on 2026-08-08 — "overriding the ä
ruling" — so the two disagreed and the board disagreed with itself, still
drawing `shä` and `nhä` on four frames. Thosam chose `e` **with the cost in
front of him**: across the 727 syllables the product shows, `e` collapses 21
groups, adding 48 colliding pairs. `ཀེ` and `ཀལ` are both *ke* now; Section 4's
teaching text says "ཀལ is ke" and "ཀད is ke" to a learner who met ཀེ as *ke*.
The alternative that avoids this — full THL with `é` for a genuine final `e` —
was offered and not chosen. **Recorded in `content/read/sounds.json` itself so
nobody 'fixes' the collisions by reintroducing `ä`.**

**D3 · O9 — `readable` is option B**: every letter met and every rule taught.
The board had already converged on it and made the count a function rather than
a typed number. The Read spec recommended C (B plus the word already in the
Speak roster); B wins because a read-only learner still crosses, and because
`B2` recovers C's whole emotional payoff by switching its *sentence* on whether
the word is one the learner already says.

**D4 — the card takes the plain form; the honorific stays in the phrases.**
Thosam saw a mocked-up word card reading *head* as དབུ and asked why the app
teaches honorifics at all. Two things came out of that:
- The mockup was **wrong** — the roster teaches མགོ, colloquial, as he said.
- But **13 records really did teach the honorific as the only form**, and they
  were not an accident: §2.4 said *"where the scene implies deference, hosting
  or a first meeting, the honorific form is the card"*, written after a
  translation pass stripped a roster of its honorifics.
The ruling sharpens that rule rather than reversing it: **a card has no
referent, and honorific attaches to the referent.** So `house` གཟིམ་ཁང → ནང,
`name` མཚན → མིང, `age` དགུང་ལོ → ལོ, `stove` གསོལ་ཐབ → ཐབ, `opinion` དགོངས་ཚུལ →
བསམ་ཚུལ, `to-explain` → བཤད་པ, `handwriting` → ལག་བྲིས, `dinner` → དགོང་དག་ཁ་ལག,
`to-talk` → སྐད་ཆ་བཤད་པ. Seven of the nine plain forms were **already recorded as
attested variants** by the translation pass, with the exact question this ruling
answers. `doctor` སྨན་པ was retagged: it is the ordinary word, mislabelled from an
anchor, and the only one of the 37 sitting at `register_confidence: high`.
- **Four were NOT swapped and this is the interesting part.** `to-ask`,
  `to-greet`, `to-introduce` and `to-apply` are built on ཞུ་བ, which is
  **humble** — your own action directed at another person. There is no third
  party's honorific to remove, and the plain form is the blunt one. §2.4 was
  amended to say so.
- **The 135 honorific phrases did not move.** Honorific 37 → 27.
- **`house` diverges from what Thosam named.** He said ཁང་པ; ཁང་པ is already
  District 6's `building`, and this record's own note had ruled it out for that
  reason. ནང is used — attested, and the word inside "come to my home".

**D5 · O19 — proposal B, no register marker on the word card.** Follows from
D4: with the plain form on the card there is mostly nothing to mark, and the
phrase card's literal gloss already carries the (H) where it matters.

**D6 — the second look has no cap.** It shipped capped at four. Thosam: *"if it
is about reviewing mistakes from an exercise, we should do all of them, no
cap."* **The consequence is his and is stated rather than engineered around:** a
stop where ten things went wrong now runs well past the 3–6 minute target,
exactly when the learner is struggling. If testing says that is wrong, the fix
is splitting the stop, never truncating the round.

**D7 — the gloss ships, covering every word with an English equivalent.**
Thosam's rule: all words that have one, and no particles. That turned an open
job into a bounded one — of 1,967 chunks, **363 are copulas and 263 bare
particles, neither ever tappable**, leaving 1,341. Copulas are excluded
permanently and for the firewall's reason: glossing *red* / *yin* / *yö* /
*duk* teaches exactly the choice a beginner must never be made to make.
- **Coverage 28% → 93%** of tappable chunks (1,249 of 1,341). The remaining 92
  uses across 61 forms are context-dependent verb stems, left flagged.
- **A stem-matching pass was written, measured and thrown away.** Stripping the
  b/g/d/m/' prefix and the -s suffix reached a roster verb for 77 forms and was
  wrong on most: `blugs` (pour) → *sheep*, `gnang` (honorific do/give) →
  *house*, `dgos` (need) → *to hear*, `btsong` (sold) → *onion*. In a reading
  aid a wrong gloss is worse than none. Glosses are hand-authored in
  `content/chunk-glosses.json`, all `status: draft`.
- **Copula over-match fixed:** ངས *ngas* is ང + the ergative ས — the pronoun
  "I" as the doer — and was labelled a copula, hiding a real word 22 times.

**D8 · A3 — closed by measurement, and it was already closed.** The open
question said four Read stops were half-built because rows 5–8 have no
distractor rule. `content/read/confusables.json` (6 August) had already measured
which letters look alike, by rendering each from the shipped font and comparing
ink overlap. All 14 letters carry them; `validate_read` confirms 44/44 complete
stops and ≥3 meetings per item. **No change was needed.**

**D9 · R7 — བོད is *phöö*.** The rule wins over the convention. Every Tibetan in
the West writes *Bö*, and the app's own romanization gives *phöö*; Thosam chose
the rule, so a learner who applies it to a new word is never wrong and there is
no exception to hold.

**D10 — three stale rows closed, one waived.** O14 (the export carries the
DRAFT banner), O15 (S7 runs Tibetan → English; `docs/03` was the stale copy),
and Q7's `[PENDING]` chip (the metronome was signed 2026-08-07). **O17 waived**
— the X3 chip-tap was verified absent from the export and dropped rather than
re-ordered.

**D11 — the Eight Auspicious Symbols, as a collection of eight cards.** Thosam's
own correction, and the mechanism matters: not one grouped card. *"A single
cultural set with eight individual collectibles."* The zodiac card is a
twelve-year cycle — one idea with twelve names; each symbol carries its own
meaning and is met on its own.
- Endless knot, lotus, conch, treasure vase, victory banner, golden fish,
  parasol, dharma wheel — plus **sand mandala, tea bowl, damaru, gyaling,
  incense burner, amber**. **No mala counter**, cut by Thosam as too niche.
- **Roster 990 → 1,004 · artifacts 119 → 133 · cards 98 → 111 · collections
  9 → 10 · stops 148 → 150.** Split 550/454, still 45% second walk.
- `collections.py` derives membership from district, which would have filed all
  eight under the Monastery. It gained **one explicit override**, and the
  comment says why: this collection is a set, not a place.
- **Three supplied Tibetan forms were not shipped as given**, each with the
  question stated: `treasure-vase` གཏེར་ཆེན reads as "great treasure" and is the
  word for a treasure-revealer, so གཏེར་གྱི་བུམ་པ is used; `damaru` རྔ་ཆུང is
  "small drum", descriptive, and D8 already teaches རྔ as `drum`, so ཌ་མ་རུ is
  used; `amber` གཡའ་མེན **could not be corroborated at all** and is shipped as
  supplied, flagged, because neither candidate is evidence.

### Found on the way, and not asked for

- **`build_manifests.py` merges now — `docs/09` gap #10 is closed.** The hazard
  had been recorded since 2026-08-07 and nothing had fixed it. Reproduced
  deliberately: one run cost **10 anchors their `bo` and all 20 their `wylie`**.
  It now carries forward any field the spec does not author and reports the
  count. Restored from backup, verified back at 20/20.
- **Three `validate_read` checks had been silently skipping.** `BOARD` still
  named `Trungtrung Screen Board.dc.html`, which the 2026-08-08 six-file split
  deleted, so rules 15, 38 and 46 returned "not found" instead of running —
  and **two of them were failing on purpose** (the entry of this date below)
  and went quiet without anyone deciding they should. `extract_syllables` now
  accepts the export directory. 57 checks → 59.
- **The six Sanskrit letters were never added to the known-exceptions list**
  after they entered the track. Rule 38 flagged ཊ ཋ ཌ ཎ ཥ ཀྵ as undecomposable,
  which is *correct behaviour* — `C14` draws them as recognition-only, never
  spelled with — but unexplained. Recorded, so the refusal reads as a decision.
  Rule 38 is back to its documented state: `སྤྲེའུ` alone.

## 2026-08-08 — The collection holds artifacts; `collectible` is retired

Thosam opened the collection and found **"tashi delek"** in it — a greeting,
presented as something you discovered. The diagnosis was not one bad card:
**`collectible: true` meant "this word has a cultural note", not "this is a
cultural object."** Two ideas had been wearing one flag, which is how a
greeting, a minibus, a radish, fifteen people and six abstract qualities came
to sit in a collection of objects.

- **The test is one question**, in Thosam's words: *"there is nothing useful to
  teach a Tibetan who grew up in the West about radish."* An artifact earns its
  place if it teaches a diaspora learner something about being Tibetan they
  would otherwise miss. **In:** objects, symbols of Tibet itself, places you
  can stand in, occasions. **Out:** people, abstract qualities, ordinary
  produce, modern transport, generic geography, trade workplaces.
- **Renamed `collectible` → `artifact`, marker `[C]` → `[A]`**, field and all —
  "one name per concept". *Collectible* carried the sticker-album flavour
  `docs/01` bans. v2 and the expansion draft are history and keep saying `[C]`;
  `build_v3.py` is the translation point and `parse_spec.py` reads only `[A]`.
- **The 50 cut records keep their notes.** The writing was never the problem —
  the torma note explains that shape and colour are specified per ritual; the
  dzi note admits most beads sold in the Barkhor today are modern imitations.
  A note is editorial enrichment any word may carry; only an artifact turns one
  into a card. **120 artifact records → 98 cards, 57 illustrated.**
- **Notes became one idea per line** (`split_notes.py`). `G3` is drawn for
  ~190 characters and the notes averaged **528** — the design and the writing
  were built to different sizes and had never met. The shape was already latent
  in the prose (what it is, then what people do with it), so this splits rather
  than rewrites: **150 notes → 580 lines, first line median 165 characters.**
  First two show; the rest sits behind a fold, the pattern `docs/04` already
  sets for rule prose.
- **`content/collections.json` now exists.** Specified in §6.7 since v2 and
  generated by nothing, so validator rules 4 and 14 gated against a missing
  file and passed vacuously, while `G1` drew invented totals — two board arrays
  disagree, one summing to 85 and one to 97, and "The calendar · 19" is
  arithmetically impossible. Nine collections, membership derived from the
  district, plus **rule 4b**: an artifact is in exactly one collection.
- **No provenance labels.** Thosam reversed his own earlier suggestion to mark
  each card *distinctively Tibetan* / *Tibetan Buddhist* / *shared Himalayan*:
  *"the entire Tibetan traditions and cultures are tightly coupled to Buddhism
  — I don't think labeling brings any value and we might make mistakes."* His
  original concern is met by the collection names instead, so no single card
  makes a claim about itself. **Recorded so it is not re-litigated.**
- **Ritual objects: what a visitor actually meets.** Butter lamp, offering
  bowls, torma, dorje, bell, thangka, mala stay. Phurba, kapala, tsog
  implements and the ritual crown stay out — an object whose meaning depends on
  an empowerment cannot be honestly explained in four lines, and trying is how
  you get the mysticism `docs/01` bans.
- **A grouped card is judged as a system, not member by member.** Cutting
  `horse` as an animal had silently destroyed the zodiac card; the twelve-year
  cycle is not about horses. Zodiac and day-names are restored whole.
  **Siblings is deliberately not restored** — its insight is about grammar and
  its four members are people.

**Three bugs found and fixed on the way, all of which had been silently
mis-flagging content:**

1. **The marker was matched unbolded**, so `luck` and `boat` were artifacts
   because their `[REVIEW]` notes *discuss* whether they should be cards. A
   marker is a decision; prose about a marker is not.
2. **A run's single trailing marker was read as marking its last member**, so
   `day-names` sat at 1 of 7 and `zodiac` at 1 of 12. `generate.py`'s
   `check_groups` detected this and only ever printed.
3. **The marker leaked into learner-facing text** — the stripper covered
   `[C]`/`[REVIEW]`/`[V]` and the rename added `[A]` without it, putting
   `khata **[A]**` in the `en` field of 99 records.

- **Near-miss worth recording.** Running `generate.py` without `merge_tibetan`
  wiped `bo` from **697 vocabulary and 405 phrase records** — the whole
  translation pass. Recovered in full because the overlay in
  `content/tibetan/*.json` exists for exactly this. `CLAUDE.md`'s documented
  pipeline had omitted the step; it now names it and says why.
- **Status:** applied, `validate.py` green at 0 errors / 105 warnings,
  `build_v3.py --check` round-trip OK, doc figures clean.
  **Open and deliberately not resolved:** the `zodiac` group spans Districts 14
  and 16, so §6.5 rule 7 stays unsatisfiable — moving the four nomad animals is
  a content-placement call. D24 Departure still holds zero artifacts. The Eight
  Auspicious Symbols, tea bowl, damaru, gyaling, incense burner, mala counter
  and amber are **not yet added** — they move the roster counts and need their
  own pass.

## 2026-08-08 — Three Speak exercises generated; the stop gains an ending

Closes **O2** and **O18**, and amends four standing rules. Prompted by a
review of Duolingo's exercise set; the ideas that survived were the ones
`docs/03` had already specified on 2026-08-04 and never built.

- **`chunks[]`, not tsheg-split chips (O2).** The tsheg separates syllables,
  and syllable chips averaged **6.7 a phrase**, with **133 of 416 phrases**
  producing 8–15 — unusable at 390px, and it drills spelling rhythm rather
  than word order. Boundaries come from longest match against the roster then
  the Steinert forms (**91% of syllables, 242 phrases with no residue**);
  glosses come only from the roster, never the dictionary — the copyright rule
  in §6.1. `scripts/content/chunks.py`, spec §6.4a.
  - *Corrected on the way:* `en_literal` was assumed to be a word-level gloss
    and is not — it is etymological (ཐུགས་རྗེ་ཆེ is one word in three
    segments), and `thl` is syllable-by-syllable in 383 of 416 records.
    Neither could seed this.
- **Generated (O18).** 172 `phrase-arrange`, 187 `phrase-cloze`, 142
  `pair-match`. Spec §6.6 goes from five types to eight — via
  `build_v3.py`'s new `patch_exercise_types`, since v3 is rebuilt from v2 and
  byte-compared, so a hand edit breaks `--check`.
- **A copula may be a chip; a copula may never be a wrong answer.** The one
  amendment that touches the firewall, so it is stated exactly. **295 of the 403 chunked
  phrases carry a copula**, so excluding them left 47 phrases and no exercise.
  Thosam's ruling: the chips are selectable, including copulas. What protects
  the firewall is the clause that always did — *no exercise ever offers a
  choice between grammatical forms* — which now reduces to: a decoy is never a
  copula, and a blank is never a copula. **`validate.py` rule 16b** enforces
  both and was tested to fail on a corrupted record. The copula ban as a
  *vocabulary* rule is untouched.
  - *Alternatives considered:* pre-placing the copula un-draggable (173
    phrases, rejected by Thosam); copula-free phrases only (47, rejected as
    too few); dropping E8 for E9 alone (rejected).
- **Decoy chips, amending "no decoy chips".** Two, from another phrase in the
  same district, differing in meaning. Without them the exercise is a
  reordering puzzle rather than a check.
- **A revealed answer is retried, once, in the second look** — amending the
  2026-08-04 rule that forbade it outright. New §4.4: a capped round of 4 at
  position 5, the same exercise, badged, never a gate. **The same sentence
  lives in the design system's `guidelines/exercise-machine.md` and must move
  with it.**
  - *Alternative considered:* re-meeting the item in a different family, which
    would have left the rule untouched. Rejected by Thosam — if the point is
    to leave having done the thing, it has to be the thing.
- **The stop ends in three beats** (§4.5): S12 the moment → S8 the recap →
  G4/G3 the cards. **Confetti is narrowed rather than banned** — S12 only, not
  drills, exams or reviews. The collectible moves out of position 2c, where it
  interrupted teach-and-check, to the end where it rewards finishing.
  **97 of 173 stops hold a collectible and 76 hold none**, so S8 is a real
  ending too, and one stop holds as many as five, so the cards page.
- **The exclamation-mark rule is untouched.** S12's copy carries none; the
  product's one remains S9's.
- **Every exercise gains a dossier** (§7): outcome, prompt, answer,
  distractors, audio-free substitution, and the condition under which it stops
  testing anything. §1 gains `Track` and `Mode` columns, both previously only
  inferred from the screen prefix.
- **Status:** content and docs applied, validator green at 0 errors / 103
  warnings under `.venv/bin/python`. **`claude/board-prompt-exercises-2026-08-08.md`
  was handed to Claude Design on 2026-08-08 and is being executed**, alongside
  the 08-07 consolidated order and the Read-script order — all three are out.
  The `AnswerBand` extraction is proposed, not done: Part 0 asks Claude Design
  to make it a component or to name the gap in writing.

## 2026-08-08 — Sanskrit letters come into the Read track

Reverses the 2026-08-05 scope decision. The six letters outside the thirty —
ཊ ཋ ཌ ཎ ཥ and the conjunct ཀྵ — are taught in Read Section 10,
**recognition-only**: known on sight, never spelled with, never a chip in a
tray, and no sound value taught (§2.3's rules do not reach them and inventing
one would be inventing phonology).

- **Why now.** The track was already carrying the letter while declining to
  teach it: `མ་ཎི་རྡོ་` is a collectible the board draws as *found*, and its ཎ
  was one of exactly three entries in `read-known-exceptions.json`. The
  audience explicitly includes students of Buddhism, and a mantra is the most
  likely Tibetan text a diaspora learner meets.
- **What it costs.** 6 items, **0 recording takes**. `decodable: false` stops
  being blanket — `words.json` already carries `readable_from_section`, so a
  word holding one of the six becomes readable from Section 10. The mechanism
  existed; nothing new was invented for it.
- **O9 is untouched.** The readable-count function gains a later cohort; its
  shape does not change.
- **What stays deferred.** The Sanskrit vowel signs, the wider conjunct set
  and pecha layout — `docs/09`'s promised unit, narrowed rather than retired.
- **Alternatives considered:** a reference sheet only, keeping the letters out
  of the walk (rejected by Thosam — the section is the point); leaving it in
  the backlog (rejected for the same reason).
- **Status:** applied. Spec §2.5, §3.5, §7.2b; `content/read/inventory.json`
  gains a `sanskrit` block; generated in `content/json/read/sanskrit.json`.

## 2026-08-08 — Read gains Section 10, *Reading real text*; the final test becomes 11

Punctuation and the six Sanskrit letters go in together as one section,
immediately before the final test. Three stops: **the page** (tsheg, shad,
nyis-shad, and *no spaces between words*), **letters outside the thirty**, and
**read something real**, which moves down from the old Section 10 where it sat
beside an exam with nothing to consume it.

- **Why here and not early.** The rules only do work once the learner reads
  running text; taught at Section 3 they would sit idle for seven sections.
  Tsheg is visually self-evident — nobody mis-groups `ཀ་བ` — so nothing is
  blocked by the wait. A single TIP in Section 2, at the first two-syllable
  word, names the mark where it is first seen.
- **Closes open question 6** — "a section with nothing in it but an exam is not
  a section". Section 11 keeps a consolidation stop and now has a substantial
  section in front of it. §5's table had printed `0 + final` while `stops.json`
  already held two; that answer had never been written back.
- **Counts move:** 42 → **44** stops, 44 → **46** nodes, 938 → **974**
  positions, 515 → **533** exercises. Items 404 → **413** (the 9 new ones are
  counted on their own rows: 6 Sanskrit letters, 3 taught marks). Recording
  takes are **unchanged at 392** — a mark is silent.
- **It surfaced a real gap in the exercise catalogue.** Every tap-select
  dedups its options *on their sound*, and both new stops teach things that
  have none. A new kind, **`spot-it`**, prompts with what a mark does or the
  letter a Sanskrit letter mirrors, and draws glyph options. §8's
  heard-before-tested clause is vacuous for items with no take, as it already
  was for `word` items — widened deliberately, not for convenience.
- **Alternatives considered:** Section 3, right after the thirty letters
  (rejected by Thosam — the rules would lie dormant, and it renumbers eight
  sections); a rule-only node inside Section 2 (rejected — it is a section's
  worth of material).
- **Status:** applied and generated. **44 of 44 stops complete**,
  `validate_read.py` 55 passed / 2 failed, both failures pre-existing and
  documented (below).

## 2026-08-08 — The root-letter cue ladder is normative

Read spec **§4.6**: six cues, checked in order, stop at the first that fits.
The first time the product says *how* to find a མིང་གཞི — `C8` had defined the
root (*"the letter everything else hangs off"*) and 36 exercises drilled it,
while nothing anywhere taught the procedure.

- **Measured, not asserted.** `scripts/audit/root_cues.py` → `reports/root-cues.md`:
  **439/439** on the 455-word vocabulary and **252/252** on the board corpus.
  It exits non-zero if any rung mispredicts on a syllable anyone reads, and the
  rung wording lives in that script so the spec and the board order quote one
  source rather than drifting apart.
- **Two boundaries ship with it, or it is dishonest.** Rung 6 ("two bare
  letters → the first") holds for every word and fails on all 48 of Section 3's
  prefix pairs, which are demonstrations rather than syllables — so the
  teaching wording says *"in a word"*. And six spellings genuinely go two ways
  — གས དག དམ བག བད མན — which the learner is told rather than left to discover.
- **It corrects the reference app that prompted it**, which fires its
  three-letter exception on a second letter of ག ད བ འ where §4.3's
  Thosam-confirmed set is ག ང བ མ, and ships the rule with no worked example.
- **Status:** applied. Spec §4.6; `R-ROOT` restated as the ladder in §5.1;
  §9.0 requires every exercise to carry the `reason` its band shows, and every
  find-the-root exercise the `cue` that settles it.

## 2026-08-08 — Two validator failures left red on purpose

An uncommitted board re-export (702 insertions, present before the session
began) grew the corpus 252 → **259 distinct / 1,538 tokens**. §11.1's constant
is updated because that is the tripwire's documented procedure, **not** because
the export was reviewed. Two sibling checks went red with it and were **not**
patched, because each needs a content decision rather than a validator change:

- **Rule 38** — `སྤྲེའུ` does not decompose.
- **Rule 46** — the export dropped `བདུན`, `གཉིས` and `མདོང`, which three worked
  stops still cite as their material.

**Status:** open, and **the checks stopped running between 08-08 and 08-08**.
The six-file board split deleted the file `validate_read.BOARD` named, so rules
15, 38 and 46 skipped rather than failed — a tripwire that goes quiet is worse
than one that is red. Restored the same day; both are red again as intended.
`validate_read` now runs 59 checks: 53 pass, 4 fail (38 and 46 as recorded here,
plus O20's corpus recount and O21's stale-prompt gate), 1 board finding,
1 skipped.

## 2026-08-07 — The twelve rule-19d words promoted; the walk split moves to 545/445 (45%)

Twelve circuit-2 words — `very`, `kindness`, `marriage`, `birth-year`,
`salary`, `planet`, `cold-room`, `worried`, `opinion`, `finger`, `also`,
`year-of-age` — promoted to circuit-1, resolving the 21 phrases the amended
rule 19d had left decision-pending (entry below).

- **All twelve promoted; every one of the 21 blocked circuit-1 phrases stays
  on the first walk.** Thosam's call, taken after weighing an external
  linguistic analysis; that analysis's lexeme questions became [REVIEW]
  annotations (`very`/ཧ་ཅང, `birth-year`/སྐྱེས་ལོ) rather than blockers.
- **`opinion` consciously loses its "model second-walk abstraction" role.**
  Weighed and accepted, not overlooked.
- **Alternatives considered:** a carried-card mechanism for the seven `very`
  phrases (rejected — learner-invisible, new machinery); demoting the blocked
  phrases to circuit-2 (rejected — pulls decided first-walk content).
- **Gate: new rule 19b freezes the split** — the spec's Section 5 sets,
  `content/vocabulary.json` and stop placement must agree record for record.
- **Status:** applied. The split is 545/445 (45%), against the 46% the v3
  entry recorded. `validate.py` is green for the first time — 0 errors; the
  104 draft-warnings are the native-review backlog, not defects.

## 2026-08-07 — The metronome is signed

The training ground's metronome (read spec §9.4) enters the product, under
five conditions. If any one of them is dropped, the exception lapses and the
feature goes with it:

1. **Off by default.** The learner turns it on; it is never on when they
   arrive.
2. **The learner sets the tempo**, and can change it during the drill.
3. **At the set tempo the pile advances to the next card — the next
   syllable — automatically.** Advancing is pacing, never scoring. (Thosam's
   clarification; it supersedes the drafted "the card never advances itself".)
4. **Nothing is scored, compared, or lost by stopping.** No run length, no
   personal best, no accuracy, no streak.
5. **A pacing instrument, never a timer.** The way a musician's is — pointed
   at oneself, never a clock the app imposes on an answer.

- **This amends the never-do list** — `docs/01` edited the same date, the
  only sanctioned edit to that list to date. Origin: Thosam learned to read
  by drilling syllables against a metronome, and the walk is deliberately
  not built for the volume that reflex needs.
- **Alternative considered:** leaving `docs/01` absolute and dropping the
  feature — defensible, and rejected by the person the list belongs to.
- **Status:** signed. Closes read-track open question A20; Q7's [PENDING]
  chip clears on the next board round.

## 2026-08-07 — Rule 19d amended: recognition-only verb cards exempt

- **Completes the 2026-08-06 verb-card decision**, which created the
  contradiction: rule 7 requires a verb's carrier phrase to precede its
  recognition-only card, while 19d forbade a circuit-1 phrase containing the
  circuit-2 card's word. Amended in `build_v3.py` (the spec is generated,
  never edited) and mirrored in `validate.py`.
- **Exception text, verbatim:** *"a word whose record is a recognition-only
  verb card (`card_kind: "verb"`, `recognition_only: true`). Such a card is
  never produced by the learner, and its carrier phrase legitimately precedes
  it — rule 7's teaching order requires the phrase to come first."*
- **59 of 80 errors cleared;** six carrier appends made via spec bullets
  (durable across regeneration; one id corrected to `vocab.core.to-greet`, a
  cross-district carrier). The remaining 21 became the same-day promotion
  decision (entry above).
- **The workshop pair (`can-you-fix-this` vs `to-fix`) stays [REVIEW]** — it
  uses a different honorific light verb; deliberately not appended.
- **Alternatives considered:** demoting the ~50 carrier phrases to circuit-2
  (rejected — breaks the decided first walk and stop composition).
- **Status:** applied; counts unchanged, 990/420/148.

## 2026-08-07 — Check-mode hygiene: checkers no longer write

- **`build_v3.py --check` no longer rewrites** the spec and `parsed-v3.json`
  before comparing; it builds in memory, byte-compares, and round-trips in a
  tempdir.
- **`validate.py` no longer writes** `reports/register-audit.csv` on every
  run; the CSV is opt-in via `--audit PATH`.
- **Proven by `scripts/audit/check_readonly.py`**, which failed on the old
  behaviour and passes now.
- **Reason:** a validator that writes can never be a clean gate.
- **Status:** applied.

## 2026-08-06 — Trungtrung romanization adopted (recorded 2026-08-07)

- **Decided by Thosam 2026-08-06**, and recorded here a day late — until now
  it lived only inside `read-track-spec-v1.md` §2.2a. A decision this size
  belongs in this log.
- **Two devices, each marking only the unexpected case:** a **doubled
  vowel** marks low where the spelling would read high (`ག` khaa against `ཁ`
  kha); an **inserted h** marks high where the letter is normally low — the
  four nasals under a prefix or superscript (`རྔ` ngha against `ང` nga).
- **Machine form `content/read/sounds.json`**, applied by
  `read_pronounce.py`; `build_read.py` derives every `letter_name` from it.
- **Status:** closes the *convention* half of O12; the native-speaker
  confirmation half stays open, and the O12 row above tracks it.

## 2026-08-06/07 — Read spec written; both board orders executed; the board grew 167 → 235 (recorded 2026-08-07)

Recorded 2026-08-07 — the work spans two days and several sessions.

- **`claude/read-track-spec-v1.md` written** (inventory sets confirmed by
  Thosam 2026-08-05; spec completed 2026-08-06), with
  `content/read/inventory.json`, `scripts/tibetan.py` and
  `scripts/validate_read.py`; Read content generated and validated
  (`content/read/`, `content/json/read/`). **O7 closes**; its §15 residue
  lives in `claude/read-track-open-questions.md`.
- **The Read track has one place, the Printing House**, ten track-scoped
  sections, and 42 stops + 2 exams = 44 map nodes.
- **Both board orders executed:** the 08-06 Read order (+41 frames,
  including the Stop 3.1 worked stop) and the 08-07 Speak order (+29,
  including Stop 1.1, the S10 family and the S4 variants); re-export
  2026-08-07 16:40. The board grew **167 → 235 frames**.
- **Status:** done. Updates `docs/09` gaps #1/#2/#3/#7 as per
  `reports/audit-2026-08-07.md` §A.3.

## 2026-08-06 — Content spec v3: expansion approved, verbs admitted, walks rebalanced

`claude/speak-track-spec-v3.md` supersedes v2 and `curriculum-expansion-draft.md`.
Built by `scripts/content/build_v3.py` as a transform of v2, so every scene
description and cultural note in Section 5 passes through untouched; only the
machine-checkable parts move, and every count in it is counted from the bullets
rather than typed. `--check` re-parses the result and asserts the roster table,
the per-district `Counts:` lines and the bullets all agree. They do.

| | v2 | v3 |
|---|---|---|
| vocabulary | 586 | 990 |
| phrases | 285 | 420 |
| stops | 138 | 148 |
| second walk | 189 (32%) | 457 (46%) |
| words per stop | 4.25 | 6.69 |
| phrases per stop | 2.07 | 2.84 |

- **The expansion draft is settled.** Its 355 proposals resolved to
  **284 keep · 61 cut · 8 move · 2 rename**.
  Thosam delegated the calls; the per-item record with reasons is
  `content/decisions.json`, and the editorial reasoning behind it is
  `reports/districts-*.md`. The draft is history and should not be cited as live.
- **Verbs enter as recognition-only cards.** 110 cards and
  122 carrier phrases. Each card is marked **[V]**, is
  recognition-only, and names at least one phrase that already taught the verb
  whole. §7.2 rule 7 is amended to permit exactly that and a new rule 7b
  requires `pos` to be derived rather than stamped. **The copula ban did not
  move**: 16 lemmas (`be`, `have`, `can`, `will`, `might`, `would`, `must`,
  `should`, `may`, `could`, `do`, `get`, `let`, `need`, `have to`, `used to`)
  were excluded by rule before any judgement was applied.
- **Walk split rebalanced.** The draft as written would have put 55% of
  vocabulary on the second walk and quietly killed "ship circuit 1 across all
  24 districts first" as a release plan. Every approved addition and every verb
  card had its walk decided on the scene. Result 46%, against v2's 32%.
- **Politically loaded items cut.** `chinese-person` and `checkpoint` removed;
  `yuan` renamed `gormo`, the colloquial Tibetan word the draft itself noted.
  Thosam's explicit instruction. The audience is largely the Tibetan diaspora
  and this app teaches courtesy, scenes and script.
- **Alternatives considered:** keeping all 355 (fails the density and walk
  contracts); carrying all 251 uncovered verbs (needs 3.4+ phrases per stop,
  spends rule 3's hard cap); leaving verbs out entirely (leaves 35 A1 verbs with
  no exposure anywhere).
- **Status:** done. Nothing is `status: reviewed`; `reviewed_by` is written
  nowhere. The Tibetan is draft and awaits a native speaker — deferred by
  decision until the app reaches testing, not forgotten.

## 2026-08-06 — Four defects found by checking rather than reading

- **`lung` had the anatomical lung as its Tibetan.** §8.4 seeds its anchor list
  with "*lung / tripa / béken*" as one slash-joined group and the transcription
  into `build_manifests.py` dropped all three. With no anchor, `lung` fell
  through to the dictionary, matched the English word, and the **wind humour was
  given གློ་བ**. Found by `scripts/content/consistency.py`, which is the
  argument for keeping every dictionary candidate on the record rather than only
  the chosen form.
- **Rule 7 could not fail.** Every record carried `pos: "noun"`, so the rule
  banning `verb`/`copula`/`auxiliary` was satisfied by data that tested nothing.
  `pos` is now derived per record from the wordlist tag, the spec's own italic
  sub-headings and an explicit table.
- **Two records shared one Tibetan form.** `pack`/`to-pack` both resolved to
  དམ་སྡུད and `door`/`gate` both to སྒོ. Rule 17 tests the `bo`+`en` pair, so it
  passes both. One form on two cards is an unresolved ambiguity, not a result:
  the later record is now nulled and the form kept as a candidate.
- **`letter-alphabet` was defined after it was reused.** Created at D12 on the
  second walk, reused at D23 on the first — §2.9 rule 3 inverted. Fixed in v3.

**Status:** all fixed, each with a check that would catch a recurrence.

## 2026-08-05 — Repo baselined; board re-audited against the export

- **Documentation repo adopted** at `trungtrung-community/design-system`
  (was: no version control). Baseline commit sits on top of the existing
  README; `.gitignore` excludes `.DS_Store` and board export zips. Root
  `CLAUDE.md` written as the per-session working context.
- **Board changes go by prompt; design-system changes go by tool.** Verified:
  `DesignSync` reaches only design-system projects — the screen board project
  is not addressable, so a board delta must be pasted into Claude Design by
  hand. The `Trungtrung app - all screens/` export is read-only locally; the
  next export discards local edits. `docs/README.md` corrected accordingly.
- **Board counted: 167 frames** (160 screens + 7 component specimens), 46 DS
  components. `02-product-spec` said ≈174 frames / 44 components — corrected.
- **Round three is mostly executed** — all 11 removals landed, 7 of 8 new
  screens landed. Outstanding: RB8, and the answered-state sweep at 4 frames
  of ~10. `09-backlog` #2 rewritten from "pending" to that.
- **L4/L5/L6 are provably wrong, and no longer fully blocked on the Read
  spec.** Seven rows forbid stacks the board draws elsewhere — `བཀྲ་ཤིས་བདེ་ལེགས།`
  (C5 **and O3**), `དར་ལྕོག་` (four screens), `ལྷ་ཁང་`, `ནས་`, and `ཟླ་བ`,
  which C4 explicitly teaches as the exception L6 says cannot exist. Delta
  §7.5 split into **7.5a** (correctable now, no reviewer) and **7.5b** (the
  over-inclusions, still [REVIEW] pending the spec).
- **Decision log reordered to newest-first**, which its own header claimed
  and the file did not do. No entry text changed.

## 2026-08-05 — Workflow

- **Documentation-first workflow adopted**: this living-doc set replaces
  round-based reports; project docs now, moved into the repo at coding
  start. Design sync goes through Cowork↔Claude Design directly instead of
  manual export/paste.
- **Stack basis**: Expo RN + TypeScript strict, expo-router, zustand + MMKV,
  nativewind, jest/Maestro — carried over from Thosam's shipped Expo app;
  v1 has no backend.
## 2026-08-05 — Audience refined

- **Primary audience: the Tibetan diaspora** (people living outside Tibet).
  Secondary: curious foreigners drawn to the language and culture, learners
  who want the challenge of a new foreign language, and students of
  Buddhism. Supersedes round two's "traveller / diaspora / student" framing;
  the traveller *scenario* stays as the content's narrative device
  (districts as places), but it is not the target user.

## 2026-08-05 — Test runners

- **Vitest** for unit, integration, and component tests (replacing jest /
  jest-expo from the reference setup). Fallback noted in 06-testing: if RN
  component transforms fight Vitest, jest-expo may return for that one
  layer.
- **Playwright** for end-to-end, driving the Expo **web build** — Playwright
  cannot drive a native iOS/Android app, so a thin **Maestro** native smoke
  pass covers audio, microphone, haptics, notifications, and background
  playback only.

## 2026-08-05 — The stop script (defaults, pending Thosam's review)

- **The lesson stop's minute-by-minute script is now defined** — 03 §4.1:
  warm-up reprises → outcome-first S4 → teach-and-check batches of 2–3
  words → phrase blocks → mixed tail → S8. Key defaults to confirm or
  override: batch size 2–3 · every item met ≥3× per stop · listen-pick
  always first (heard before tested) · ≤2 record-compare per stop, never
  first · phrase-produce at most once, near the end · progress bar counts
  script positions and only moves forward · 3–6 min length target.
- Exposed board gaps (backlog #3): the **word card** screen is missing;
  S4 outcome copy + resume + second-walk variants undrawn.
- Standing lens, added to README: every surface is judged by the outcome
  it leads the learner to.

## 2026-08-05 — Walk model, roster size, dictionary, illustrations

- **The second walk adds NEW stops.** A stop belongs to exactly one walk
  and is never replayed. Resolves the board's internal contradiction
  (S4-c2's "same stop, second time round" vs the Monastery's new-stop
  model); the spec's per-walk stop generation stands. S4-c2, S3, D1, J2,
  CS6 get redrawn accordingly (see the 2026-08-05 design delta).
- **Roster grows from 586 to ~1,000 words.** Thosam's call: ~1k words is
  the credibility threshold — and it fixes the density tension (≈7 words
  per stop, matching the spec's 6–10 promise). Additions skew ≥70% to the
  second walk; agent-drafted, reviewed by Thosam before merging as content
  spec v3. Recording load rises to roughly 1,700–1,900 takes.
- **The app gets an internal dictionary** — an all-words browse/search
  surface extending Y4; V1 becomes its per-district slice.
- **Collectible illustrations are AI-generated**, from a master prompt
  template (Thosam's proven butter-lamp prompt) — see
  `docs/10-illustrations.md`. The board's empty illustration slots are
  placeholders until the asset pass runs; religious subjects carry a
  respect/review rule.

## 2026-08-05 — Full-board audit → Design Delta v2; curriculum draft delivered

- **Six-flow UX audit of the whole board** (~170 frames; onboarding, lesson
  loop/exams, browse & drill, Read/crossing, retention, system/trust)
  found ~60 issues beyond round three. Rewritten as
  `claude/design-delta-2026-08-05.md` v2, per-screen Outcome/Should-contain.
- Structural calls taken in the delta (overridable on review): **D1 is the
  only district surface, S3 retires** (enforces the completion brief's own
  ruling); **O1+K1 merge** into one four-card track choice; first-run
  sequence fixed as **S1→O1→O2→O3→O4→S2/R1** with a track branch;
  **Q4+T2 merge** into one nothing-due screen; **O5** gets display rules
  and a review-first option; **P2 rebuilt** to reach backup/reminders/
  audio-free/data.
- **Curriculum expansion draft delivered at 941 words** (+355; 48 dups
  reconciled out), 325 phrases, 168 stops, ~135 collectible cards,
  ~1,591 recordings — `claude/curriculum-expansion-draft.md`, pending
  Thosam's district-by-district review before merging as content spec v3.

## 2026-08-04 — Round three

- **Everything ships inside the app (~200–300 MB); no in-app downloads, ever.**
  Fully offline from first launch; worst first-run becomes impossible.
  Removed 11 screens (P3, P6, Y3, V1-offline, Z1, Z1-b, Z2, Z3, Z5, Z6, M4).
- **Voice recordings are ephemeral** — exist only for the compare. M4 dead;
  M1/P2 reworded. Alternative (kept recordings) rejected: privacy + storage.
- **Three new Speak exercises** — E8 phrase-arrange, E9 phrase-cloze, V13
  pair-match — all anchored to heard audio; firewall line written into 03.
- **Wrong answer rule: reveal → continue → re-queue once.** No retry of a
  shown answer.
- **Answered states: one specimen per family (~10 frames)**, siblings inherit.
- **"Circuit" → "walk" in all learner-facing copy** (collision with Section 3
  "The Circuit").
- **Monetisation: free, with a support option, after the beta.** No locked
  content ever.
- **Streak chip on P1: keep the count, drop the flame.**
- **Single-target exercises commit on tap** — Check buttons removed from
  RB6/RB7/RB9.
- **Exam gates open on completion, not score.** No pass mark anywhere.

## 2026-08-04 — Round two

- **Read reaches parity with Speak** (RB1–RB16, B1–B4).
- **Local-only progress with a real backup** (U1–U4); S1 stays login-free.
  Alternative (optional account, 4–5 screens) deferred indefinitely.
- **The streak cannot break** — `days walking`, cumulative, ever. Rejected:
  conventional streak (needs break state + freeze economy + panic
  notifications — all three fight the brand); no streak (loses motivation).
- **Audience: all three** — traveller, diaspora, student. Skip-ahead K1–K3
  designed for the diaspora learner. Self-description, never a placement test.
- **`Just listen` is a real feature** — section-level, background playback.
- **Read may compose syllables (RB12)** — spelling is not the firewall;
  sentences are.
- **Notification register defined (N1)** — companion voice, silent after 60
  idle days.

## 2026-08-04 — Content spec v2

- **Two circuits/walks**: 397 + 189 vocabulary; groups never split; a
  phrase's vocabulary outranks the phrase; concreteness beats CEFR.
- **District order follows the story** — Monastery/Kora/Family Home moved to
  8–10; cultural payoff never more than one district away.
- **Word-class rule**: no verbs, no copulas as vocabulary — the
  evidentiality firewall's foundation.
- **Colloquial Lhasa target**; Steinert dictionary as lookup aid only
  (never vendored); Tournadre & Sangda Dorje as register tiebreaker.
- **Authoring in spreadsheets, build to JSON**; wylie always generated;
  nothing ships as `draft`; the agent never sets `reviewed`.
- **Men-Tsee-Khang**: districts 15+16 are one building, two doors, one node.
- **MVP = Sections 1–2.**

## 2026-08 — Foundational (design system & brand)

- Palette: ground `#EDF2F3`, ink `#12222A`, one teal `#1F8A90` ("High
  Plateau", internal name only). Fill-based, borderless; no `1px solid`.
- Gabarito / Plus Jakarta Sans / Noto Sans Tibetan; Tibetan leading 2.1.
- Four tabs: Journey · Practice · Collection · You; Speak/Read is a switch
  inside Journey, not tabs.
- The board is one page; components are promoted (jsx + specimen + manifest)
  or they don't exist.

