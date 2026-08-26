---
'@studnicky/batch': patch
'@studnicky/boundary-kit': patch
'@studnicky/bounded-dispatcher': patch
'@studnicky/concurrency': patch
'@studnicky/config': patch
'@studnicky/entity-store': patch
'@studnicky/eslint-config': patch
'@studnicky/event-bus': patch
'@studnicky/file-lock': patch
'@studnicky/flag-evaluator': patch
'@studnicky/fsm': patch
'@studnicky/health-registry': patch
'@studnicky/idempotency-guard': patch
'@studnicky/keyed-rate-limiter': patch
'@studnicky/keyed-work-gate': patch
'@studnicky/memoize': patch
'@studnicky/mutex': patch
'@studnicky/paginator': patch
'@studnicky/pipeline': patch
'@studnicky/process-kit': patch
'@studnicky/resilience': patch
'@studnicky/scheduler': patch
'@studnicky/signal': patch
'@studnicky/sliding-window-limiter': patch
'@studnicky/system': patch
'@studnicky/throttle': patch
---

Adds missing `tsconfig.json` project references for `@studnicky/*` dependencies declared in
`package.json` but absent from `references`, the same class of bug that broke `intake-kit`'s
`tsc -b` build order. Found by auditing every package for this pattern after the intake-kit
incident; these 26 packages were latent, not yet triggering a build failure.
