# @studnicky/eslint-config

> Shared ESLint 9 flat config for @studnicky packages

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/eslint-config)

Shared ESLint 9 flat config factory for TypeScript projects. Provides a single `createEslintConfig()` call that wires up typescript-eslint, stylistic, perfectionist, import ordering, and a custom rule plugin — ready to spread into your flat config.

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
pnpm add -D eslint@>=9 typescript-eslint@>=8 @typescript-eslint/eslint-plugin@>=8 @typescript-eslint/parser@>=8 @stylistic/eslint-plugin@>=2 eslint-plugin-import-x@>=4 eslint-plugin-perfectionist@>=4 eslint-plugin-regexp@>=2 eslint-plugin-unused-imports@>=4 typescript@>=5
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
import { v8 } from '@studnicky/eslint-config/v8';

export default [
  ...v8,
];
```

## Custom rules

The package ships a plugin with four rules under the `@studnicky` namespace:

| Rule | Purpose |
|------|---------|
| `@studnicky/no-bind-apply-call` | Disallows `.bind()`, `.apply()`, and `.call()` on functions |
| `@studnicky/no-suppression-comments` | Disallows eslint-disable and @ts-ignore suppression comments |
| `@studnicky/no-trivial-shim` | Flags thin wrapper functions that add no behavior |
| `@studnicky/single-export` | Enforces one named export per file |

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/eslint-config

## License

MIT
