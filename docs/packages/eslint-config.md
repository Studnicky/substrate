---
title: "@studnicky/eslint-config"
description: ESLint rules and flat-config suites for TypeScript projects.
---

# @studnicky/eslint-config

> 59 ESLint rules: 32 structural and semantic `@studnicky` rules and 27 `@studnicky/v8` performance rules.

## What it is

A composable ESLint plugin and flat-config-suite package for TypeScript structure, semantic boundaries, diagnostics, and V8-oriented performance rules. It supplies static-analysis building blocks; consumers select the rules and architecture vocabulary that fit their own codebase.

## What it is for

Northstar Books uses it to encode its package-boundary, entity-intake, and runtime-performance conventions in CI and local development. Consumers decide which suites apply and what their domain layers mean; the package does not implement a bookstore service or development workflow.

## Northstar Books examples

The runnable platform-call-policy example inspects the browser-safe default policy data. It maps to Northstar Books reviewing which platform calls its storefront may use, proving that policy data is portable while compiler-backed plugins and suites remain a Node-hosted ESLint integration.

## Public entrypoints

| Import path                           | Use it when                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `@studnicky/eslint-config/node`       | Northstar Books configures ESLint plugins and flat-config suites in its Node-hosted toolchain. |
| `@studnicky/eslint-config/browser`    | A browser-oriented consumer reads the published browser-safe platform-call policy data.        |
| `@studnicky/eslint-config/interfaces` | TypeScript tooling implements or accepts the project-host contract for project-aware rules.    |

## Install

Add the GitHub Packages registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add -D @studnicky/eslint-config
```

Install the peer dependencies:

```sh
pnpm add -D eslint@>=10 typescript-eslint@>=8 @typescript-eslint/eslint-plugin@>=8 @typescript-eslint/parser@>=8 @stylistic/eslint-plugin@>=5 eslint-plugin-import-x@>=4 eslint-plugin-perfectionist@>=5 eslint-plugin-regexp@>=3 eslint-plugin-unused-imports@>=4 typescript@>=6
```

## Import paths

Use `/node` for the ESLint plugins and flat-config suites. `/browser` exports `PlatformCallDefaults`, the browser-safe platform-call policy data. The browser entry does not export plugins or suites because those rules execute the TypeScript compiler API.

Use `/interfaces` for `ProjectHostInterface`, the shared host contract for Node-hosted project-aware rules.

## Node usage

```js
// eslint.config.mjs
import { plugin, v8Plugin } from "@studnicky/eslint-config/node";

export default [
  {
    plugins: { "@studnicky": plugin, "@studnicky/v8": v8Plugin },
    rules: {
      "@studnicky/type-alias-invariants": "error",
      "@studnicky/v8/array-spread-outside-loops": "error",
    },
  },
];
```

## Browser surface

Import `PlatformCallDefaults` from the browser entrypoint when a browser application needs the published platform-call policy data. Configure ESLint plugins and suites through `/node`. The runnable example below builds and inspects that policy.

## Try it

The browser bundle doesn't ship any ESLint plugin — it ships the policy data those plugins check against, so a storefront team can see exactly which platform calls are restricted without pulling in the TypeScript compiler. This example builds the default policy list and looks up the entry for a bare `fetch()` call, confirming it's flagged as never safe even when called with a literal argument.

<<< ../../packages/eslint-config/examples/configUsage.ts#usage

<RunnableExample src="packages/eslint-config/examples/configUsage" title="Inspecting browser-safe platform-call policy" />

## Suites

`entityModelSuite`, `moduleDesignSuite`, `diagnosticsSuite`, `classMechanicsSuite`, `v8ObjectShapeSuite`, `v8CollectionTraversalSuite`, and `v8RepeatedWorkSuite` are flat-config entries. `VocabularySuite.create(...)` and `LayerBoundarySuite.create(...)` create entries from project-specific options their member rules cannot default.

```js
import {
  classMechanicsSuite,
  diagnosticsSuite,
  entityModelSuite,
  LayerBoundarySuite,
  moduleDesignSuite,
  v8CollectionTraversalSuite,
  v8ObjectShapeSuite,
  v8RepeatedWorkSuite,
  VocabularySuite,
} from "@studnicky/eslint-config/node";

export default [
  entityModelSuite,
  moduleDesignSuite,
  diagnosticsSuite,
  classMechanicsSuite,
  v8ObjectShapeSuite,
  v8CollectionTraversalSuite,
  v8RepeatedWorkSuite,
  VocabularySuite.create({ sourceRoot: "src" }),
  LayerBoundarySuite.create({
    layers: ["domain", "application", "adapters"],
    sourceRoot: "src",
    domainPurity: { forbiddenImports: ["fs", "axios"] },
  }),
];
```

## Rule reference

- [ESLint Plugins Overview](/eslint/) — registration and rule tables
- [Configuration rules](/eslint/) — 32 `@studnicky` rules
- [V8 performance rules](/eslint/) — 27 `@studnicky/v8` rules

## Exports

| Symbol                       | Purpose                                                                                                               | Import path                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `PlatformCallDefaults`       | Builds the default `platformCalls` list of `@studnicky/no-native-error`, for configurations that extend or filter it. | `@studnicky/eslint-config/node`       |
| `plugin`                     | Provides the `@studnicky` ESLint plugin.                                                                              | `@studnicky/eslint-config/node`       |
| `v8Plugin`                   | Provides the `@studnicky/v8` ESLint plugin.                                                                           | `@studnicky/eslint-config/node`       |
| `entityModelSuite`           | Provides type/interface/entity-namespace shape, naming, location, and keyed-collection rules.                         | `@studnicky/eslint-config/node`       |
| `moduleDesignSuite`          | Provides export-shape, return-binding, function-registry, and options-object rules.                                   | `@studnicky/eslint-config/node`       |
| `diagnosticsSuite`           | Rejects inline lint configuration and diagnostic suppression.                                                         | `@studnicky/eslint-config/node`       |
| `VocabularySuite`            | Creates identifier, static-method-verb, and closed-vocabulary rules.                                                  | `@studnicky/eslint-config/node`       |
| `classMechanicsSuite`        | Provides lexical-`this`, private-field, and direct-invocation rules.                                                  | `@studnicky/eslint-config/node`       |
| `LayerBoundarySuite`         | Creates hexagonal-architecture layer-boundary and entity-intake-boundary rules.                                       | `@studnicky/eslint-config/node`       |
| `v8ObjectShapeSuite`         | Provides hidden-class/inline-cache stability rules.                                                                   | `@studnicky/eslint-config/node`       |
| `v8CollectionTraversalSuite` | Provides collection-traversal rules.                                                                                  | `@studnicky/eslint-config/node`       |
| `v8RepeatedWorkSuite`        | Provides hot-loop repeated-work rules.                                                                                | `@studnicky/eslint-config/node`       |
| `ProjectHostInterface`       | Defines project services for project-aware rules.                                                                     | `@studnicky/eslint-config/interfaces` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/eslint-config)
