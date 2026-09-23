---
title: '@studnicky/eslint-config'
description: ESLint rules and flat-config suites for TypeScript projects.
---

# @studnicky/eslint-config

> 53 ESLint rules: 26 structural and semantic `@studnicky` rules and 27 `@studnicky/v8` performance rules.

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

Use `/node` in Node-hosted ESLint configuration. Use `/browser` with a browser ESLint host. Both paths export the same values: `plugin`, `v8Plugin`, `entityModelSuite`, `moduleDesignSuite`, `diagnosticsSuite`, `VocabularySuite`, `classMechanicsSuite`, `LayerBoundarySuite`, `v8ObjectShapeSuite`, `v8CollectionTraversalSuite`, and `v8RepeatedWorkSuite`.

Use `/interfaces` for `ProjectHostInterface`, the shared host contract for rules that inspect project files or resolve imports.

## Node usage

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

## Browser usage

Pass a project host through ESLint settings when rules need project files, import resolution, or builtin-module classification:

<!-- inline-ts-ok: browser ESLint hosts supply project services -->
```ts
import { plugin, v8Plugin } from '@studnicky/eslint-config/browser';
import type { ProjectHostInterface } from '@studnicky/eslint-config/interfaces';

const virtualFiles = new Map<string, string>();
const projectHost: ProjectHostInterface = {
  findPackageRoot(filename) { return filename.startsWith('/project/') ? '/project' : undefined; },
  isBuiltinSpecifier(specifier) { return specifier.startsWith('browser:'); },
  readTextFile(filename) { return virtualFiles.get(filename); },
  realPath(path) { return path; },
  resolveModule() { return undefined; },
  resolveRelativePath(importerFilename, relativeSpecifier) {
    return new URL(relativeSpecifier, new URL(importerFilename, 'https://project.local')).pathname;
  }
};

export default [
  {
    settings: { '@studnicky/projectHost': projectHost },
    plugins: { '@studnicky': plugin, '@studnicky/v8': v8Plugin }
  }
];
```

## Try it

<<< ../../packages/eslint-config/examples/configUsage.ts#usage

<RunnableExample src="packages/eslint-config/examples/configUsage" title="Registering the plugin and checking rule counts" />

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
  VocabularySuite
} from '@studnicky/eslint-config/node';

export default [
  entityModelSuite,
  moduleDesignSuite,
  diagnosticsSuite,
  classMechanicsSuite,
  v8ObjectShapeSuite,
  v8CollectionTraversalSuite,
  v8RepeatedWorkSuite,
  VocabularySuite.create({ sourceRoot: 'src' }),
  LayerBoundarySuite.create({
    layers: ['domain', 'application', 'adapters'],
    sourceRoot: 'src',
    domainPurity: { forbiddenImports: ['fs', 'axios'] }
  })
];
```

## Rule reference

- [ESLint Plugins Overview](/eslint/) — registration and rule tables
- [Configuration rules](/eslint/) — 26 `@studnicky` rules
- [V8 performance rules](/eslint/) — 27 `@studnicky/v8` rules

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `plugin` | Provides the `@studnicky` ESLint plugin. | `@studnicky/eslint-config/node` |
| `v8Plugin` | Provides the `@studnicky/v8` ESLint plugin. | `@studnicky/eslint-config/node` |
| `entityModelSuite` | Provides type/interface/entity-namespace shape, naming, location, and keyed-collection rules. | `@studnicky/eslint-config/node` |
| `moduleDesignSuite` | Provides export-shape, return-binding, function-registry, and options-object rules. | `@studnicky/eslint-config/node` |
| `diagnosticsSuite` | Rejects inline lint configuration and diagnostic suppression. | `@studnicky/eslint-config/node` |
| `VocabularySuite` | Creates identifier, static-method-verb, and closed-vocabulary rules. | `@studnicky/eslint-config/node` |
| `classMechanicsSuite` | Provides lexical-`this`, private-field, and direct-invocation rules. | `@studnicky/eslint-config/node` |
| `LayerBoundarySuite` | Creates hexagonal-architecture layer-boundary and entity-intake-boundary rules. | `@studnicky/eslint-config/node` |
| `v8ObjectShapeSuite` | Provides hidden-class/inline-cache stability rules. | `@studnicky/eslint-config/node` |
| `v8CollectionTraversalSuite` | Provides collection-traversal rules. | `@studnicky/eslint-config/node` |
| `v8RepeatedWorkSuite` | Provides hot-loop repeated-work rules. | `@studnicky/eslint-config/node` |
| `ProjectHostInterface` | Defines project services for project-aware rules. | `@studnicky/eslint-config/interfaces` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/eslint-config)
