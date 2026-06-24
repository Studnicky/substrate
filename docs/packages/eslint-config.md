---
title: '@studnicky/eslint-config'
description: Shared ESLint 9 flat config for @studnicky packages.
---

# @studnicky/eslint-config

> Shared ESLint 9 flat config for `@studnicky` packages.

## Install

```bash
pnpm add -D @studnicky/eslint-config
```

## Usage

Call `createEslintConfig` in your project's `eslint.config.ts`:

<!-- inline-ts-ok: conceptual eslint.config.ts file — not a runnable library demo -->
```typescript
// eslint.config.ts
import { createEslintConfig } from '@studnicky/eslint-config';

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname
});
```

The example below verifies the factory returns a well-formed flat config array with all expected plugins registered:

<<< ../../packages/eslint-config/examples/configUsage.ts#usage

The config includes rules for:
- TypeScript (via `typescript-eslint`)
- Import ordering (via `eslint-plugin-import-x` and `eslint-plugin-perfectionist`)
- Unused imports (via `eslint-plugin-unused-imports`)
- Regular expressions (via `eslint-plugin-regexp`)
- Stylistic formatting (via `@stylistic/eslint-plugin`)
- Custom `@studnicky` rules: `no-bind-apply-call`, `no-suppression-comments`, `single-export`

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/eslint-config` | `createEslintConfig` |
| `@studnicky/eslint-config/plugin` | The raw `@studnicky` ESLint plugin object |
| `@studnicky/eslint-config/v8` | V8-optimization lint rules |

## Extending

Pass options to `createEslintConfig` to configure the TypeScript project service root, then spread additional config objects to extend:

<!-- inline-ts-ok: conceptual eslint.config.ts file — not a runnable library demo -->
```typescript
import { createEslintConfig } from '@studnicky/eslint-config';

export default [
  ...createEslintConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    rules: {
      'no-console': 'warn'
    }
  }
];
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/eslint-config)
