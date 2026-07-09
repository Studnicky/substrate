---
title: '@studnicky/health-registry'
description: Named async health-check registry with worst-status-wins aggregation.
---

# @studnicky/health-registry

> Named async health-check registry with worst-status-wins aggregation.

## Install

```bash
pnpm add @studnicky/health-registry
```

## Usage

Register named async check functions, each resolving to `{ status, metadata? }`. `evaluate()` runs every registered check in parallel via `Promise.allSettled`, applies each check's own configured `timeoutMs` (composed via `@studnicky/signal`), and folds a rejecting or timed-out check into the results as `'unhealthy'` instead of crashing the evaluation of the other checks:

<<< ../../packages/health-registry/examples/observedHealthRegistry.ts#usage

## Aggregation

The overall status is worst-status-wins: any `'unhealthy'` check makes the overall status `'unhealthy'`, else any `'degraded'` check makes it `'degraded'`, else `'healthy'`. An empty registry evaluates to `'healthy'` with an empty results map.

| Method | Description |
|--------|-------------|
| `HealthRegistry.create()` | Creates an empty registry |
| `register(name, check, options?)` | Registers (or replaces) a named async check. `options.timeoutMs` bounds how long the check may run before it counts as `'unhealthy'` |
| `unregister(name)` | Removes a named check; no-op if it was never registered |
| `has(name)` | Whether a check is currently registered under `name` |
| `list()` | The names of every currently registered check |
| `evaluate()` | Runs every registered check in parallel and returns `{ status, results }` |

## Hooks

| Hook | Fires |
|------|-------|
| `onCheckRegistered(name)` | After a check is registered (or replaces an existing registration under the same name) |
| `onCheckResult(name, status, metadata?)` | Once per check as it settles during `evaluate()` — success, rejection, or timeout |
| `onCheckTimeout(name, timeoutMs)` | When a check exceeds its configured `timeoutMs`, in addition to `onCheckResult` |
| `onAggregate(overall, results)` | Once per `evaluate()` call, after every registered check has settled |

## Scope

`HealthRegistry` owns only the registry-and-aggregate logic — the same boundary `MachineRegistry` draws for actors. It performs no HTTP endpoint wiring and makes no Kubernetes-specific liveness/readiness distinction; a consuming application wires `evaluate()` into whatever route or probe its runtime expects.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/health-registry

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/health-registry)
