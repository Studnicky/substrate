---
"@studnicky/eslint-config": minor
"@studnicky/clock": minor
"@studnicky/concurrency": minor
"@studnicky/config": minor
"@studnicky/fetch": minor
"@studnicky/fsm": minor
"@studnicky/resilience": minor
"@studnicky/scheduler": minor
"@studnicky/virtual-fs": minor
"@studnicky/visible-range": minor
"@studnicky/cache": patch
"@studnicky/paginator": patch
"@studnicky/errors": patch
---

Widens every overridable lifecycle hook with a test-only async override to `void | Promise<void>` across `clock`, `concurrency`, `config`, `fetch`, `fsm`, `resilience`, `scheduler`, `virtual-fs`, and `visible-range`, additively — an existing `void`-returning override remains valid. Fixes two `@studnicky/eslint-config` rules: `type-alias-invariants` now accepts a type alias composing a direct-dependency-exported type or a unique-symbol-branded primitive without requiring schema derivation, and `v8/define-property` now checks for an accessor descriptor regardless of whether `Object.defineProperty`'s target can be tracked for redefinition. Restores platform-error and cancellation-code test coverage in `@studnicky/errors` and `@studnicky/concurrency`'s shared worker-pool contract.
