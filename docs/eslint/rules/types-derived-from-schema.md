---
title: '@studnicky/types-derived-from-schema'
description: 'Disallows inline object-literal type aliases; requires data shapes to be derived from JSON Schema.'
---

# @studnicky/types-derived-from-schema

Disallows type aliases whose annotation is an inline object literal (`TSTypeLiteral`). Data types must be derived from JSON Schema via `FromSchema<typeof XxxSchema>`, so every shape stays backed by a runtime-validated schema instead of a compile-time-only assertion. The inline shape belongs in an entity namespace at `entities/XxxEntity.ts` (`export namespace XxxEntity { export const Schema = ...; export type Type = FromSchema<typeof Schema>; export const validate = ...; }`). Files under `entities/` are exempt entirely. Function types, conditional types, mapped types, unions/intersections composed only of named type references, and the standard branded-primitive pattern (`{ ... } & { readonly x: unique symbol }`) are exempt, since JSON Schema cannot express them. A `// json-schema-uninexpressible: <reason>` comment (at least 10 characters of reason) immediately before the declaration also exempts it.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// inline object-literal type alias outside entities/
type FooType = { a: number };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// exported inline object-literal type alias — still forbidden
export type FooType = { a: number; b: string };
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// inline object shape declared inside an entities/ file — exempt path
export type Type = { a: string };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// canonical derivation form — the shape comes from a JSON Schema
export type FooType = FromSchema<typeof FooSchema>;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// branded intersection — standard TS branding pattern is exempt
export type FooType = { a: string } & { readonly b: unique symbol };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// explicit exemption for a shape JSON Schema cannot express
// json-schema-uninexpressible: this shape needs a mapped-type transform
export type FooType = { a: string };
```
