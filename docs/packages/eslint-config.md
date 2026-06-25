---
title: '@studnicky/eslint-config'
description: Shared ESLint flat config for @studnicky packages.
---

# @studnicky/eslint-config

Shared ESLint flat config factory for TypeScript projects. Ships a single `createEslintConfig()` call that wires up typescript-eslint, stylistic, perfectionist, import ordering, unused-imports, regexp, and two custom rule plugins.

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

<!-- inline-ts-ok: eslint rule example -->
```ts
// eslint.config.ts
import { createEslintConfig } from '@studnicky/eslint-config';

export default createEslintConfig({ tsconfigRootDir: import.meta.dirname });
```

The factory registers both plugins (`@studnicky` and `@studnicky/v8`) automatically. Full usage example:

<<< ../../packages/eslint-config/examples/configUsage.ts#usage

## Subpath exports

| Subpath | Exports |
|---------|---------|
| `@studnicky/eslint-config` | `createEslintConfig`, `plugin`, `v8Plugin`, and all individual rule modules |
| `@studnicky/eslint-config/plugin` | `plugin` (the `@studnicky` ESLint plugin object) |
| `@studnicky/eslint-config/v8` | `v8Plugin` (the `@studnicky/v8` ESLint plugin object) |

## Rule reference

Full documentation for all 30 custom rules is in the **ESLint Plugins** section:

- [ESLint Plugins Overview](/eslint/) — install, factory usage, and rule tables
- [Configuration rules](/eslint/) — 14 `@studnicky` structural and semantic rules
- [V8 performance rules](/eslint/) — 16 `@studnicky/v8` optimization rules

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/eslint-config)
