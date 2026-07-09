# @studnicky/flag-evaluator

> Local deterministic feature-flag evaluation with percentage rollout and observability hooks

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/flag-evaluator)

Registers named boolean flag definitions (`enabled`, optional `rolloutPercent`, `defaultValue`) and resolves each `evaluate()` call deterministically via `@studnicky/json`'s `Hash` — the same flag and targeting key always land in the same rollout bucket, so the same caller always gets the same answer. `FlagEvaluator` is **local evaluation only**: no remote fetch, no polling, no SDK/vendor coupling. This is the exact "local flag evaluation" core that OpenFeature's spec separates from its remote `Provider` — a consuming application wires its own remote-fetch/polling layer on top of this if it needs one; that boundary is deliberate, not a missing feature.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/flag-evaluator
```

## Usage

```typescript
import { FlagEvaluator } from '@studnicky/flag-evaluator';

const evaluator = FlagEvaluator.create();

evaluator.register('new-checkout', { enabled: true, rolloutPercent: 25, defaultValue: false });
evaluator.register('legacy-search', { enabled: false, defaultValue: false });

const checkoutOn = evaluator.evaluate('new-checkout', { targetingKey: 'user-42' });
// deterministic: the same flag + targetingKey always resolves the same way

const legacySearchOn = evaluator.evaluate('legacy-search', { targetingKey: 'user-42' });
// false — the flag is disabled, so its registered defaultValue is returned

const unregisteredOn = evaluator.evaluate('never-registered', { targetingKey: 'user-42' });
// false — an unregistered flag always evaluates to false; see "Unregistered vs. disabled" below
```

## API reference

| Method | Description |
|--------|-------------|
| `FlagEvaluator.create()` | Creates an empty evaluator |
| `register(name, definition)` | Registers (or replaces) a named flag: `{ enabled, rolloutPercent?, defaultValue }` |
| `unregister(name)` | Removes a named flag; no-op if it was never registered |
| `has(name)` | Whether a flag is currently registered under `name` |
| `list()` | The names of every currently registered flag |
| `evaluate(name, context)` | Resolves a boolean decision for `name` given `context: { targetingKey?, ...arbitrary }` |

### Unregistered vs. disabled

These are two distinct outcomes, both returning a boolean, for different reasons:

- **Unregistered** (`name` was never `register()`-ed): `evaluate()` returns `false` unconditionally and fires `onDefault(name)`. There is no per-call default-value override — `evaluate()` takes no fallback argument — so an unregistered flag always resolves to `false`.
- **Registered, `enabled: false`**: `evaluate()` returns the registered `definition.defaultValue`. `defaultValue` only applies to a registered-but-disabled flag, never to an unregistered one.
- **Registered, `enabled: true`**: `evaluate()` buckets `context.targetingKey` deterministically into `[0, 100)` (hashing `name + ':' + targetingKey` via `Hash.value()`, parsing the resulting hex digest as a base-16 integer, and reducing it `% 100`) and returns `bucket < (definition.rolloutPercent ?? 100)`. Omitting `rolloutPercent` means `100` — fully enabled for everyone once `enabled: true`.

## Hooks

`FlagEvaluator` has no observability of its own by default — override these protected hooks in a subclass to add logging/tracing/metrics. Hooks should stay fast and non-blocking; observer-hook failures are contained so flag resolution still returns its canonical decision.

| Hook | Fires |
|------|-------|
| `onEvaluate(flag, context, result)` | After every resolution, on every path, as the last thing before `evaluate()` returns |
| `onDefault(flag)` | When `evaluate()` is called for a flag name that was never registered |
| `onRuleMismatch(flag, context)` | When an enabled flag's rollout bucket falls outside the enabled range (rollout exclusion only — never fires for a disabled flag) |

```typescript
import { FlagEvaluator } from '@studnicky/flag-evaluator';

class TelemetryFlagEvaluator extends FlagEvaluator {
  protected override onEvaluate(flag: string, _context: Record<string, unknown>, result: boolean): void {
    console.log(`[flags] '${flag}' -> ${result}`);
  }

  protected override onRuleMismatch(flag: string): void {
    console.log(`[flags] '${flag}' rollout bucket missed`);
  }
}
```

See `examples/observedFlagEvaluator.ts` for the full runnable version, including `onDefault`.

## Scope

`FlagEvaluator` owns only local, in-process flag resolution — no HTTP client, no background polling, no vendor SDK. Fetching flag definitions from a remote source (LaunchDarkly, Split, a config service, an internal API) and calling `register()` with the results is entirely a consuming application's concern, matching the boundary OpenFeature's spec draws between its local evaluation core and its remote `Provider` interface.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/flag-evaluator

## License

MIT
