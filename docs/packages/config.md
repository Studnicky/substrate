---
title: '@studnicky/config'
description: Configuration validation utilities and type guards.
---

# @studnicky/config

> Configuration validation utilities and type guards.

## Install

```bash
pnpm add @studnicky/config
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

Validate required fields and check types in a configuration object. All assertion methods skip `undefined`/`null` values, and throw `ConfigurationError` on failure:

<<< ../../packages/config/examples/validate-config.ts#usage

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/config` | `ConfigValidation`, `Guard`, `ConfigurationError`, `ensureError` |
| `@studnicky/config/errors` | `ConfigurationError`, `ensureError` |
| `@studnicky/config/validation` | `ConfigValidation`, `Guard` |

## Try it

<RunnableExample src="packages/config/examples/validate-config" title="Config validation and type guards" />

The output shows fields passing validation, guard results for `isPositiveInteger`/`isObject`/`isFunction`, and the `ConfigurationError` messages thrown for wrong types and unknown keys.

## ensureError

`ensureError` converts any caught value to a typed `Error`. Use it to safely handle `unknown` catches without unsafe casts:

<!-- inline-ts-ok: conceptual call-site pattern; no example file demonstrates ensureError -->
```ts
import { ensureError } from '@studnicky/config';

try {
  await doWork();
} catch (thrown) {
  const err = ensureError(thrown); // always an Error
  log.error(err.message);
}
```

## Extending

`ConfigValidation` is a static class. Subclass it and override `onValidationError` to emit a domain-specific error type instead of `ConfigurationError`:

<<< ../../packages/config/examples/custom-error.ts#usage

## Clamping

`ClampedConfig` is the soft-correction sibling to `ConfigValidation`'s hard-fail assertions: given a flat config object and a declarative table of `{min, max, reason}` per numeric field, `apply` returns a **new** object with out-of-range numeric fields clamped into range instead of throwing. Fields not present in the rule table, not numeric, or already in range are copied through unchanged; the input is never mutated.

<!-- inline-ts-ok: conceptual call-site pattern; no example file demonstrates clamping -->
```ts
import { ClampedConfig, type ClampRuleType } from '@studnicky/config';

interface WorkerConfig {
  timeoutMs: number;
  concurrency: number;
}

const rules: Readonly<Record<string, ClampRuleType>> = {
  timeoutMs: { min: 100, max: 5000, reason: 'timeout must stay within safe bounds' },
  concurrency: { min: 1, max: 8, reason: 'concurrency must stay within pool capacity' },
};

const raw: WorkerConfig = { timeoutMs: 10, concurrency: 4 };
const clamped = ClampedConfig.apply(raw, rules);
// clamped.timeoutMs === 100, clamped.concurrency === 4, raw is unchanged
```

Override the protected `onClamp` static method to observe clamp events — logging is the caller's responsibility, `ClampedConfig` has no dependency on any logging package:

<!-- inline-ts-ok: conceptual call-site pattern; no example file demonstrates clamping -->
```ts
import { ClampedConfig, type ClampEventType } from '@studnicky/config';

class LoggingClampedConfig extends ClampedConfig {
  protected static override onClamp(event: ClampEventType): void {
    console.warn(`[config] clamped ${event.field}: ${event.raw} -> ${event.clamped} (${event.reason})`);
  }
}

LoggingClampedConfig.apply(raw, rules);
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/config)
