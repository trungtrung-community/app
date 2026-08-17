# `tests/`

For tests whose scope does not belong to one source module. Everything else is
**colocated** next to what it tests — see `docs/11-testing-conventions.md` §2.

```
tests/integration/    crosses usecase -> engine -> ProgressStore -> MMKV
tests/e2e/            Playwright, against the Expo web build
```

There is no `tests/unit/`. A parallel tree mirroring `src/` is a second thing to
navigate and keep in step, for no gain over colocation.

## Both are empty as of 2026-08-17, and honestly so

`src/engine/` and `src/usecases/` have no files yet, so the first integration test —
"the learner submits the final answer; does the use case advance the engine and persist
progress?" — has nothing to integrate. Playwright is not a dependency either.

The directories exist so the first such test has an obvious home instead of landing
somewhere ad-hoc and setting a precedent by accident.

## How they run

`tests/integration/**` is a third Vitest project, `integration`, alongside `logic` and
`components` — node environment, no React Native transform. See `vitest.config.mts`.

`tests/e2e/**` is excluded from every Vitest project. Playwright is a separate runner
and driving it from Vitest would mean two tools owning one suite.
