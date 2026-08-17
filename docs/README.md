> **These are copies, moved into the app repo on 2026-08-17.**
>
> `01`–`10` were written in `design-system/docs/` and are reproduced here so the app
> carries its own spec. Where the two disagree, the reason is recorded in place —
> `05-architecture.md`'s stack table and folder shape were both corrected against what
> shipped, and `07-decisions.md` has a 2026-08-17 entry for the six decisions the port
> had to make. `architecture.md`, `porting-web-to-rn.md` and `spikes/` beside them are
> the app's own and have no upstream copy.

# Trungtrung — The document system

**This file is the map. Read it first, in every session.**

Trungtrung's knowledge lives in a small set of living documents, each with a
single responsibility. They replace the old round-based reports
(`screen-board-round-two/three`, `board-gap-analysis`,
`screen-board-completion-brief`) — everything durable in those has been
extracted into the docs below. Documents are continuously improved; reports
about a moment in time are not written anymore. One deliberate carve-out:
dated audit and fix-log **records** in `reports/` are permitted — they record
a pass, they are not living docs, and anything durable in them still moves
into the docs.

## The set

| Doc | Owns | Changes |
|---|---|---|
| `docs/README.md` | The workflow, the doc map, rules for Claude | rarely |
| `docs/01-vision.md` | Why, who for, philosophy, the never-do list | almost never |
| `docs/02-product-spec.md` | The model, IA, features, screens, ship order | often |
| `docs/03-exercise-system.md` | Exercise catalogue, answer state machine, session loops, progression | when mechanics change |
| `docs/04-design-conventions.md` | Design rules that live outside the DS code; board authoring | when a convention is set |
| `docs/05-architecture.md` | Tech stack, content pipeline, folder structure | draft until coding starts |
| `docs/06-testing.md` | Test strategy — behaviors, layers, gates | grows with the code |
| `docs/07-decisions.md` | Dated decision log + open decisions | every decision |
| `docs/08-glossary.md` | One name per concept | when a term is coined |
| `docs/09-backlog.md` | Ideas parking lot + known gaps | whenever inspiration hits |
| `docs/10-illustrations.md` | The AI-illustration pipeline: master prompt, style contract, QA | when the visual style evolves |
| `claude/speak-track-spec-v3.md` | **The Speak content spec** — districts, items, schema, validation | versioned deliberately; **generated** by `scripts/content/build_v3.py`, so edit that |
| `claude/read-track-spec-v1.md` | **The Read content spec** | versioned deliberately |

Two sources of truth live *outside* the project, in Claude Design:

- **The screen board** — `Trungtrung Screen Board.dc.html`. The single source
  of truth for screens. One board, no new pages.
- **The design system** — `trungtrung-learn-tibetan-design-system-6cf2480d-…`
  (tokens, components, lint contract). Components exist only when all three
  artifacts exist: `.jsx`, `.card.html` specimen, manifest entry.

## The workflow

```
1. Brainstorm in any Claude surface (project attached)
        → decisions land in 07, ideas in 09, spec changes in 02/03
2. Design work: write a SHORT delta brief (what changed since the docs),
   never a full re-export of context
        → the SCREEN BOARD is not writable by tool: the brief goes out as a
          paste-ready prompt for the Claude Design board project
        → the DESIGN SYSTEM (6cf2480d-…) is writable directly via DesignSync
3. Review the result against 03/04's rules
        → update only the affected docs; log decisions in 07
4. When the board is locked and coding starts:
        → these docs move into the repo as /docs, CLAUDE.md points at them,
          and they keep evolving alongside the code
```

## Rules for Claude sessions (ai-context)

- Read the docs relevant to the task before producing anything. Do not
  reconstruct project knowledge from chat history.
- **Think outcome-first.** Every screen and flow is judged by one question:
  what outcome is the learner being led to here, and does this sequence
  actually lead there? A surface that can't name its outcome is a gap —
  flag it, don't paper over it.
- The never-do list in `01-vision.md` overrides any suggestion, however good.
- Content questions: `claude/speak-track-spec-v3.md` wins on Speak data and
  `claude/read-track-spec-v1.md` on Read data; the board wins on layout
  **except where `07-decisions` has already overruled it**;
  `03-exercise-system.md` wins on behavior.
- Use the glossary's terms exactly. If a new concept needs a name, coin it in
  `08-glossary.md` in the same session.
- Every decision taken in a session gets a dated entry in `07-decisions.md`.
- Update the affected doc in place. Never create a new "round" or "report"
  doc; never fork a doc into v2 (the content spec is the one exception, by
  deliberate versioning). Dated audit/fix-log records in `reports/` are the
  other carve-out — records of a pass, never a home for living knowledge.
- Nothing generated ships as reviewed content — a native speaker reviews all
  Tibetan. The agent never sets `status: "reviewed"`.
