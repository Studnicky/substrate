---
title: '@studnicky/type-alias-must-end-type'
description: 'Requires exported type aliases to end in Type.'
---

# @studnicky/type-alias-must-end-type

Exported `type` aliases must end in `Type`. This applies only to exported declarations; unexported type aliases are unrestricted.

**Fixable:** No · **Options:** No · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
export type UserOptions = { id: string; timeout: number };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
export type Config = { host: string; port: number };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
export type Status = 'active' | 'inactive';
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
export type UserOptionsType = { id: string; timeout: number };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
export type ConfigType = { host: string; port: number };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Unexported type aliases are unrestricted
type InternalStatus = 'active' | 'inactive';
```
