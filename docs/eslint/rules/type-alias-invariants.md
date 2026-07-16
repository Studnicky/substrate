---
title: '@studnicky/type-alias-invariants'
description: 'Merged type-alias/interface invariants: must end in Type, must not bake in readonly, must not be naked re-aliases, must derive from JSON Schema, and must not duplicate an imported shape.'
---

# @studnicky/type-alias-invariants

Merges five independent, independently toggleable checks into one shared `TSTypeAliasDeclaration`/`TSInterfaceDeclaration` visitor:

1. **mustEndType** — exported type aliases must end in `Type`.
2. **noReadonly** — exported data-type aliases must not bake in `readonly` (autofix removes the token).
3. **noAliasing** — disallow naked type re-aliases, primitive aliases, generic forwarding shims, and import aliases.
4. **derivedFromSchema** — disallow inline object-literal type aliases outside `entities/`.
5. **noPreferExisting** — disallow locally-declared object types/interfaces whose shape already exists in an imported package.

Each check reports its own `messageId` and can be disabled independently via options. When two checks would fire on the same node with contradictory advice, one is suppressed: `noAliasing`'s and `noPreferExisting`'s "delete this declaration" verdicts take precedence over `mustEndType`'s "rename it" advice (renaming a declaration slated for deletion is contradictory), and `noPreferExisting`'s "use the import" verdict takes precedence over `derivedFromSchema`'s "move this into an entity" advice (entity-ifying a redundant duplicate just re-declares the same redundancy elsewhere).

**Fixable:** Partial (noReadonly only) · **Options:** Yes · **Suggested severity:** `error`

### Options

| Name | Type | Default | Description |
|---|---|---|---|
| `mustEndType` | `boolean` | `true` | Require exported type aliases to end in `Type`. |
| `noReadonly` | `boolean` | `true` | Forbid `readonly` baked into an exported data-type alias. |
| `noAliasing` | `boolean` | `true` | Forbid naked re-aliases, primitive aliases, generic forwarding shims, and import aliases. |
| `derivedFromSchema` | `boolean` | `true` | Forbid inline object-literal type aliases outside `entities/`. |
| `noPreferExisting` | `boolean \| object` | `true` | Forbid local types/interfaces that duplicate an imported shape. `false` disables entirely; an object tunes the sub-options below. |
| `noPreferExisting.exactMatch` | `'error' \| 'warn' \| 'off'` | `'error'` | Severity when the local shape is structurally identical to an imported shape. |
| `noPreferExisting.nearMatch` | `'error' \| 'warn' \| 'off'` | `'warn'` | Severity when the local shape matches all required fields of an imported shape but differs in optional fields. |
| `noPreferExisting.subsumedMatch` | `'error' \| 'warn' \| 'off'` | `'warn'` | Severity when the local shape is fully covered by an imported shape but not vice versa. |
| `noPreferExisting.minFields` | `integer` | `2` | Minimum property count on the local shape before a match is considered. |
| `noPreferExisting.excludePrefixes` | `string[]` | `['@types/', 'node:']` | Import source prefixes exempt from the duplicate-shape check. |

## ✗ Incorrect

### mustEndType

<!-- inline-ts-ok: eslint rule example -->
```ts
// inline export not ending in Type — flagged
export type Foo = { a: number };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// separate re-export form — flagged even though the declaration itself is not exported inline
type Foo = { a: number };
export type { Foo };
```

### noReadonly

<!-- inline-ts-ok: eslint rule example -->
```ts
// flat readonly property signature — bakes readonly into own inline shape
export type FlatType = { readonly a: number };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// readonly array in property type
export type ArrPropType = { items: readonly string[] };
```

### noAliasing

<!-- inline-ts-ok: eslint rule example -->
```ts
// naked type reference re-alias
type FooType = BarType;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// primitive type alias
type IdType = string;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// generic forwarding shim — single type param forwarded unchanged
type FooList<T> = Array<T>;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// import alias that hides the canonical name
import { FooType as BarType } from './foo';
```

### derivedFromSchema

<!-- inline-ts-ok: eslint rule example -->
```ts
// exported inline object-literal type alias outside entities/ — forbidden
export type FooType = { a: number; b: string };
```

### noPreferExisting

<!-- inline-ts-ok: eslint rule example -->
```ts
// exactMatch: local type is structurally identical to an imported type
import type { Rule } from 'eslint';
import { plugin } from '@studnicky/eslint-config';

type LocalPluginType = { rules: Record<string, Rule.RuleModule> };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// nearMatch: local has the same required fields as imported but a different optional count
import type { Rule } from 'eslint';
import { plugin } from '@studnicky/eslint-config';

type LocalPluginType = { rules: Record<string, Rule.RuleModule>; optionalExtra?: string };
```

## ✓ Correct

### mustEndType

<!-- inline-ts-ok: eslint rule example -->
```ts
// inline export already ends in Type — not flagged
export type FooType = { a: number };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// not exported at all — not flagged
type Foo = { a: number };
```

### noReadonly

<!-- inline-ts-ok: eslint rule example -->
```ts
// mutable exported type alias — no readonly anywhere
export type MutableType = { a: number; items: string[]; nested: { x: number } };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// non-exported type alias with readonly — parent is not ExportNamedDeclaration, out of scope
type PrivateType = { readonly a: number };
```

### noAliasing

<!-- inline-ts-ok: eslint rule example -->
```ts
// generic alias that creates a new shape — not a forwarding shim
type Wrapped<T> = { value: T };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// union type
type FooType = string | number;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// import without alias
import { FooType } from './foo';
```

### derivedFromSchema

<!-- inline-ts-ok: eslint rule example -->
```ts
// FromSchema<typeof XSchema> reference — the canonical derivation form
export type FooType = FromSchema<typeof FooSchema>;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// inline object shape inside an entities/ file — exempt path
// (filename: src/entities/RetryConfigEntity.ts)
export type Type = { a: string };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// json-schema-uninexpressible directive comment — exempt
// json-schema-uninexpressible: this shape needs a mapped-type transform
export type FooType = { a: string };
```

### noPreferExisting

<!-- inline-ts-ok: eslint rule example -->
```ts
// no imports from any package — rule does not fire
type FooType = { a: string; b: number };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// node: prefix is excluded by default — rule does not fire
import { Buffer } from 'node:buffer';

type LocalType = { data: unknown };
```
