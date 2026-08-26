---
title: ESLint Plugins
description: '@studnicky ESLint plugins — configuration rules and V8 performance rules for TypeScript projects.'
---

# ESLint Plugins

`@studnicky/eslint-config` ships two custom ESLint plugins:

- **`@studnicky`** — 22 structural and semantic rules that enforce the substrate codebase doctrine.
- **`@studnicky/v8`** — 27 rules for V8 optimization-sensitive code and the related constructs the codebase constrains consistently.

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

## Public API

The package root exports `plugin`, `v8Plugin`, `entitySuite`, `hygieneSuite`, `v8Suite`, and
`HexagonalSuite`. Individual rule implementations stay on their plugin objects: use
`plugin.rules['single-export']` or `v8Plugin.rules['delete-property']` when programmatic
rule access is required.

## Suites are opt-in

A suite is a flat-config entry bundling one domain's rules at `error`. Spreading a suite is a
deliberate choice to adopt that whole domain; registering `plugin` alone enables nothing.

| Suite | Domain |
|---|---|
| `entitySuite` | Entity and data-shape conventions — `all-types-are-entities`, `folder-content-shape`, `interface-must-be-contract`, `interface-suffix`, `interfaces-compose-named-types`, `no-mixed-callable-shapes`, `type-alias-invariants`, `whole-canonical-types` |
| `hygieneSuite` | General code hygiene — `canonical-export-names`, `clean-diagnostics`, `descriptive-identifiers`, `direct-invocation-only`, `hash-private-fields`, `inline-trivial-logic`, `lexical-this-only`, `prefer-collection-types`, `require-options-object`, `single-export`, `static-method-verbs` |
| `v8Suite` | V8 performance rules — all 27 rules in the [V8 rules](#v8-rules) table below |
| `HexagonalSuite` | Hexagonal-architecture import boundaries — `adapter-only-import`, `domain-purity`, `known-types-outside-adapters`, `layer-import-boundary`. A factory, not a static config: call `HexagonalSuite.create(...)` with the shared layer config, since all four rules take distinct extra options on top of a common `layers`/`sourceRoot` shape. |

Enable individual rules instead when a domain's conventions do not apply. `type-alias-invariants`
governs how a type alias establishes schema provenance and stands on its own;
`all-types-are-entities` additionally requires every canonical alias to be the exported `Type`
member of an `*Entity` namespace, which is a convention a consumer adopts by enabling
`entitySuite`, not a prerequisite for the other rules.

```js
// eslint.config.mjs — one rule, without the entity conventions
import { plugin } from '@studnicky/eslint-config';

export default [
  {
    plugins: { '@studnicky': plugin },
    rules: { '@studnicky/type-alias-invariants': 'error' }
  }
];
```

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

## Configuration rules

26 rules that enforce structural, semantic, and stylistic constraints.

| Rule | Fixable | Severity |
|------|---------|----------|
| [`@studnicky/adapter-only-import`](/eslint/rules/adapter-only-import) | No | `error` |
| [`@studnicky/all-types-are-entities`](/eslint/rules/all-types-are-entities) | No | `error` |
| [`@studnicky/canonical-export-names`](/eslint/rules/canonical-export-names) | No | `error` |
| [`@studnicky/clean-diagnostics`](/eslint/rules/clean-diagnostics) | Yes | `error` |
| [`@studnicky/descriptive-identifiers`](/eslint/rules/descriptive-identifiers) | No | `error` |
| [`@studnicky/direct-invocation-only`](/eslint/rules/direct-invocation-only) | No | `error` |
| [`@studnicky/domain-purity`](/eslint/rules/domain-purity) | No | `error` |
| [`@studnicky/explicit-return-binding`](/eslint/rules/explicit-return-binding) | No | `error` |
| [`@studnicky/folder-content-shape`](/eslint/rules/folder-content-shape) | No | `error` |
| [`@studnicky/hash-private-fields`](/eslint/rules/hash-private-fields) | No | `error` |
| [`@studnicky/inline-trivial-logic`](/eslint/rules/inline-trivial-logic) | Yes | `error` |
| [`@studnicky/intake-parse-only`](/eslint/rules/intake-parse-only) | No | `error` |
| [`@studnicky/interface-must-be-contract`](/eslint/rules/interface-must-be-contract) | Yes | `error` |
| [`@studnicky/interface-suffix`](/eslint/rules/interface-suffix) | No | `error` |
| [`@studnicky/interfaces-compose-named-types`](/eslint/rules/interfaces-compose-named-types) | No | `error` |
| [`@studnicky/known-types-outside-adapters`](/eslint/rules/known-types-outside-adapters) | No | `error` |
| [`@studnicky/layer-import-boundary`](/eslint/rules/layer-import-boundary) | No | `error` |
| [`@studnicky/lexical-this-only`](/eslint/rules/lexical-this-only) | No | `error` |
| [`@studnicky/no-mixed-callable-shapes`](/eslint/rules/no-mixed-callable-shapes) | No | `error` |
| [`@studnicky/no-unparsed-assertion`](/eslint/rules/no-unparsed-assertion) | No | `error` |
| [`@studnicky/prefer-collection-types`](/eslint/rules/prefer-collection-types) | No | `warn` |
| [`@studnicky/require-options-object`](/eslint/rules/require-options-object) | No | `error` |
| [`@studnicky/single-export`](/eslint/rules/single-export) | No | `error` |
| [`@studnicky/static-method-verbs`](/eslint/rules/static-method-verbs) | No | `error` |
| [`@studnicky/type-alias-invariants`](/eslint/rules/type-alias-invariants) | Partial | `error` |
| [`@studnicky/whole-canonical-types`](/eslint/rules/whole-canonical-types) | No | `error` |

`@studnicky/explicit-return-binding`, `@studnicky/intake-parse-only`, and `@studnicky/no-unparsed-assertion` are not bundled into any suite above — the latter two share the same `exemptPackages` boundary-package list (parsing primitives and the compile engine every `intake` is built from). All three are adopted individually, alongside whichever suites a consumer chooses.

## V8 rules

27 rules covering V8 optimization-sensitive allocation, object-shape, iteration, and dynamic-code patterns, alongside related source constraints where measurement does not establish a V8 cost.

| Rule | Fixable | Severity |
|------|---------|----------|
| [`@studnicky/v8/arguments-object`](/eslint/rules/v8/arguments-object) | No | `error` |
| [`@studnicky/v8/array-concat-outside-loops`](/eslint/rules/v8/array-concat-outside-loops) | No | `error` |
| [`@studnicky/v8/array-from-iterators`](/eslint/rules/v8/array-from-iterators) | No | `error` |
| [`@studnicky/v8/array-from-map-callback`](/eslint/rules/v8/array-from-map-callback) | No | `error` |
| [`@studnicky/v8/array-scan-outside-loops`](/eslint/rules/v8/array-scan-outside-loops) | No | `error` |
| [`@studnicky/v8/array-splice-outside-loops`](/eslint/rules/v8/array-splice-outside-loops) | No | `error` |
| [`@studnicky/v8/array-spread-outside-loops`](/eslint/rules/v8/array-spread-outside-loops) | No | `error` |
| [`@studnicky/v8/chained-array-iteration`](/eslint/rules/v8/chained-array-iteration) | No | `error` |
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
