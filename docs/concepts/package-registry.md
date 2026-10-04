---
title: Package Registry
description: Current public import surfaces for every Substrate package.
---

# Package Registry

The table classifies packages as foundation primitives, backend primitives, tooling primitives, combinations, or compositions and lists their supported runtime and runtime-neutral public paths. Runtime-neutral declarations use package-level `/entities`, `/interfaces`, or `/types` paths when the package publishes them. Runtime paths are never package-root imports.

| Package                                                       | Classification       | Runtime imports                                                   | Neutral declarations                             |
| ------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| [@studnicky/cache](/packages/cache)                           | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/circular-buffer](/packages/circular-buffer)       | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/clock](/packages/clock)                           | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/concurrency](/packages/concurrency)               | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/config](/packages/config)                         | backend primitive    | `/node`, `/browser`                                               | `/entities`                                      |
| [@studnicky/context](/packages/context)                       | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/drilldown](/packages/drilldown)                   | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`, `/types`             |
| [@studnicky/entity](/packages/entity)                         | foundation primitive | `/node`, `/browser`                                               | `/interfaces`, `/types`                          |
| [@studnicky/errors](/packages/errors)                         | foundation primitive | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/eslint-config](/packages/eslint-config)           | tooling primitive    | `/node`, `/browser`                                               | `/interfaces`                                    |
| [@studnicky/event-bus](/packages/event-bus)                   | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/fetch](/packages/fetch)                           | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/filters](/packages/filters)                       | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/fsm](/packages/fsm)                               | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/json](/packages/json)                             | foundation primitive | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/logger](/packages/logger)                         | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/matching](/packages/matching)                     | backend primitive    | `/node`, `/browser`                                               | `/interfaces`                                    |
| [@studnicky/pipeline](/packages/pipeline)                     | backend primitive    | `/node`, `/browser`                                               | `/interfaces`                                    |
| [@studnicky/resilience](/packages/resilience)                 | backend primitive    | `/node`, `/browser`, `/retry/node`, `/retry/browser`               | `/entities`, `/interfaces`, `/retry/entities`, `/retry/interfaces` |
| [@studnicky/scheduler](/packages/scheduler)                   | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/signal](/packages/signal)                         | backend primitive    | `/node`, `/browser`                                               | `/interfaces`                                    |
| [@studnicky/store](/packages/store)                           | backend primitive    | `/node`, `/browser`, `/entity`, `/strata/node`, `/strata/browser` | `/entities`, `/interfaces`, `/strata/interfaces` |
| [@studnicky/types](/packages/types)                           | foundation primitive | `/node`, `/browser`                                               | `/interfaces`                                    |
| [@studnicky/virtual-fs](/packages/virtual-fs)                 | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |
| [@studnicky/visible-range](/packages/visible-range)           | backend primitive    | `/node`, `/browser`                                               | `/entities`, `/interfaces`                       |

## Import contract

- Import executable APIs from `/node` or `/browser` for the active runtime.
- Import shared declarations from their neutral package-level path.
- Keep runtime and neutral imports separate: `/node/interfaces` and `/browser/entities` are not public paths.
- Follow each package guide for API details and runnable examples.
