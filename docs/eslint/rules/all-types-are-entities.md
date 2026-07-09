---
title: '@studnicky/all-types-are-entities'
description: 'Disallows free-standing type aliases outside entity namespaces.'
---

# @studnicky/all-types-are-entities

Disallows free-standing `type` alias declarations outside entity namespaces. Data types must live inside an entity namespace (`export namespace XxxEntity { export const Schema = ...; export type Type = FromSchema<typeof Schema>; export const validate = ...; }`) under an `entities/` directory, so every shape stays tied to a runtime-validated JSON Schema. Paths under `entities/`, `src/types/`, `tests/`, `eslint-config/`, and `eslint.config.mjs` are exempt, as are aliases declared inside a `TSModuleDeclaration` (namespace). A `// json-schema-uninexpressible: <reason>` comment (at least 10 characters of reason) immediately before the declaration also exempts it.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// free-standing type alias outside all exempt paths
type FooType = { a: string };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// exported free-standing union type alias — still forbidden
export type FooType = string | number;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// a non-directive comment does not exempt the alias
// not a directive comment
type FooType = { a: string };
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// declared inside an entities/*.ts file — exempt path
export type Type = { a: string };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// declared inside a TS namespace — not flagged regardless of path
export namespace RetryConfigEntity {
  export type Type = { a: string };
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// explicit exemption for a shape JSON Schema cannot express
// json-schema-uninexpressible: function types cannot be expressed in JSON Schema
type Handler = (x: number) => void;
```
