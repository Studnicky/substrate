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

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/config)
