# Trungtrung — Technical architecture

*Status: DRAFT — settles when coding starts. Decided stances are marked;
everything else is the current working proposal (based on Thosam's proven
Expo setup from a previously shipped App Store app).*

## Decided

- **Expo + React Native, TypeScript strict.** Expo Router for navigation.
- **v1 is fully self-contained: no backend.** All content and audio ship in
  the app bundle (~200–300 MB). No accounts, no sync, no remote config.
  New districts arrive with app updates (quiet `New` badge).
- **Progress is local** (storage: MMKV) with JSON export/restore (U1–U4).
- Recordings are ephemeral — compare, then discard. Nothing persisted,
  nothing transmitted.

## Working stack proposal

| Concern | Choice | Notes |
|---|---|---|
| Framework | Expo **SDK 57.0.13** / RN 0.86.2 / React 19.2.3 | corrected 2026-08-17: 54 was the proposal, 57 is what installed |
| Navigation | expo-router | tabs: Journey / Practice / Collection / You |
| State | zustand (session/UI) + MMKV (persisted progress) | TanStack Query not needed without a backend |
| Styling | **uniwind 1.11** | **AMENDED 2026-08-17** (see the entry in `07-decisions`). O4's build-time script stands and is `scripts/sync-design.ts`; what changed is the consumer. O4 chose nativewind because "CSS custom properties RN cannot consume" — Uniwind is CSS-first and consumes them, so the pipeline stays closer to source. It emits a Tailwind v4 `@theme` block and a typed `src/theme/tokens.generated.ts` |
| Audio | **expo-audio** | **DECIDED** (O3, 2026-08-16): migrating off `expo-av`, which is deprecated, before any audio code exists. Must satisfy background playback + lock-screen transport for E7 — that requirement absorbed the surviving half of O8 |
| i18n | a thin shim | **DECIDED** (O5, 2026-08-16): English-only v1, but every string through `t()` from the first screen, so a second language is a strings file rather than a pass over 296 screens. No language row in settings |
| Animation | react-native-reanimated | one flip, no spring; reduced-motion fallbacks |
| Haptics | expo-haptics | one soft tick for correct, nothing for wrong |
| Interface sound & haptics | **a fourth port, `CuePlayer`** | **ADDED 2026-08-18.** `src/ports/cue-player.ts`, adapters in `src/infra/cues/`, wired by `src/composition/`. Its justification is not the migration argument the other three make — it is platform isolation and testability: web and Vitest take the silent adapter, and no component imports `expo-haptics`. Four cues and no fifth without a `07` entry |
| Audio session | one `setAudioModeAsync` at start-up | `playsInSilentMode: true` (a listening app cannot go quiet on the ring switch), `interruptionMode: 'mixWithOthers'`. App-wide, not per-player, so teaching audio and interface sounds share it — which is why it is settled in one file, `src/infra/audio/audio-session.ts` |
| Notifications | expo-notifications | local only; copy per N1; cadence per N3 |
| Fonts | expo-font / @expo-google-fonts | **must be bundled natively** — the DS loads fonts via CSS `@import`, which RN cannot do. Gabarito, Plus Jakarta Sans, and **Noto Serif Tibetan for both Tibetan tokens** — corrected 2026-08-17: Google Fonts does not publish Noto Sans Tibetan, so `--font-tibetan` names a family that has never rendered anywhere. Static instances, not variable fonts: RN weight handling with variable fonts is unreliable on Android |
| SVG | react-native-svg | illustrations, map, waveforms |
| Testing | **Vitest**, two projects — `logic` in node, `components` through react-native-web under jsdom — + **Playwright** (e2e on the Expo web build) + a thin Maestro native smoke pass | see 06-testing. RNTL was tried first and cannot run under Vitest: RN ships Flow-typed source and esbuild cannot parse it. Recorded 2026-08-17 |
| Tooling | eslint (+expo config), prettier, husky, lint-staged, commitlint, `npm run validate` = typecheck + lint + vitest | plus the DS oxlint adherence contract in CI |

