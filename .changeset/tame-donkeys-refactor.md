---
"@studnicky/file-lock": patch
"@studnicky/mutex": patch
"@studnicky/concurrency": patch
"@studnicky/fetch": patch
"@studnicky/sample-buffer": patch
"@studnicky/circular-buffer": patch
"@studnicky/visible-range": patch
"@studnicky/batch": patch
"@studnicky/virtual-fs": patch
"@studnicky/resilience": patch
"@studnicky/sliding-window-limiter": patch
"@studnicky/boundary-kit": patch
"@studnicky/request-executor": patch
"@studnicky/retry": patch
"@studnicky/clock": patch
"@studnicky/bounded-dispatcher": patch
"@studnicky/keyed-work-gate": patch
"@studnicky/eslint-config": patch
---

Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. Fluent builders assemble their options object via `@studnicky/types`'s `PickDefined.from()` instead of manual spread-ternary chains. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
