---
title: '@studnicky/entity-namespace'
description: 'Entity files must export a namespace with Schema as const, type Type derived via FromSchema, and a validate type guard.'
---

# @studnicky/entity-namespace

Entity files (named `*Entity.ts` or inside an `entities/` directory) must export a single namespace whose members satisfy the schema-as-source-of-truth pattern: a `Schema` declared `as const`, a `type Type` derived via `FromSchema<typeof Schema>`, and a `validate` function that is either `SchemaValidator.compile<Type>(Schema)` or a hand-written `(candidate: unknown): candidate is Type` predicate.

**Fixable:** No · **Options:** No · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// userEntity.ts — missing required members
export namespace UserEntity {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// userEntity.ts — missing validate member
export namespace UserEntity {
  export const Schema = { type: 'object', properties: { id: { type: 'string' } } } as const;
  export type Type = FromSchema<typeof Schema>;
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// userEntity.ts — complete entity namespace
export namespace UserEntity {
  export const Schema = { type: 'object', properties: { id: { type: 'string' } } } as const;
  export type Type = FromSchema<typeof Schema>;
  export const validate = SchemaValidator.compile<Type>(Schema);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// userEntity.ts — hand-written predicate
export namespace UserEntity {
  export const Schema = { type: 'object', properties: { id: { type: 'string' } } } as const;
  export type Type = FromSchema<typeof Schema>;
  export const validate = (candidate: unknown): candidate is Type =>
    typeof candidate === 'object' && candidate !== null && 'id' in candidate;
}
```
