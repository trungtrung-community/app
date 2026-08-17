# `src/engine`

The exercise machine: the queue, the re-queue rule, and `commit()`.

Empty as of 2026-08-17. The directory exists so the architecture rules in
`eslint.config.js` and `.dependency-cruiser.js` are complete now rather than on the day
the first file lands — a layer that is only described in prose is a layer nothing
enforces.

**What belongs here:** a reducer over values. It receives a `SessionState` and a
`CommitInput`, returns a `CommitOutcome`, and touches no port. A use case does the
loading and saving; that separation is what lets this layer be tested with no doubles
at all.

**What may not:** `react`, `react-native`, `expo*`, `zustand`, `uniwind`, anything under
`src/infra`, `src/store`, `src/components` or `src/usecases`. Only `src/engine` and
`src/domain`. Randomness and the clock arrive as parameters — the re-queue rule is
"3–5 positions later", so `commit` takes an `Rng`, and injected it can be asserted
exactly.

See `docs/05-architecture.md`.
