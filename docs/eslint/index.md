---
title: ESLint Plugins
description: '@studnicky ESLint plugins — configuration rules and V8 performance rules for TypeScript projects.'
---

# ESLint Plugins

`@studnicky/eslint-config` ships two custom ESLint plugins:

- **`@studnicky`** — Structural and semantic rules that enforce the substrate codebase doctrine.
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

Use `@studnicky/eslint-config/node` for Node-hosted ESLint and `@studnicky/eslint-config/browser` for a browser ESLint host. Both paths export the same values: `plugin`, `v8Plugin`, `entityModelSuite`, `moduleDesignSuite`, `diagnosticsSuite`, `VocabularySuite`, `classMechanicsSuite`, `LayerBoundarySuite`, `v8ObjectShapeSuite`, `v8CollectionTraversalSuite`, and `v8RepeatedWorkSuite`. Import `ProjectHostInterface` from `@studnicky/eslint-config/interfaces` when a browser host provides project services.

Every rule and suite works identically from either import path today — the split exists so a browser host can depend on a package that never imports Node built-ins, not because any suite here requires a full TypeScript program a browser host cannot supply. A rule that genuinely needs one (for example, one resolving cross-package type exports) says so in its own doc page.

## Browser hosts

Use the browser entrypoint with a browser ESLint host. Project-aware rules read the host supplied through the `@studnicky/projectHost` setting.

<!-- inline-ts-ok: browser ESLint hosts supply project services -->
```ts
import { plugin } from '@studnicky/eslint-config/browser';
import type { ProjectHostInterface } from '@studnicky/eslint-config/interfaces';

declare const projectHost: ProjectHostInterface;

export default [
  {
    settings: { '@studnicky/projectHost': projectHost },
    plugins: { '@studnicky': plugin }
  }
];
```

## Suites are opt-in

A suite is a flat-config entry bundling one domain's rules at `error`. Spreading a suite is a
deliberate choice to adopt that whole domain; registering `plugin` alone enables nothing. A static
suite is a plain config object; a factory suite needs project-specific options its member rules
cannot default, and is created with `.create(...)`.

