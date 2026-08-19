# Trungtrung — Product vision

*The most stable document. Changing this changes the product.*

## Why this app exists

Trungtrung (after the black-necked crane, ཁྲུང་ཁྲུང) teaches **spoken Lhasa
Tibetan and the uchen script** to beginners, as a walk through a place rather
than a march through a syllabus. It exists because no general-purpose language
app can produce the third of the content that matters most — butter tea,
khata, kora, the two goodbyes, the day-names that are people's names — and
because the language deserves a learning product made with care rather than
growth mechanics.

**[DRAFT — written by Claude 2026-08-16 to be replaced, not kept. It says only
what this repo already evidences: that Thosam supplies the Lhasa pronunciations
from his own speech, and that the audience he names first is the one that
speaks at home and cannot read. Every specific beyond that is his to put in,
and this paragraph should not survive him reading it.]**

I speak this language and read very little of it, which is the ordinary
diaspora position rather than an unusual one — the words for home arrive first,
and the script arrives late or not at all. So I am building the thing I wanted
and could not find: an app that assumes you already have something to build on,
that treats uchen as reachable rather than scholarly, and that does not measure
you while you walk. The apps that exist cannot make the third of this that
matters — butter tea, khata, kora, the two goodbyes — because it is not
vocabulary, it is a place.

What success looks like: someone who could only ever speak it finds they can
read a prayer flag, a shop sign, their own name.

## Who it's for

The primary audience is the **Tibetan diaspora** — people living outside
Tibet, in India, Nepal, Switzerland, the US and beyond, where someone often
speaks at home but cannot read — and they are the audience most likely to
finish. **v1 does not let them skip.** The K1–K3 skip-ahead is drawn and not
wired (07, 2026-08-09): both tracks are open from the first launch, and a
learner who already speaks starts the Read track rather than jumping down it. Around them, three more: **curious
foreigners** drawn to Tibetan language and culture, **language learners**
who want the challenge of a genuinely different foreign language, and
**students of Buddhism** who want to learn Tibetan. The interface is English
for now. **O5 closed 2026-08-16**: English-only v1, every string through a
`t()` shim from the first screen, and no language row in settings — a second
language becomes a strings file, not a pass over the whole app.

## Philosophy

- **The journey is a place.** 24 districts, 5 sections, one arc: arrive,
  settle, be let deeper, go out, leave. District 24 reprises District 1.
- **Walked twice.** A kora is not walked once; the crane comes back. Circuit 1
  is everything concrete and needed; circuit 2 is what was held back.
- **Speak-first, recognition-only.** A learner never composes Tibetan they
  haven't heard (the evidentiality firewall). The Read track may build
  *syllables* — spelling, never sentences.
- **Calm is the product.** Manual advance, no timers, nothing withheld for
  getting something wrong. A session always ends. The register praises the
  effort and names the thing. The final test reports a mark (07, 2026-08-16)
  and it gates nothing: falling short of it costs a retake and never access.
- **Honest, everywhere.** Empty states point forward; limitations are stated
  plainly (audio-free mode); nothing is locked, things are "not found yet".
  **What the app does not have a form for, it does not show** (07, 2026-08-09):
  56 records with no Tibetan were parked rather than drawn as gaps, and every
  record that ships has script. "Not found yet" describes a waymark on the
  journey, never a card with nothing on it.

## Product stances (standing decisions)

- **Free, with a support option — after the beta.** No locked content, ever.
- **Fully offline from first launch.** All content ships inside the app
  (~200–300 MB). No in-app downloads, no download management, ever.
- **Local-only progress** with a human-readable backup file. No accounts.
- **Ephemeral recordings.** A learner's voice exists only for the compare,
  then it's gone. Nothing is sent anywhere.
- **The streak cannot break.** `Days walking` is cumulative, forever.
- **Human recordings only — for anything the learner imitates.** Every word,
  phrase and syllable is recorded by a person, no synthesis. **Interface sounds
  are a separate class** (07, 2026-08-16): the correct tick, the run, the
  stop-complete moment and — added 2026-08-18 — **a quiet tone for a wrong
  answer** may be synthesised, because nobody is asked to repeat them. The
  wrong tone is sound only: the phone does not buzz at a miss, and `docs/05`'s
  "nothing for wrong" still governs haptics. P2's sound row turns them off.

## The never-do list

Never: a sentence builder or English-prompt→Tibetan-assembly exercise —
narrowed from "word bank" (07, 2026-08-08): the ban is on building Tibetan
from an **English** prompt, and E8 orders chunks of a phrase the learner has
just heard in Tibetan, which is recognition. The clause that carries the
weight is unchanged and absolute: **no exercise ever offers a choice between
grammatical forms** · Tibetan text entry · timers — one signed exception (07,
2026-08-07): the training ground's metronome, off by default, tempo set by the
learner, advancing the pile at that tempo as pacing, never scoring, nothing
scored, compared, or lost by stopping · hearts, leaderboards, leagues, streak
freezes · combo
counters — one signed exception (07, 2026-08-16): **`S7·✓`'s run, and nowhere
else.** A count of correct answers inside a single set, from three upward,
reset the moment the set is left, never persisted to the profile, never
compared between learners, and never a gate · guilt or loss-framed copy
anywhere, including notifications · padlock iconography (waymarks, not locks) ·
emoji · more than one exclamation
mark in the whole product · a paywall on content · the collection as a
sticker album (no shine, rarity, pack-opening) · the mascot as wallpaper ·
a second brand colour · lotus-and-incense mysticism in cultural notes ·
religious instruction (describe practice, never prescribe it) · therapeutic
claims (District 15) or operated astrology (District 16) · auto-scoring a
learner's voice · confetti — one signed exception (07, 2026-08-08): **S12,
the moment a lesson stop completes, and nowhere else.** Not on the card
reveal, where a quiet arrival is the effect; not on drills, exams or reviews,
which are not stops. A stop is the narrative unit, which is the same reason it
is the only loop with a progress bar.

**Scoring, and what the removed clause did not become** (07, 2026-08-16). This
list used to forbid "a percentage, grade, score, or accuracy figure" outright.
Thosam removed it, and it was not replaced by a licence. **Three surfaces show a
number and nothing else does:** the final test shows a percentage and a 90%
mark, section exams show a count of what was right, and `S7·✓` shows the run
above. Everywhere else the older rules still hold and are not weakened by this
change — `docs/03` §6's progression model shows no number in it as a score, `S8`
counts and never scores, `n of m` stays a position rather than a tally
(`docs/04`), and **a learner's voice is still never auto-scored**, which is a
different rule and survives untouched above. A fourth scored surface needs its
own line here before it is drawn.
