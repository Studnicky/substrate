---
title: Package Registry
description: Current public import surfaces for every Substrate package.
---

# Package Registry

Every package exposes equivalent runtime APIs through `@studnicky/<package>/node` and `@studnicky/<package>/browser`. Runtime-neutral declarations use package-level `/entities`, `/interfaces`, or `/types` paths when the package publishes them. Runtime paths are never package-root imports.

| Package | Classification | Runtime imports | Neutral declarations |
|---|---|---|---|
| [@studnicky/batch](/packages/batch) | concurrency primitive | `/node`, `/browser` | `/entities` |
| [@studnicky/boundary-kit](/packages/boundary-kit) | boundary kit | `/node`, `/browser` | `/interfaces` |
| [@studnicky/bounded-dispatcher](/packages/bounded-dispatcher) | dispatch kit | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/cache](/packages/cache) | cache primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/circular-buffer](/packages/circular-buffer) | collection primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/clock](/packages/clock) | time primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/concurrency](/packages/concurrency) | concurrency primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/config](/packages/config) | configuration utility | `/node`, `/browser` | `/entities` |
| [@studnicky/context](/packages/context) | context primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/drilldown](/packages/drilldown) | data utility | `/node`, `/browser` | `/entities`, `/interfaces`, `/types` |
| [@studnicky/entity](/packages/entity) | entity foundation | `/node`, `/browser` | `/interfaces` |
| [@studnicky/entity-store](/packages/entity-store) | entity state | `/node`, `/browser` | `/interfaces` |
| [@studnicky/errors](/packages/errors) | error foundation | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/eslint-config](/packages/eslint-config) | lint tooling | `/node`, `/browser` | `/interfaces` |
| [@studnicky/event-bus](/packages/event-bus) | event primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/fetch](/packages/fetch) | HTTP primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/file-lock](/packages/file-lock) | locking primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/filters](/packages/filters) | filter utility | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/flag-evaluator](/packages/flag-evaluator) | evaluation primitive | `/node`, `/browser` | `/entities` |
| [@studnicky/fsm](/packages/fsm) | state-machine primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/health-registry](/packages/health-registry) | health primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/idempotency-guard](/packages/idempotency-guard) | idempotency primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/json](/packages/json) | JSON utility | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/keyed-rate-limiter](/packages/keyed-rate-limiter) | rate-limit primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/keyed-work-gate](/packages/keyed-work-gate) | work-gate primitive | `/node`, `/browser` | `/interfaces` |
| [@studnicky/logger](/packages/logger) | logging primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/matching](/packages/matching) | matching utility | `/node`, `/browser` | `/interfaces` |
| [@studnicky/matching-filters](/packages/matching-filters) | matching utility | `/node`, `/browser` | — |
| [@studnicky/memoize](/packages/memoize) | memoization primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/mutex](/packages/mutex) | locking primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/paginator](/packages/paginator) | pagination primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/pipeline](/packages/pipeline) | pipeline primitive | `/node`, `/browser` | `/interfaces` |
| [@studnicky/process-kit](/packages/process-kit) | process kit | `/node`, `/browser` | `/interfaces` |
| [@studnicky/request-executor](/packages/request-executor) | request kit | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/resilience](/packages/resilience) | resilience primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/retry](/packages/retry) | retry primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/sample-buffer](/packages/sample-buffer) | collection primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/scheduler](/packages/scheduler) | scheduling primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/semantic-matching](/packages/semantic-matching) | matching utility | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/signal](/packages/signal) | signal primitive | `/node`, `/browser` | `/interfaces` |
| [@studnicky/store](/packages/store) | state primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/strata-store-kit](/packages/strata-store-kit) | state composition kit | `/node`, `/browser` | `/interfaces` |
| [@studnicky/system](/packages/system) | system utility | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/throttle](/packages/throttle) | concurrency primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/timing](/packages/timing) | timing utility | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/topic-router](/packages/topic-router) | routing primitive | `/node`, `/browser` | `/interfaces` |
| [@studnicky/topic-router-models](/packages/topic-router-models) | routing utility | `/node`, `/browser` | `/interfaces` |
| [@studnicky/types](/packages/types) | type foundation | `/node`, `/browser` | `/interfaces` |
| [@studnicky/virtual-fs](/packages/virtual-fs) | filesystem primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/visible-range](/packages/visible-range) | range utility | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/worker-pool](/packages/worker-pool) | worker primitive | `/node`, `/browser` | `/entities`, `/interfaces` |

## Import contract

- Import executable APIs from `/node` or `/browser` for the active runtime.
- Import shared declarations from their neutral package-level path.
- Keep runtime and neutral imports separate: `/node/interfaces` and `/browser/entities` are not public paths.
- Follow each package guide for API details and runnable examples.
