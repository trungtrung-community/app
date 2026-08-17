# Trungtrung — Testing strategy

*Status: strategy now, suites when coding starts. The principle is BDD: the
rules already written in 03-exercise-system and the content spec §7 ARE the
test cases — tests state behaviors, not implementations.*

*Runners: **Vitest** for unit, integration, and component tests (fast,
native TS/ESM, jest-compatible API). **Playwright** for end-to-end, driving
the Expo **web build** (`react-native-web` is in the stack) — that covers
every flow, screen, and rule in the browser, locally and in CI. Playwright
cannot drive a native iOS/Android app, so a thin **Maestro** pass remains
for the native-only concerns: real audio playback, microphone permission,
haptics, notifications, background/lock-screen transport.*

## The five layers

### 1. Content validation (already specified, build first)
`scripts/validate.py` implements the machine-checkable subset of content-spec
§7's 38 rules (schema, word-class, referential integrity, reuse, circuits,
review gates, audio, coverage — register correctness is deliberately absent;
it stays human) and exits non-zero. Runs after every district, and in CI.
**A district that does not validate is not content.** This layer exists
before the app does.

### 2. Engine unit & integration tests (pure TS, Vitest)
The exercise machine and progression model, straight from 03:

```gherkin
Given a single-target exercise
When the learner taps an option
Then the answer commits with no Check button

Given a committed wrong answer
Then the item re-enters the queue 3–5 positions later, exactly once
And the revealed answer is never offered for retry

Given an item missed twice in one session
Then it appears in the summary's "worth another look" and is not re-queued

Given an item answered correctly in two sessions on two different days
Then its state is "known"

Given a known item at interval 7 that is missed
Then its interval steps back to 3, never to zero

Given a completed exam with any number of misses
Then the gate opens (completion, not score)

Given a backup file older than the device state
When restoring
Then both states are shown and nothing is restored silently
```

Same treatment for: circuit gating (a first-walk phrase never contains a
second-walk word, with one exemption: a recognition-only verb card, which the
learner never produces and whose carrier phrase legitimately precedes it —
mirrors validator 19d as amended 2026-08-07; the 12 words that remained were
promoted to the first walk, 0 errors), set-of-one drills skipping the
picker, days-walking accumulation, **E8 chunk ordering with its two decoys**
(corrected 2026-08-16 — this said "E8 tsheg-splitting", which O2 retired on
2026-08-08 in favour of authored `chunks[]`; testing the tsheg split would have
defended the behaviour the decision removed), distractor selection (same
district, same-row glyphs for RB6).

### 3. Component tests (Vitest + React Native Testing Library)
Every DS component's states, matching its `.card.html` specimen: WordRow
(register marker, thl_note, Wylie line), RatingButtons (exactly two),
ModeCard (disabled-with-a-reason, absent-because), AnswerChoice states,
FlashCard reduced-motion fallback, TibetanText contract (leading, tsheg
breaking, **`roman` aria-label** — the a11y contract from A6; this said THL
until 2026-08-16, which would have written the retired romanization into a test
and made the wrong behaviour the one CI defended).
**Caveat:** 28 of the 51 manifest components ship no `.card.html` in the export
— `AnswerChoice` among them — so "matching its specimen" is unachievable for
those until the DS exports their source.
Note: RN components need transform setup under Vitest
(`vitest-react-native` or equivalent); if that fights us, `jest-expo` stays
the fallback for this layer only — the engine and content tests are plain TS
and stay on Vitest regardless.

### 4. Design adherence (static, CI)
The oxlint contract: no raw hex, no `1px solid`, no non-token shadows, no
raw Tibetan outside TibetanText. **Three gaps found 2026-08-16:** every rule in
`_adherence.oxlintrc.json` is severity `"warn"`, so nothing can fail it; it
still declares the deleted `CollectibleCard`; and it has **no selector for raw
`lang="bo"` or hand-set `font-tibetan`**, which is why `SyllableChip` bypasses
`TibetanText` on 236 glyphs undetected. Add that selector — it is the one this
section most needs.

Plus a copy lint worth building: no emoji, ≤1 exclamation mark, forbidden words
("locked", "failed", "streak lost"). **Not** a blanket "%" ban — the percentage
clause left the never-do list on 2026-08-16. Scope it instead: no "%" outside
the final test, which is the only surface allowed one.

### 5. End-to-end (Playwright on the Expo web build; run locally and in CI)
One flow per session loop:
- Onboarding: S1→K1→O2→O3→O4→S2/R1 (K1 is the track choice — **three** cards,
  branch by track; the sequence decided 2026-08-05, O1 retired into it).
  **Assert no skip-ahead is reachable**: K1 must offer no fourth *I speak some
  already* card, and K2/K2b/K3 are parked (07, 2026-08-09), so a v1 build must
  have no route to them.
- Lesson stop: enter from D1, answer right + wrong, leave via `x`/P4,
  resume with place kept
- Chosen drill: V3 → flashcards with undo → V10 → returns to entry point
- Review: Q1 → Q2 mixed → Q3
- Exam: X1 decline with dignity; X2 exit; complete → gate opens
- The crossing: B1 fires when read-coverage meets a known word
- Backup: export → wipe → restore shows summary

Native smoke pass (Maestro, run locally, small on purpose): app boots with
the bundled content, one drill end to end with real audio, M1 microphone
primer → record-compare, one notification deep-link (N2), E7 background
playback. Everything else lives in the Playwright suite.

### Agent-assisted verification (not a test layer)
Playwright **MCP** ≠ the Playwright suite. During development, Claude uses
Playwright MCP (or Claude in Chrome) to drive the Expo web build
interactively — click through what it just built, screenshot, catch obvious
breakage before writing the real test. That is exploratory and leaves no
artifact; anything worth keeping gets written down as a Vitest or Playwright
spec. The suite, not the agent session, is the record of what must keep
working.

## Gates that stay human

Native-speaker review of all Tibetan (the agent never sets `reviewed`);
audio QA per district; VoiceOver/TalkBack pass on V1, V2, a drill, G5;
200% dynamic type on V1 and G5; real-device audio latency for record-compare.

## Definition of done (once coding starts)

A feature is done when: its behaviors from 03 have engine tests · its
components match their specimens · adherence passes · the affected
Playwright flow passes · `npm run validate` is green. No coverage percentage
worship — the rule list is the coverage.
