---
title: '@studnicky/eslint-config'
description: Shared ESLint flat config for @studnicky packages.
---

# @studnicky/eslint-config

Standard ESLint plugin for TypeScript projects. Ships two namespaced rule sets — `plugin` (22 `@studnicky` rules) and `v8Plugin` (27 `@studnicky/v8` rules) — plus domain-grouped suites.

## Install

Add the GitHub Packages registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add -D @studnicky/eslint-config
```

Install peer dependencies:

```sh
pnpm add -D eslint@>=10 typescript-eslint@>=8 @typescript-eslint/eslint-plugin@>=8 @typescript-eslint/parser@>=8 @stylistic/eslint-plugin@>=5 eslint-plugin-import-x@>=4 eslint-plugin-perfectionist@>=5 eslint-plugin-regexp@>=3 eslint-plugin-unused-imports@>=4 typescript@>=6
```

## Usage

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

## Public API

Import `plugin`, `v8Plugin`, `entitySuite`, `hygieneSuite`, `v8Suite`, and `HexagonalSuite` from `@studnicky/eslint-config`. Individual rule objects are available through `plugin.rules[ruleId]` and `v8Plugin.rules[ruleId]`.

## Rule reference

Full documentation for all 49 custom rules is in the **ESLint Plugins** section:

- [ESLint Plugins Overview](/eslint/) — install, plugin registration, and rule tables
- [Configuration rules](/eslint/) — 22 `@studnicky` structural and semantic rules
- [V8 performance rules](/eslint/) — 27 `@studnicky/v8` optimization rules

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/eslint-config)
