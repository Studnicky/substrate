---
title: '@studnicky/config'
description: Configuration parsing, errors, and clamping utilities.
---

# @studnicky/config

> Configuration parsing, errors, and clamping utilities.

## Install

```bash
pnpm add @studnicky/config
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

Parse external configuration through an entity's `intake` function. Intake coerces compatible values, supplies schema defaults, and removes undeclared properties:

<<< ../../packages/config/examples/validate-config.ts#usage

## Public API

Import `ClampedConfig` and `ConfigurationError` from `@studnicky/config`; import clamping schemas from `@studnicky/config/entities`.

## Try it

<RunnableExample src="packages/config/examples/validate-config" title="Configuration intake" />

The output shows a typed configuration with defaults applied and undeclared properties removed.

## Configuration errors

Build a `ConfigurationError` with an `Error` cause when an already-parsed configuration cannot be used:

<<< ../../packages/config/examples/custom-error.ts#usage

## Clamping

`ClampedConfig` applies declarative `{min, max, reason}` rules to a flat configuration object. `apply` returns a new object with out-of-range numeric fields clamped into range. Fields not present in the rule table, not numeric, or already in range are copied through unchanged; the input is never mutated.

<!-- inline-ts-ok: conceptual call-site pattern; no example file demonstrates clamping -->
```ts
import { ClampedConfig } from '@studnicky/config';
import { ClampRuleEntity } from '@studnicky/config/entities';

interface WorkerConfig {
  timeoutMs: number;
  concurrency: number;
}

const rules: Record<string, ClampRuleEntity.Type> = {
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
import { ClampedConfig } from '@studnicky/config';
import { ClampEventEntity } from '@studnicky/config/entities';

class LoggingClampedConfig extends ClampedConfig {
  protected static override onClamp(event: ClampEventEntity.Type): void {
    console.warn(`[config] clamped ${event.field}: ${event.raw} -> ${event.clamped} (${event.reason})`);
  }
}

LoggingClampedConfig.apply(raw, rules);
```

## Entities

`@studnicky/config/entities` exports clamping rule and event schemas.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import { ClampRuleEntity } from '@studnicky/config/entities';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `ClampedConfig` | Applies declarative numeric clamping rules. | `@studnicky/config` |
| `ConfigurationError` | Represents invalid configuration values. | `@studnicky/config` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/config)
