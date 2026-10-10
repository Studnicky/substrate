---
title: "@studnicky/config"
description: Configuration parsing, errors, and clamping utilities.
---

# @studnicky/config

> Configuration parsing, errors, and clamping utilities.

## What it is

`@studnicky/config` is a composable configuration-intake and numeric-clamping primitive. It validates and normalizes declared configuration at a boundary; it does not own a bookstore deployment or policy product.

## What it is for

Use it when Northstar Books admits external settings such as catalogue refresh limits or worker concurrency and must apply defaults, reject wrong types, and constrain safe numeric bounds once at intake.

## Northstar Books examples

- **Configuration intake** maps a catalogue worker’s external settings to a typed configuration. It proves defaults apply and undeclared fields disappear while wrong-typed values remain rejected instead of being silently coerced.

## Install

```bash
pnpm add @studnicky/config
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

Northstar Books' catalogue worker reads its settings — host, port, retry limits — from the outside world, and outside data is never trusted at face value. The example below defines a schema for that configuration once, then runs two inputs through its generated `intake` function: a config missing `port` and `maximumRetries` (which fall back to their declared defaults), and a minimal config with just a `host`. Watch that a wrong-typed field is rejected outright rather than coerced — intake fills in what's missing, it never guesses what's wrong:

<<< ../../packages/config/examples/validate-config.ts#usage

## Public API

Import `ClampedConfig` and `ConfigurationError` from `@studnicky/config/node`; import clamping schemas from `@studnicky/config/entities`.

## Try it

<RunnableExample src="packages/config/examples/validate-config" title="Configuration intake" />

The output shows a typed configuration with defaults applied and undeclared properties removed.

## Configuration errors

Sometimes a configuration only breaks after it's already been parsed — an environment variable a downstream step needed turns out to be unset. The example below shows the shape for surfacing that failure cleanly: wrap the underlying problem in a `RuntimeError`, then hand it to `ConfigurationError.create` as the `cause`, so the original failure stays attached to the error Northstar Books' worker ultimately reports:

<<< ../../packages/config/examples/custom-error.ts#usage

## Clamping

`ClampedConfig` applies declarative `{minimum, maximum, reason}` rules to a flat configuration object. `apply` returns a new object with out-of-range numeric fields clamped into range. Fields not present in the rule table, not numeric, or already in range are copied through unchanged; the input is never mutated.

<!-- inline-ts-ok: conceptual call-site pattern; no example file demonstrates clamping -->

```ts
import { ClampedConfig } from "@studnicky/config/node";
import { ClampRuleEntity } from "@studnicky/config/entities";

interface WorkerConfig {
  timeoutMs: number;
  concurrency: number;
}

const rules: Record<string, ClampRuleEntity.Type> = {
  timeoutMs: { minimum: 100, maximum: 5000, reason: "timeout must stay within safe bounds" },
  concurrency: { minimum: 1, maximum: 8, reason: "concurrency must stay within pool capacity" },
};

const raw: WorkerConfig = { timeoutMs: 10, concurrency: 4 };
const clamped = ClampedConfig.apply(raw, rules);
// clamped.timeoutMs === 100, clamped.concurrency === 4, raw is unchanged
```

Override the protected `onClamp` static method to observe clamp events — logging is the caller's responsibility, `ClampedConfig` has no dependency on any logging package:

<!-- inline-ts-ok: conceptual call-site pattern; no example file demonstrates clamping -->

```ts
import { ClampedConfig } from "@studnicky/config/node";
import { ClampEventEntity } from "@studnicky/config/entities";

class LoggingClampedConfig extends ClampedConfig {
  protected static override onClamp(event: ClampEventEntity.Type): void | Promise<void> {
    console.warn(
      `[config] clamped ${event.field}: ${event.raw} -> ${event.clamped} (${event.reason})`,
    );
  }
}

LoggingClampedConfig.apply(raw, rules);
```

## Entities

`@studnicky/config/entities` exports clamping rule and event schemas.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import { ClampRuleEntity } from "@studnicky/config/entities";
```

## Public entrypoints

| Import path                  | Use it when                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `@studnicky/config/node`     | A Northstar Books server or worker needs runtime configuration intake, clamping, and errors.     |
| `@studnicky/config/browser`  | A browser bundle needs the same configuration primitive; it is a runtime alternative to `/node`. |
| `@studnicky/config/entities` | A consumer needs configuration schemas as contracts at the intake boundary.                      |

## Exports

| Symbol               | Purpose                                     | Import path              |
| -------------------- | ------------------------------------------- | ------------------------ |
| `ClampedConfig`      | Applies declarative numeric clamping rules. | `@studnicky/config/node` |
| `ConfigurationError` | Represents invalid configuration values.    | `@studnicky/config/node` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/config)
