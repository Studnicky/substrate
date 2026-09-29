---
title: Package Registry
description: Current public import surfaces for every Substrate package.
---

# Package Registry

The table classifies packages as foundation primitives, backend primitives, tooling primitives, combinations, or compositions and lists their supported runtime and runtime-neutral public paths. Runtime-neutral declarations use package-level `/entities`, `/interfaces`, or `/types` paths when the package publishes them. Runtime paths are never package-root imports.

| Package | Classification | Runtime imports | Neutral declarations |
|---|---|---|---|
| [@studnicky/batch](/packages/batch) | backend primitive | `/node`, `/browser` | `/entities` |
| [@studnicky/boundary-kit](/packages/boundary-kit) | composition | `/node`, `/browser` | `/interfaces` |
| [@studnicky/bounded-dispatcher](/packages/bounded-dispatcher) | composition | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/cache](/packages/cache) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/circular-buffer](/packages/circular-buffer) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/clock](/packages/clock) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/concurrency](/packages/concurrency) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/config](/packages/config) | backend primitive | `/node`, `/browser` | `/entities` |
| [@studnicky/context](/packages/context) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/drilldown](/packages/drilldown) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces`, `/types` |
| [@studnicky/entity](/packages/entity) | foundation primitive | `/node`, `/browser` | `/interfaces`, `/types` |
| [@studnicky/entity-store](/packages/entity-store) | backend primitive | `/node`, `/browser` | `/interfaces` |
| [@studnicky/errors](/packages/errors) | foundation primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/eslint-config](/packages/eslint-config) | tooling primitive | `/node`, `/browser` | `/interfaces` |
| [@studnicky/event-bus](/packages/event-bus) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/example-smoke-kit](/packages/example-smoke-kit) | tooling primitive | `/node` | `/entities`, `/interfaces` |
| [@studnicky/fetch](/packages/fetch) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/file-lock](/packages/file-lock) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/filters](/packages/filters) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/flag-evaluator](/packages/flag-evaluator) | backend primitive | `/node`, `/browser` | `/entities` |
| [@studnicky/fsm](/packages/fsm) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/health-registry](/packages/health-registry) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/idempotency-guard](/packages/idempotency-guard) | combination | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/json](/packages/json) | foundation primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/logger](/packages/logger) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/matching](/packages/matching) | backend primitive | `/node`, `/browser` | `/interfaces` |
| [@studnicky/memoize](/packages/memoize) | combination | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/mutex](/packages/mutex) | backend primitive | `/node`, `/browser`, `/gate` | `/entities`, `/interfaces` |
| [@studnicky/paginator](/packages/paginator) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/pipeline](/packages/pipeline) | backend primitive | `/node`, `/browser` | `/interfaces` |
| [@studnicky/process-kit](/packages/process-kit) | composition | `/node`, `/browser` | `/interfaces` |
| [@studnicky/request-executor](/packages/request-executor) | composition | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/resilience](/packages/resilience) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/retry](/packages/retry) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/sample-buffer](/packages/sample-buffer) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/scheduler](/packages/scheduler) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/scenario-kit](/packages/scenario-kit) | tooling primitive | `/node` | `/interfaces` |
| [@studnicky/semantic-matching](/packages/semantic-matching) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/signal](/packages/signal) | backend primitive | `/node`, `/browser` | `/interfaces` |
| [@studnicky/store](/packages/store) | backend primitive | `/node`, `/browser`, `/strata/node`, `/strata/browser` | `/entities`, `/interfaces`, `/strata/interfaces` |
| [@studnicky/system](/packages/system) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/throttle](/packages/throttle) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/timing](/packages/timing) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/topic-router](/packages/topic-router) | combination | `/node`, `/browser` | `/interfaces` |
| [@studnicky/types](/packages/types) | foundation primitive | `/node`, `/browser` | `/interfaces` |
| [@studnicky/virtual-fs](/packages/virtual-fs) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/visible-range](/packages/visible-range) | backend primitive | `/node`, `/browser` | `/entities`, `/interfaces` |
| [@studnicky/worker-pool](/packages/worker-pool) | composition | `/node`, `/browser` | `/entities`, `/interfaces` |

## Import contract

- Import executable APIs from `/node` or `/browser` for the active runtime.
- Import shared declarations from their neutral package-level path.
- Keep runtime and neutral imports separate: `/node/interfaces` and `/browser/entities` are not public paths.
- Follow each package guide for API details and runnable examples.
