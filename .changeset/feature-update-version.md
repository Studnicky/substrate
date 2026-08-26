---
'@studnicky/batch': major
'@studnicky/boundary-kit': major
'@studnicky/bounded-dispatcher': major
'@studnicky/cache': major
'@studnicky/circular-buffer': major
'@studnicky/clock': major
'@studnicky/concurrency': major
'@studnicky/config': major
'@studnicky/context': major
'@studnicky/entity-store': major
'@studnicky/errors': major
'@studnicky/event-bus': major
'@studnicky/fetch': major
'@studnicky/file-lock': major
'@studnicky/flag-evaluator': major
'@studnicky/fsm': major
'@studnicky/health-registry': major
'@studnicky/idempotency-guard': major
'@studnicky/intake-kit': major
'@studnicky/json': major
'@studnicky/keyed-rate-limiter': major
'@studnicky/keyed-work-gate': major
'@studnicky/logger': major
'@studnicky/memoize': major
'@studnicky/mutex': major
'@studnicky/paginator': major
'@studnicky/pipeline': major
'@studnicky/process-kit': major
'@studnicky/request-executor': major
'@studnicky/resilience': major
'@studnicky/retry': major
'@studnicky/sample-buffer': major
'@studnicky/scheduler': major
'@studnicky/signal': major
'@studnicky/sliding-window-limiter': major
'@studnicky/system': major
'@studnicky/throttle': major
'@studnicky/timing': major
'@studnicky/types': major
'@studnicky/virtual-fs': major
'@studnicky/visible-range': major
'@studnicky/worker-pool': major
'@studnicky/eslint-config': major
---

`@studnicky/predicates`, `Guard`, and the atomic comparators are absorbed into
`@studnicky/types`' `Predicates`; `@studnicky/types/filters` is redesigned around a
callable/value union rather than per-collection operator modules, dropping the standalone
`ArrayOperators`/`MapOperators`/`SetOperators` exports. Every package's `interfaces/`,
`entities/`, and `errors/` now export through their own submodule instead of the package
root. `SchemaValidator.compileIntake` and `@studnicky/intake-kit`'s `IntakeCompiler`/
`EntityIntake` no longer coerce a scalar's type at the boundary — a wrong-typed field is
rejected, not silently converted, and the `coerce` option is removed entirely so every
`@studnicky/*` package now shares one strict intake contract.

`@studnicky/eslint-config` rule behaviour is now derived from measurement rather than
assumption, abbreviated exported identifiers are expanded across every rule, `hygieneSuite`
and the `HexagonalSuite` factory are added alongside the existing `entitySuite`/`v8Suite`,
and several rules that were defined but never enabled (`no-mixed-callable-shapes`, four
`arch/*` rules, `descriptive-identifiers`) are now wired into the shipped configuration.