## Content pipeline (real today under `scripts/`; moves into this repo with the docs)

Two chains, both running now — nothing in `content/` is hand-written:

```
Speak (scripts/content/, from claude/speak-track-spec-v3.md):
build_v3  → parse_spec → coverage · verbs · dict_index → build_manifests
          → generate → tibterm → merge_tibetan → merge_prose → split_notes
          → chunks → romanize → collections → generate_stops
          → validate · lint_prose · consistency · open_questions
build_v3 --check       rebuilds the bible and re-parses it to prove the
                       three count sources agree

   ORDER IS LOAD-BEARING, and this chain omitted six steps until 2026-08-16.
   merge_tibetan is not optional: generate carries NO Tibetan and rebuilding
   without it destroys the translation pass. romanize runs after chunks (a
   phrase's romanization is its chunks joined) and before generate_stops
   (which embeds `roman` into every meaning-pick prompt). Four of these write
   with no --write flag. See CLAUDE.md for the full warning.

Read:
content/read/inventory.json
   ↓ scripts/build_read.py
content/json/read/*.json
   ↓ scripts/validate_read.py   59 checks
```

`scripts/validate.py` implements the 38 rules of spec §7 — deliberately the
machine-checkable subset (register correctness, for one, stays human) — and
exits non-zero. `scripts/audit/` stands beside both chains: the board census,
the navigation/journey/coverage/pipeline maps, and the check gates
(`check_readonly.py`, `check_doc_figures.py`) that keep prose figures equal
to the datasets. A validated release bundle, shipped inside the app, is the
end state once coding starts.

The app treats content as **read-only data**: districts, vocabulary,
phrases, stops, exercises, collections JSON + audio files + SVG
illustrations, all bundled. The exercise engine (03-exercise-system) is
pure logic over that data — which is what makes it unit-testable.

## Proposed folder shape

*Superseded 2026-08-17 by what was built. `docs/architecture.md` in the app repo is
the authority; this is kept so the difference is visible.*

```
app/            expo-router routes (tabs, stacks, sheets)
src/
  domain/       types + the progression and script rules (pure TS)
  engine/       exercise state machine, queue/re-queue (pure TS)
  usecases/     orchestration — the ONLY layer that touches ports
  ports/        ContentSource · ProgressStore · AudioSource
  infra/
    content/    SqliteContentSource · JsonContentSource
    progress/   MmkvProgressStore
    audio/      BundledAudioSource
  store/        zustand slices — UI and session state only
  components/   RN implementations of the DS components (same names!)
  theme/        generated tokens (from the DS — never hand-written)
  composition/  container.ts — the only file wiring adapters to ports
scripts/        sync-design · sync-content · sync-cards · check-adherence
docs/           these documents, moved into the repo
```

Two things moved. `src/content/` was **"typed loaders + selectors over the bundled
JSON"**; it is now `src/infra/content/` reading a **compiled SQLite artifact** built
outside the app. Metro inlines JSON into the JS bundle, so 9 MB of it is parsed into the
heap at startup — tens of MB on a low-end Android — while a bundled read-only DB is
indexed, lazy, and ships FTS5 for `SearchField`. The app contains no conversion logic at
all: `design-system/scripts/build_db.py` emits the artifact and the app consumes it.

And `src/domain/`, `src/usecases/`, `src/ports/` and `src/composition/` are new. The
principle below — pure logic separated from UI — is enforced by five
`import/no-restricted-paths` zones rather than by discipline.

## Principles

Pure logic separated from UI (the engine never imports React). DS component
names match 1:1 between board and code — with the caveat that **22 of the 51
manifest components ship no source in the export**, only compiled bundle code,
so `AnswerChoice`, `Button` and `RecordButton` have no `.jsx` or `.card.html` to
mirror. No new dependency without a note in 07-decisions. Accessibility from day
one: **`roman` aria-labels** via `TibetanText` (corrected 2026-08-16 — this said
THL, which the 2026-08-09 decision retired from every card, exercise and
aria-label; the shipped component was always right), text equivalents for colour
states, dynamic type.