| Suite | Domain |
|---|---|
| `entityModelSuite` | Type, interface, entity-namespace, and keyed-collection conventions — `all-types-are-entities`, `entity-file-shape`, `interface-must-be-contract`, `interfaces-compose-named-types`, `no-double-assertion`, `no-mixed-callable-shapes`, `no-redefined-external-types`, `no-unparsed-assertion`, `prefer-collection-types`, `type-alias-invariants` |
| `moduleDesignSuite` | Export shape and method-body conventions — `explicit-return-binding`, `export-shape`, `inline-trivial-logic`, `no-function-registries`, `require-options-object` |
| `diagnosticsSuite` | Diagnostic suppression — `clean-diagnostics` |
| `VocabularySuite` | Identifier and vocabulary conventions — `descriptive-identifiers`, `static-method-verbs`, `no-threaded-vocabulary`. A factory: call `VocabularySuite.create(...)` with a `sourceRoot`, since `no-threaded-vocabulary` has no default for it. |
| `classMechanicsSuite` | Class-mechanics conventions — `lexical-this-only`, `hash-private-fields`, `direct-invocation-only` |
| `LayerBoundarySuite` | Hexagonal-architecture and entity-intake boundaries — `adapter-only-import`, `domain-purity`, `intake-parse-only`, `known-types-outside-adapters`, `layer-import-boundary`, `no-circular-imports`, `no-reflect-argument-laundering`, `no-unchecked-overload-implementation`. A factory, not a static config: call `LayerBoundarySuite.create(...)` with the shared layer config, since four of the eight rules take distinct extra options on top of a common `layers`/`sourceRoot` shape, `intake-parse-only` takes its own unrelated options, and the remaining three take none. |
| `v8ObjectShapeSuite` | Constructs that destabilize V8 hidden-class/inline-cache assumptions — see the [V8 rules](#v8-rules) table |
| `v8CollectionTraversalSuite` | How a collection is walked, not how often — see the [V8 rules](#v8-rules) table |
| `v8RepeatedWorkSuite` | Cost that compounds per hot-loop iteration — see the [V8 rules](#v8-rules) table |

Enable individual rules instead when a domain's conventions do not apply. `type-alias-invariants`
governs how a type alias establishes schema provenance and stands on its own;
`all-types-are-entities` additionally requires every canonical alias to be the exported `Type`
member of an `*Entity` namespace, which is a convention a consumer adopts by enabling
`entityModelSuite`, not a prerequisite for the other rules.

```js
// eslint.config.mjs — one rule, without the entity conventions
import { plugin } from '@studnicky/eslint-config/node';

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
import { plugin, v8Plugin } from '@studnicky/eslint-config/node';

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
import { plugin, v8Plugin } from '@studnicky/eslint-config/node';

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
import { plugin, v8Plugin } from '@studnicky/eslint-config/node';

export default [
  {
    plugins: {
      '@studnicky': plugin,
      '@studnicky/v8': v8Plugin
    },
    rules: {
      '@studnicky/export-shape': 'error',
      '@studnicky/v8/delete-property': 'error'
    }
  }
];
```

## Configuration rules

31 rules that enforce structural, semantic, and stylistic constraints.

| Rule | Fixable | Severity |
|------|---------|----------|
| [`@studnicky/adapter-only-import`](/eslint/rules/adapter-only-import) | No | `error` |
| [`@studnicky/all-types-are-entities`](/eslint/rules/all-types-are-entities) | No | `error` |
| [`@studnicky/clean-diagnostics`](/eslint/rules/clean-diagnostics) | Yes | `error` |
| [`@studnicky/descriptive-identifiers`](/eslint/rules/descriptive-identifiers) | No | `error` |
| [`@studnicky/direct-invocation-only`](/eslint/rules/direct-invocation-only) | No | `error` |
| [`@studnicky/domain-purity`](/eslint/rules/domain-purity) | No | `error` |
| [`@studnicky/entity-file-shape`](/eslint/rules/entity-file-shape) | No | `error` |
| [`@studnicky/explicit-return-binding`](/eslint/rules/explicit-return-binding) | No | `error` |
| [`@studnicky/export-shape`](/eslint/rules/export-shape) | No | `error` |
| [`@studnicky/hash-private-fields`](/eslint/rules/hash-private-fields) | No | `error` |
| [`@studnicky/inline-trivial-logic`](/eslint/rules/inline-trivial-logic) | Yes | `error` |
| [`@studnicky/intake-parse-only`](/eslint/rules/intake-parse-only) | No | `error` |
| [`@studnicky/interface-must-be-contract`](/eslint/rules/interface-must-be-contract) | Yes | `error` |
| [`@studnicky/interfaces-compose-named-types`](/eslint/rules/interfaces-compose-named-types) | No | `error` |
| [`@studnicky/known-types-outside-adapters`](/eslint/rules/known-types-outside-adapters) | No | `error` |
| [`@studnicky/layer-import-boundary`](/eslint/rules/layer-import-boundary) | No | `error` |
| [`@studnicky/lexical-this-only`](/eslint/rules/lexical-this-only) | No | `error` |
| [`@studnicky/no-circular-imports`](/eslint/rules/no-circular-imports) | No | `error` |
| [`@studnicky/no-double-assertion`](/eslint/rules/no-double-assertion) | No | `error` |
| [`@studnicky/no-function-registries`](/eslint/rules/no-function-registries) | No | `error` |
| [`@studnicky/no-mixed-callable-shapes`](/eslint/rules/no-mixed-callable-shapes) | No | `error` |
| [`@studnicky/no-caller-chosen-guard-type`](/eslint/rules/no-caller-chosen-guard-type) | No | `error` |
| [`@studnicky/no-redefined-external-types`](/eslint/rules/no-redefined-external-types) | No | `error` |
| [`@studnicky/no-reflect-argument-laundering`](/eslint/rules/no-reflect-argument-laundering) | No | `error` |
| [`@studnicky/no-threaded-vocabulary`](/eslint/rules/no-threaded-vocabulary) | No | `error` |
| [`@studnicky/no-unchecked-overload-implementation`](/eslint/rules/no-unchecked-overload-implementation) | No | `error` |
| [`@studnicky/no-unparsed-assertion`](/eslint/rules/no-unparsed-assertion) | No | `error` |
| [`@studnicky/prefer-collection-types`](/eslint/rules/prefer-collection-types) | No | `warn` |
| [`@studnicky/require-options-object`](/eslint/rules/require-options-object) | No | `error` |
| [`@studnicky/static-method-verbs`](/eslint/rules/static-method-verbs) | No | `error` |
| [`@studnicky/type-alias-invariants`](/eslint/rules/type-alias-invariants) | Partial | `error` |

## V8 rules

27 rules covering V8 optimization-sensitive allocation, object-shape, iteration, and dynamic-code patterns, alongside related source constraints where measurement does not establish a V8 cost. Grouped into three suites by what each rule protects against.

### Object shape — `v8ObjectShapeSuite`

Constructs that destabilize V8 hidden-class and inline-cache assumptions.

| Rule | Fixable | Severity |
|------|---------|----------|
| [`@studnicky/v8/arguments-object`](/eslint/rules/v8/arguments-object) | No | `error` |
| [`@studnicky/v8/computed-class-properties`](/eslint/rules/v8/computed-class-properties) | No | `error` |
| [`@studnicky/v8/computed-object-properties`](/eslint/rules/v8/computed-object-properties) | No | `error` |
| [`@studnicky/v8/conditional-property-assignment`](/eslint/rules/v8/conditional-property-assignment) | No | `error` |
| [`@studnicky/v8/define-property`](/eslint/rules/v8/define-property) | No | `error` |
| [`@studnicky/v8/delete-property`](/eslint/rules/v8/delete-property) | No | `error` |
| [`@studnicky/v8/dynamic-property-access`](/eslint/rules/v8/dynamic-property-access) | No | `error` |
| [`@studnicky/v8/eval-function`](/eslint/rules/v8/eval-function) | No | `error` |
| [`@studnicky/v8/object-spread`](/eslint/rules/v8/object-spread) | No | `error` |
| [`@studnicky/v8/prototype-modification`](/eslint/rules/v8/prototype-modification) | No | `error` |
| [`@studnicky/v8/with-statement`](/eslint/rules/v8/with-statement) | No | `error` |

### Collection traversal — `v8CollectionTraversalSuite`

How a collection is walked, not how often.

| Rule | Fixable | Severity |
|------|---------|----------|
| [`@studnicky/v8/array-from-iterators`](/eslint/rules/v8/array-from-iterators) | No | `error` |
| [`@studnicky/v8/array-from-map-callback`](/eslint/rules/v8/array-from-map-callback) | No | `error` |
| [`@studnicky/v8/chained-array-iteration`](/eslint/rules/v8/chained-array-iteration) | No | `error` |
| [`@studnicky/v8/for-in-loops`](/eslint/rules/v8/for-in-loops) | No | `error` |
| [`@studnicky/v8/for-of-arrays`](/eslint/rules/v8/for-of-arrays) | No | `error` |

### Repeated work — `v8RepeatedWorkSuite`

Cost that compounds per hot-loop iteration.

| Rule | Fixable | Severity |
|------|---------|----------|
| [`@studnicky/v8/array-concat-outside-loops`](/eslint/rules/v8/array-concat-outside-loops) | No | `error` |
| [`@studnicky/v8/array-scan-outside-loops`](/eslint/rules/v8/array-scan-outside-loops) | No | `error` |
| [`@studnicky/v8/array-splice-outside-loops`](/eslint/rules/v8/array-splice-outside-loops) | No | `error` |
| [`@studnicky/v8/array-spread-outside-loops`](/eslint/rules/v8/array-spread-outside-loops) | No | `error` |
| [`@studnicky/v8/inline-arrow-functions`](/eslint/rules/v8/inline-arrow-functions) | No | `error` |
| [`@studnicky/v8/inline-functions`](/eslint/rules/v8/inline-functions) | No | `error` |
| [`@studnicky/v8/max-switch-cases`](/eslint/rules/v8/max-switch-cases) | No | `error` |
| [`@studnicky/v8/memoize-array-length`](/eslint/rules/v8/memoize-array-length) | No | `error` |
| [`@studnicky/v8/regexp-in-loops`](/eslint/rules/v8/regexp-in-loops) | No | `error` |
| [`@studnicky/v8/switch-statements`](/eslint/rules/v8/switch-statements) | No | `error` |
| [`@studnicky/v8/try-catch-in-loops`](/eslint/rules/v8/try-catch-in-loops) | No | `error` |
