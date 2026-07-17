---
title: ESLint Plugins
description: '@studnicky ESLint plugins — configuration rules and V8 performance rules for TypeScript projects.'
---

# ESLint Plugins

`@studnicky/eslint-config` ships two custom ESLint plugins:

- **`@studnicky`** — 22 structural and semantic rules that enforce the substrate codebase doctrine.
- **`@studnicky/v8`** — 24 V8 performance rules that flag patterns preventing V8 from using optimized code paths.

Register both plugins in your flat config to enable the rules.

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
| `@studnicky/eslint-config` | `plugin`, `v8Plugin`, and all individual rule modules |
| `@studnicky/eslint-config/plugin` | `plugin` (the `@studnicky` ESLint plugin object) |
| `@studnicky/eslint-config/v8` | `v8Plugin` (the `@studnicky/v8` ESLint plugin object) |

## Usage

Import `plugin` and `v8Plugin` and register them in a flat-config entry:

```js
// eslint.config.mjs
import { plugin, v8Plugin } from '@studnicky/eslint-config';

export default [
  {
    plugins: { '@studnicky': plugin, '@studnicky/v8': v8Plugin },
    rules: {
      '@studnicky/type-alias-invariants': 'error',
      '@studnicky/v8/array-spread-outside-loops': 'error'
    }
  }
];
```

Combine with additional rules in the same entry:

```js
// eslint.config.mjs
import { plugin, v8Plugin } from '@studnicky/eslint-config';

export default [
  {
    plugins: { '@studnicky': plugin, '@studnicky/v8': v8Plugin },
    rules: {
      '@studnicky/type-alias-invariants': 'error',
      '@studnicky/v8/array-spread-outside-loops': 'error',
      'no-console': 'warn'
    }
  }
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

22 rules that enforce structural, semantic, and stylistic constraints.

| Rule | Fixable | Severity |
|------|---------|----------|
| [`@studnicky/adapter-only-import`](/eslint/rules/adapter-only-import) | No | `error` |
| [`@studnicky/all-types-are-entities`](/eslint/rules/all-types-are-entities) | No | `error` |
| [`@studnicky/canonical-export-names`](/eslint/rules/canonical-export-names) | No | `error` |
| [`@studnicky/clean-diagnostics`](/eslint/rules/clean-diagnostics) | Yes | `error` |
| [`@studnicky/descriptive-identifiers`](/eslint/rules/descriptive-identifiers) | No | `error` |
| [`@studnicky/direct-invocation-only`](/eslint/rules/direct-invocation-only) | No | `error` |
| [`@studnicky/domain-purity`](/eslint/rules/domain-purity) | No | `error` |
| [`@studnicky/folder-content-shape`](/eslint/rules/folder-content-shape) | No | `error` |
| [`@studnicky/hash-private-fields`](/eslint/rules/hash-private-fields) | No | `error` |
| [`@studnicky/inline-trivial-logic`](/eslint/rules/inline-trivial-logic) | Yes | `error` |
| [`@studnicky/interface-must-be-contract`](/eslint/rules/interface-must-be-contract) | Yes | `error` |
| [`@studnicky/interface-suffix`](/eslint/rules/interface-suffix) | No | `error` |
| [`@studnicky/interfaces-compose-named-types`](/eslint/rules/interfaces-compose-named-types) | No | `error` |
| [`@studnicky/known-types-outside-adapters`](/eslint/rules/known-types-outside-adapters) | No | `error` |
| [`@studnicky/layer-import-boundary`](/eslint/rules/layer-import-boundary) | No | `error` |
| [`@studnicky/lexical-this-only`](/eslint/rules/lexical-this-only) | No | `error` |
| [`@studnicky/prefer-collection-types`](/eslint/rules/prefer-collection-types) | No | `warn` |
| [`@studnicky/require-options-object`](/eslint/rules/require-options-object) | No | `error` |
| [`@studnicky/single-export`](/eslint/rules/single-export) | No | `error` |
| [`@studnicky/static-method-verbs`](/eslint/rules/static-method-verbs) | No | `error` |
| [`@studnicky/type-alias-invariants`](/eslint/rules/type-alias-invariants) | Partial | `error` |
| [`@studnicky/whole-canonical-types`](/eslint/rules/whole-canonical-types) | No | `error` |

## V8 performance rules

24 rules that flag patterns preventing V8 from using optimized code paths.

| Rule | Fixable | Severity |
|------|---------|----------|
| [`@studnicky/v8/arguments-object`](/eslint/rules/v8/arguments-object) | No | `error` |
| [`@studnicky/v8/array-concat-outside-loops`](/eslint/rules/v8/array-concat-outside-loops) | No | `error` |
| [`@studnicky/v8/array-from-iterators`](/eslint/rules/v8/array-from-iterators) | No | `error` |
| [`@studnicky/v8/array-from-map-callback`](/eslint/rules/v8/array-from-map-callback) | No | `error` |
| [`@studnicky/v8/array-spread-outside-loops`](/eslint/rules/v8/array-spread-outside-loops) | No | `error` |
| [`@studnicky/v8/computed-class-properties`](/eslint/rules/v8/computed-class-properties) | No | `error` |
| [`@studnicky/v8/computed-object-properties`](/eslint/rules/v8/computed-object-properties) | No | `error` |
| [`@studnicky/v8/conditional-property-assignment`](/eslint/rules/v8/conditional-property-assignment) | No | `error` |
| [`@studnicky/v8/define-property`](/eslint/rules/v8/define-property) | No | `error` |
| [`@studnicky/v8/delete-property`](/eslint/rules/v8/delete-property) | No | `error` |
| [`@studnicky/v8/dynamic-property-access`](/eslint/rules/v8/dynamic-property-access) | No | `error` |
| [`@studnicky/v8/eval-function`](/eslint/rules/v8/eval-function) | No | `error` |
| [`@studnicky/v8/for-in-loops`](/eslint/rules/v8/for-in-loops) | No | `error` |
| [`@studnicky/v8/for-of-arrays`](/eslint/rules/v8/for-of-arrays) | No | `error` |
| [`@studnicky/v8/inline-arrow-functions`](/eslint/rules/v8/inline-arrow-functions) | No | `error` |
| [`@studnicky/v8/inline-functions`](/eslint/rules/v8/inline-functions) | No | `error` |
| [`@studnicky/v8/max-switch-cases`](/eslint/rules/v8/max-switch-cases) | No | `error` |
| [`@studnicky/v8/memoize-array-length`](/eslint/rules/v8/memoize-array-length) | No | `error` |
| [`@studnicky/v8/object-spread`](/eslint/rules/v8/object-spread) | No | `error` |
| [`@studnicky/v8/prototype-modification`](/eslint/rules/v8/prototype-modification) | No | `error` |
| [`@studnicky/v8/regexp-in-loops`](/eslint/rules/v8/regexp-in-loops) | No | `error` |
| [`@studnicky/v8/switch-statements`](/eslint/rules/v8/switch-statements) | No | `error` |
| [`@studnicky/v8/try-catch-in-loops`](/eslint/rules/v8/try-catch-in-loops) | No | `error` |
| [`@studnicky/v8/with-statement`](/eslint/rules/v8/with-statement) | No | `error` |
