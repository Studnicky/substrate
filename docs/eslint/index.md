---
title: ESLint Plugins
description: '@studnicky ESLint plugins — configuration rules and V8 performance rules for TypeScript projects.'
---

# ESLint Plugins

`@studnicky/eslint-config` ships two custom ESLint plugins alongside the shared flat config factory:

- **`@studnicky`** — 14 structural and semantic rules that enforce the substrate codebase doctrine.
- **`@studnicky/v8`** — 16 V8 performance rules that flag patterns preventing V8 from using optimized code paths.

Both plugins are registered automatically when using `createEslintConfig()`.

## Install

Add the GitHub Packages registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

Then install the package:

```sh
pnpm add -D @studnicky/eslint-config
```

Install peer dependencies:

```sh
pnpm add -D eslint@>=10 typescript-eslint@>=8 @typescript-eslint/eslint-plugin@>=8 @typescript-eslint/parser@>=8 @stylistic/eslint-plugin@>=5 eslint-plugin-import-x@>=4 eslint-plugin-perfectionist@>=5 eslint-plugin-regexp@>=3 eslint-plugin-unused-imports@>=4 typescript@>=6
```

## Subpath exports

| Subpath | Exports |
|---------|---------|
| `@studnicky/eslint-config` | `createEslintConfig`, `plugin`, `v8Plugin`, and all individual rule modules |
| `@studnicky/eslint-config/plugin` | `plugin` (the `@studnicky` ESLint plugin object) |
| `@studnicky/eslint-config/v8` | `v8Plugin` (the `@studnicky/v8` ESLint plugin object) |

## Using the factory

Pass the factory result directly as your flat config:

<!-- inline-ts-ok: eslint rule example -->
```ts
// eslint.config.ts
import { createEslintConfig } from '@studnicky/eslint-config';

export default createEslintConfig({ tsconfigRootDir: import.meta.dirname });
```

Spread to extend with additional rules:

<!-- inline-ts-ok: eslint rule example -->
```ts
// eslint.config.ts
import { createEslintConfig } from '@studnicky/eslint-config';

export default [
  ...createEslintConfig({ tsconfigRootDir: import.meta.dirname }),
  { rules: { 'no-console': 'warn' } }
];
```

## Using the plugins directly

Import the raw plugin objects for hand-rolled flat config:

<!-- inline-ts-ok: eslint rule example -->
```ts
// eslint.config.ts
import { plugin, v8Plugin } from '@studnicky/eslint-config';

export default [
  {
    plugins: {
      '@studnicky': plugin,
      '@studnicky/v8': v8Plugin
    },
    rules: {
      '@studnicky/single-export': 'error',
      '@studnicky/v8/delete-property': 'error'
    }
  }
];
```

Or import from the dedicated subpath exports:

<!-- inline-ts-ok: eslint rule example -->
```ts
import { plugin } from '@studnicky/eslint-config/plugin';
import { v8Plugin } from '@studnicky/eslint-config/v8';
```

## Configuration rules

14 rules that enforce structural, semantic, and stylistic constraints.

| Rule | Fixable | Severity |
|------|---------|----------|
| [`@studnicky/entity-namespace`](/eslint/rules/entity-namespace) | No | `error` |
| [`@studnicky/interface-must-be-contract`](/eslint/rules/interface-must-be-contract) | No | `error` |
| [`@studnicky/no-bind-apply-call`](/eslint/rules/no-bind-apply-call) | No | `error` |
| [`@studnicky/no-export-alias`](/eslint/rules/no-export-alias) | No | `error` |
| [`@studnicky/no-freestanding-verb-noun`](/eslint/rules/no-freestanding-verb-noun) | No | `error` |
| [`@studnicky/no-prefer-existing-type`](/eslint/rules/no-prefer-existing-type) | No | `error` |
| [`@studnicky/no-suppression-comments`](/eslint/rules/no-suppression-comments) | Yes | `error` |
| [`@studnicky/no-this-alias`](/eslint/rules/no-this-alias) | No | `error` |
| [`@studnicky/no-trivial-shim`](/eslint/rules/no-trivial-shim) | Yes | `error` |
| [`@studnicky/no-type-aliasing`](/eslint/rules/no-type-aliasing) | No | `error` |
| [`@studnicky/prefer-collection-types`](/eslint/rules/prefer-collection-types) | No | `warn` |
| [`@studnicky/require-options-object`](/eslint/rules/require-options-object) | No | `error` |
| [`@studnicky/single-export`](/eslint/rules/single-export) | No | `error` |
| [`@studnicky/type-alias-must-end-type`](/eslint/rules/type-alias-must-end-type) | No | `error` |

## V8 performance rules

16 rules that flag patterns preventing V8 from using optimized code paths.

| Rule | Fixable | Severity |
|------|---------|----------|
| [`@studnicky/v8/arguments-object`](/eslint/rules/v8/arguments-object) | No | `error` |
| [`@studnicky/v8/array-from-iterators`](/eslint/rules/v8/array-from-iterators) | No | `error` |
| [`@studnicky/v8/computed-class-properties`](/eslint/rules/v8/computed-class-properties) | No | `error` |
| [`@studnicky/v8/computed-object-properties`](/eslint/rules/v8/computed-object-properties) | No | `error` |
| [`@studnicky/v8/define-property`](/eslint/rules/v8/define-property) | No | `error` |
| [`@studnicky/v8/delete-property`](/eslint/rules/v8/delete-property) | No | `error` |
| [`@studnicky/v8/eval-function`](/eslint/rules/v8/eval-function) | No | `error` |
| [`@studnicky/v8/for-in-loops`](/eslint/rules/v8/for-in-loops) | No | `error` |
| [`@studnicky/v8/for-of-arrays`](/eslint/rules/v8/for-of-arrays) | No | `error` |
| [`@studnicky/v8/no-concat-in-loops`](/eslint/rules/v8/no-concat-in-loops) | No | `error` |
| [`@studnicky/v8/no-spread-in-loops`](/eslint/rules/v8/no-spread-in-loops) | No | `error` |
| [`@studnicky/v8/prototype-modification`](/eslint/rules/v8/prototype-modification) | No | `error` |
| [`@studnicky/v8/regexp-in-loops`](/eslint/rules/v8/regexp-in-loops) | No | `error` |
| [`@studnicky/v8/switch-statements`](/eslint/rules/v8/switch-statements) | No | `error` |
| [`@studnicky/v8/try-catch-in-loops`](/eslint/rules/v8/try-catch-in-loops) | No | `error` |
| [`@studnicky/v8/with-statement`](/eslint/rules/v8/with-statement) | No | `error` |
