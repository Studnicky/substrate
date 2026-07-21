---
title: '@studnicky/flag-evaluator'
description: Local deterministic feature-flag evaluation with percentage rollout and observability hooks.
---

# @studnicky/flag-evaluator

> Local deterministic feature-flag evaluation with percentage rollout and observability hooks.

## Install

```bash
pnpm add @studnicky/flag-evaluator
```

## Usage

Register named boolean flag definitions (`enabled`, optional `rolloutPercent`, `defaultValue`) and resolve each `evaluate()` call deterministically via `@studnicky/json`'s `Hash` — the same flag and targeting key always land in the same rollout bucket:

<<< ../../packages/flag-evaluator/examples/observedFlagEvaluator.ts#usage

## Unregistered vs. disabled

- **Unregistered**: `evaluate()` returns `false` unconditionally and fires `onDefault(name)`. There is no per-call default-value override.
- **Registered, `enabled: false`**: `evaluate()` returns the registered `definition.defaultValue`.
- **Registered, `enabled: true`**: `evaluate()` buckets `context.targetingKey` deterministically into `[0, 100)` — hashing `name + ':' + targetingKey` via `Hash.value()`, parsing the resulting hex digest as a base-16 integer, and reducing it `% 100` — and returns `bucket < (definition.rolloutPercent ?? 100)`.

| Method | Description |
|--------|-------------|
| `FlagEvaluator.create()` | Creates an empty evaluator |
| `register(name, definition)` | Registers (or replaces) a named flag: `{ enabled, rolloutPercent?, defaultValue }` |
| `unregister(name)` | Removes a named flag; no-op if it was never registered |
| `has(name)` | Whether a flag is currently registered under `name` |
| `list()` | The names of every currently registered flag |
| `evaluate(name, context)` | Resolves a boolean decision for `name` given `context: { targetingKey?, ...arbitrary }` |

`FlagContextEntity` owns the optional schema-derived `targetingKey` field. `FlagContextInterface` composes that field and remains open to application-specific context values.

## Hooks

| Hook | Fires |
|------|-------|
| `onEvaluate(flag, context, result)` | After every resolution, on every path, as the last thing before `evaluate()` returns |
| `onDefault(flag)` | When `evaluate()` is called for a flag name that was never registered |
| `onRuleMismatch(flag, context)` | When an enabled flag's rollout bucket falls outside the enabled range (rollout exclusion only — never fires for a disabled flag) |

## Scope

`FlagEvaluator` owns only local, in-process flag resolution — no HTTP client, no background polling, no vendor SDK. This is the exact "local flag evaluation" core that OpenFeature's spec separates from its remote `Provider`; fetching flag definitions from a remote source and calling `register()` with the results is entirely a consuming application's concern.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/flag-evaluator

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/flag-evaluator)
