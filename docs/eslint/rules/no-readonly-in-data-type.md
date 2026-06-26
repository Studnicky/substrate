---
title: '@studnicky/no-readonly-in-data-type'
description: 'Forbids readonly modifiers baked into exported type alias data definitions. Detection is type-checker driven; consumers declare immutability at the use site.'
---

# @studnicky/no-readonly-in-data-type

Forbids `readonly` modifiers baked into **exported** `type` alias definitions. Detection is **type-checker driven**: the rule resolves the alias's type and flags it when the checker finds `readonly` baked into the alias's own inline data structure — a `readonly` property, a `readonly` index signature, a `readonly T[]` array, a `readonly [..]` tuple, or any of these nested inside an inline object or array within the alias.

A type that merely **references** a readonly type (for example `{ item: SomeReadonlyType }`) is not flagged — recursion stops at named type references. Generic transformation types are not flagged either: a mapped type such as `DeepReadonlyType<T> = { readonly [K in keyof T]: T[K] }` resolves to a type with no concrete readonly members in scope, so the checker finds nothing to flag.

The rule no-ops where no TypeScript program is available (type information is required). `interface` declarations are unaffected. The autofix removes `readonly` modifiers.

**Fixable:** Yes (removes `readonly` modifier) · **Options:** none · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// readonly property in an exported type alias
export type ConfigType = {
  readonly name: string;
  readonly timeout: number;
};
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// readonly array type in an exported type alias
export type ItemsType = readonly string[];
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// readonly index signature in an exported type alias
export type DictType = { readonly [k: string]: number };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// readonly nested inside an exported type alias
export type ResponseType = {
  items: readonly number[];
  meta: { readonly page: number };
};
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Mutable shape — consumers apply readonly at the use site
export type ConfigType = {
  name: string;
  timeout: number;
};
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// interface readonly is unaffected by this rule
interface ConfigInterface {
  readonly name: string;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Consumer-applied immutability via Readonly<T> or DeepReadonlyType<T>
import type { DeepReadonlyType } from '@studnicky/types';

const config: Readonly<ConfigType> = loadConfig();
const frozen: DeepReadonlyType<ConfigType> = deepFreeze(config);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Generic mapped transform — resolves to no concrete readonly members, not flagged
export type DeepReadonlyType<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonlyType<T[K]> : T[K];
};
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Referencing a readonly type by name — recursion stops at named references, not flagged
export type WrappedType = {
  item: Readonly<ConfigType>;
  collection: DeepReadonlyType<ConfigType>;
};
```
