# `src/store`

Zustand slices holding UI and session state.

Empty as of 2026-08-17. The directory exists so the architecture rules in
`eslint.config.js` and `.dependency-cruiser.js` are complete now rather than on the day
the first file lands.

**What belongs here:** what the screens need to render and nothing more — the hydrated
progress snapshot for synchronous reads, the current session, transient UI state.

**What may not:** anything under `src/infra`. A slice reaches an adapter through
`src/composition/container`, never by naming one. Persistence is `ProgressStore`'s job,
behind the port; a slice that writes to MMKV directly is the thing this boundary exists
to prevent.

See `docs/05-architecture.md`.
