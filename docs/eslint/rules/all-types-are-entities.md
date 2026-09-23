---
title: '@studnicky/all-types-are-entities'
description: "Requires canonical pure-data declarations to use the exact schema-derived '*Entity.Type' form."
---

# @studnicky/all-types-are-entities

Requires declarations classified through TypeScript type services as canonical pure data to use an exported `Type` member in an exported namespace whose name ends in `Entity`. The namespace must export its own `Schema`, and the declaration must derive directly from `typeof Schema`.

The rule accepts both canonical spellings:

- `export type Type = F<typeof Schema>`
- `export interface Type extends F<typeof Schema> {}`

`F` must have verified schema-derived provenance. A pure-data declaration that does not meet the exact entity ownership and derivation shape is reported. The rule does nothing when TypeScript parser services are unavailable.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: conceptual rule example -->
```ts
export type User = {
  readonly id: string;
};
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
import type { FromSchema } from 'json-schema-to-ts';

export namespace UserEntity {
  export const Schema = { type: 'object' } as const;
  export type User = FromSchema<typeof Schema>;
}
```

## ✓ Correct

<!-- inline-ts-ok: conceptual rule example -->
```ts
import type { FromSchema } from 'json-schema-to-ts';

export namespace UserEntity {
  export const Schema = { type: 'object' } as const;
  export type Type = FromSchema<typeof Schema>;
}
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
import type { FromSchema } from 'json-schema-to-ts';

export namespace UserEntity {
  export const Schema = { type: 'object' } as const;
  export interface Type extends FromSchema<typeof Schema> {}
}
```

## Diagnostic ownership

[`type-alias-invariants`](./type-alias-invariants.md) owns aliases that fail its own identity, declaration-shape, naming, provenance, or readonly checks. This rule reports only declarations the shared classifier identifies as canonical pure data but that are not in the canonical entity form.

[`entity-file-shape`](./entity-file-shape.md) owns the paired concern: whether an `*Entity` namespace's members — `Schema`, `Type`, `validate`, `intake`, `create` — are present and correctly shaped, and whether declaration and constants files sit in their conventional folders. This rule governs the type-alias declaration itself; `entity-file-shape` governs the namespace and file that declaration lives in.
