# Architecture

_Extends `docs/05-architecture.md` in the design-system repo, which moves in here
when the rest of the living documents do. Where the two disagree, this file is the
one describing code that exists._

## One app, not a client and a server

There is one bundle and one JavaScript process, running on the phone. `src/` is not
a backend: nothing in it runs anywhere else, and no HTTP separates it from the
screens. A screen calls a plain function.

The organising principle is the **dependency direction**, not whether a file draws
something. Arrows point inward, toward the learning rules:

```
        app/  ·  src/components/  ·  src/store/          presentation
                        │
                        ▼
                  src/usecases/                          application
                        │
                        ▼
              src/engine/  ·  src/domain/                domain
                        ▲
                        │
                   src/ports/                            declared capabilities
                        ▲
                        │
                   src/infra/                            implementations
                        │
                 wired by src/composition/
```

`src/infra` is not merely "non-visual" — it is specifically the implementation of
external concerns. `src/usecases` is not merely "non-visual" either; it is the
application layer. Keeping those named precisely is what stops `src/` becoming a
drawer for anything that isn't a component.

Each folder answers one question:

| Folder             | Question it answers                      |
| ------------------ | ---------------------------------------- |
| `app/`             | Where am I? What route is this?          |
| `src/components/`  | What does this look like?                |
| `src/store/`       | What is on screen right now?             |
| `src/usecases/`    | What can the application do?             |
| `src/engine/`      | How does the learning system operate?    |
| `src/domain/`      | What are the rules?                      |
| `src/ports/`       | What outside capabilities do we need?    |
| `src/infra/`       | How is each of those actually provided?  |
| `src/composition/` | Which implementation are we using today? |
| `src/theme/`       | Generated tokens. Never hand-written.    |

The boundaries are lint rules rather than documentation — see the zones in
`eslint.config.js`. Each carries its reason in the failure message.

## Screens

`app/` is fixed by expo-router: the directory must sit at the repo root and one
file is one route.

A route file reads its parameters, picks up the state it needs, calls a use case and
composes design-system components. It does not calculate anything the engine owns,
and it may not import `src/infra/**` — lint rejects it, because naming a concrete
adapter in a screen is exactly what turns swapping SQLite for an API into a rewrite
of the screens.

```
stop/[id].tsx  ->  usecases.submitAnswer()  ->  engine.commit()  ->  ports  ->  infra
```

## Components mirror the design system, name for name

`src/components/` uses the design system's own four groups, and every component
keeps its exact name:

```
src/components/
├── core/        10  Badge · Button · Card · Divider · Icon · IconButton
│                    ListRow · SegmentedControl · TabBar · Tag
├── forms/        6  Checkbox · Input · Radio · SearchField · Select · Switch
├── feedback/     8  Dialog · EmptyState · MascotSpeech · OfflineBanner
│                    Sheet · Skeleton · Toast · Tooltip
└── learning/    27  AnswerBand · AnswerChoice · TibetanText · WordCard · WordRow
                     RailNode · FlashCard · ProgressBar · … (see _ds_manifest.json)
```

**No invented taxonomy.** A `lesson/` or `ui/` grouping, or a name like
`QuestionCard` or `AnswerOption`, would be a second vocabulary for things the board
already names — and the board is the spec that 296 screens are written in.
`docs/05` states the rule as "same names!", and the design system's own working
rules put it harder: IDs and component names are the contract, and a retired name
stays retired.

The real components behind those two invented ones are `AnswerChoice` (the tappable
option) and `AnswerBand` (the correct/wrong band beneath it).

### UI used on exactly one screen

It colocates with its route, not in `src/components/`. The design system's rule is
that anything reused across screens is promoted to the design system — with a
`.card.html` specimen and a manifest entry, or it is not done. So the moment a
colocated piece is wanted a second time it gets promoted properly rather than
quietly accumulating in a components folder the board knows nothing about.

## Why the port seam exists, and what it is worth

Three ports, because three things could stop being local: content, progress, audio.
A repository per entity was considered and rejected — content lives in one medium
with one lifecycle, so lessons and vocabulary would always migrate together.

Every method is async even though MMKV and a bundled database are synchronous. That
single choice is what keeps a later migration local instead of sweeping.

The seam localises the work; it does not shrink it, and the three are not equal:

| Port            | Cost of going remote                                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AudioSource`   | Small. A remote adapter and a caching decorator. Most likely to happen first, because recordings are what push the bundle past what a store ships. |
| `ContentSource` | Contained. An adapter, runtime validation at the boundary, a fetch-and-cache policy.                                                               |
| `ProgressStore` | A subsystem. Authentication, sync semantics, conflict resolution, an offline queue, schema versioning, migrating existing local data.              |

So: design seriously for audio, cheaply for accounts. And do not build the app as
though it already had a backend — `docs/01-vision.md` says v1 has none, and the
adapters that do not exist yet are the ones we are not paying for.
