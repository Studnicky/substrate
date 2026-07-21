# @studnicky/health-registry

> Named async health-check registry with worst-status-wins aggregation

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/health-registry)

Registers named async check functions, each resolving to a `'healthy' | 'degraded' | 'unhealthy'` status with optional metadata, and aggregates every registered check into one overall status. `evaluate()` runs all checks in parallel via `Promise.allSettled`; a configured `timeoutMs` races that check against a local timer with `Promise.race`. A rejecting or timed-out check is folded into the results as `'unhealthy'` instead of crashing the evaluation of the other checks. `HealthRegistry` owns only the registry-and-aggregate logic — no HTTP endpoint wiring, no Kubernetes liveness/readiness distinction; wire `evaluate()` into a route or probe in the consuming application.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/health-registry
```

## Usage

```typescript
import { HealthRegistry } from '@studnicky/health-registry';

const registry = HealthRegistry.create();

registry.register('database', async () => {
  await db.ping();
  return { status: 'healthy' };
});

registry.register('downstream-api', async () => {
  const response = await fetch('https://api.example.com/health');
  return { status: response.ok ? 'healthy' : 'unhealthy' };
}, { timeoutMs: 500 });

const { status, results } = await registry.evaluate();
// status: 'healthy' | 'degraded' | 'unhealthy' — worst-status-wins across every check
// results: ReadonlyMap<string, { status, metadata? }> — one entry per registered check
```

## API reference

| Method | Description |
|--------|-------------|
| `HealthRegistry.create()` | Creates an empty registry |
| `register(name, check, options?)` | Registers (or replaces) a named async check. `options.timeoutMs` bounds how long the check may run before it counts as `'unhealthy'` |
| `unregister(name)` | Removes a named check; no-op if it was never registered |
| `has(name)` | Whether a check is currently registered under `name` |
| `list()` | The names of every currently registered check |
| `evaluate()` | Runs every registered check in parallel and returns `{ status, results }`. An empty registry evaluates to `'healthy'` with an empty results map |
| `hookErrorCount` | Count of hook failures recorded since construction |
| `getHookErrors()` | Defensive copy of every hook failure recorded since construction |

A check that rejects, and a check that exceeds its `timeoutMs`, are both folded into `results` as `{ status: 'unhealthy', metadata }` — `metadata` carries the thrown error or a timeout description, respectively — rather than causing `evaluate()` to reject.

## Hooks

`HealthRegistry` has no observability of its own by default — override these protected hooks in a subclass to add logging/tracing/metrics. Hooks should stay fast and non-blocking; observer-hook failures are contained so health evaluation still returns its canonical aggregate result.

| Hook | Fires |
|------|-------|
| `onCheckRegistered(name)` | After a check is registered (or replaces an existing registration under the same name) |
| `onCheckResult(name, status, metadata?)` | Once per check as it settles during `evaluate()` — success, rejection, or timeout |
| `onCheckTimeout(name, timeoutMs)` | When a check exceeds its configured `timeoutMs`, in addition to `onCheckResult` |
| `onAggregate(overall, results)` | Once per `evaluate()` call, after every registered check has settled |

A hook override that throws or rejects does not abort `evaluate()` — the failure is recorded instead of propagating, backed internally by `@studnicky/errors`'s `HookInvoker`. Inspect recorded failures via `hookErrorCount`/`getHookErrors()`.

```typescript
import { HealthRegistry } from '@studnicky/health-registry';

class TelemetryHealthRegistry extends HealthRegistry {
  protected override onCheckResult(name: string, status: string, metadata?: unknown): void {
    console.log(`[health] '${name}' -> ${status}`, metadata);
  }

  protected override onAggregate(overall: string): void {
    console.log(`[health] overall: ${overall}`);
  }
}
```

See `examples/observedHealthRegistry.ts` for the full runnable version, including `onCheckTimeout`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/health-registry

## License

MIT
