# @studnicky/eslint-config

> Shared ESLint flat config for @studnicky packages

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/eslint-config)

Shared ESLint flat config factory for TypeScript projects. Provides a single `createEslintConfig()` call that wires up typescript-eslint, stylistic, perfectionist, import ordering, and a custom rule plugin — ready to spread into your flat config.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add -D @studnicky/eslint-config
```

Also install peer dependencies:

```sh
pnpm add -D eslint@>=10 typescript-eslint@>=8 @typescript-eslint/eslint-plugin@>=8 @typescript-eslint/parser@>=8 @stylistic/eslint-plugin@>=5 eslint-plugin-import-x@>=4 eslint-plugin-perfectionist@>=5 eslint-plugin-regexp@>=3 eslint-plugin-unused-imports@>=4 typescript@>=6
```

## Usage

```js
// eslint.config.mjs
import { createEslintConfig } from '@studnicky/eslint-config';

export default createEslintConfig();
```

## Extending

Pass `tsconfigRootDir` to point the TypeScript projectService at your config:

```js
// eslint.config.mjs
import { createEslintConfig } from '@studnicky/eslint-config';

export default createEslintConfig({ tsconfigRootDir: import.meta.dirname });
```

Spread the result and append custom rules:

```js
// eslint.config.mjs
import { createEslintConfig } from '@studnicky/eslint-config';

export default [
  ...createEslintConfig({ tsconfigRootDir: import.meta.dirname }),
  { rules: { 'no-console': 'warn' } }
];
```

Import the V8-optimization rules directly:

```js
// eslint.config.mjs
import { v8Plugin } from '@studnicky/eslint-config/v8';

export default [
  {
    plugins: { '@studnicky/v8': v8Plugin },
    rules: { '@studnicky/v8/no-spread-in-loops': 'error' }
  }
];
```

## Custom rules

The package ships two rule plugins registered by `createEslintConfig()`.

**`@studnicky` namespace** (14 rules via `plugin` from `@studnicky/eslint-config/plugin`):

| Rule | Purpose |
|------|---------|
| `@studnicky/no-bind-apply-call` | Disallows `.bind()`, `.apply()`, and `.call()` on functions |
| `@studnicky/no-suppression-comments` | Disallows eslint-disable and @ts-ignore suppression comments |
| `@studnicky/no-trivial-shim` | Flags thin wrapper functions that add no behavior |
| `@studnicky/single-export` | Enforces one named export per file |

**`@studnicky/v8` namespace** (16 rules via `v8Plugin` from `@studnicky/eslint-config/v8`):

| Rule | Purpose |
|------|---------|
| `@studnicky/v8/no-spread-in-loops` | Avoid spread operators inside loops |
| `@studnicky/v8/for-of-arrays` | Prefer `for` / `for-of` over `forEach` on arrays |

Full rule reference: https://studnicky.github.io/substrate/packages/eslint-config

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/eslint-config

## License

MIT
