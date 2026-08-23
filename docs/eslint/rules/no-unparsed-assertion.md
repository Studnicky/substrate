---
title: '@studnicky/no-unparsed-assertion'
description: 'Disallows assertions from unknown or any to a named type outside an entity intake member.'
---

# @studnicky/no-unparsed-assertion

Disallows a TypeScript assertion from an `unknown` or `any` value to a named type reference, including the legacy `<Type>value` form. A named type assertion presents a shape as proven without parsing the source value, so it bypasses the entity boundary. The rule uses TypeScript type information and does nothing when parser services are unavailable.

Assertions inside an entity namespace’s `intake` member are allowed, because `intake` is the parsing boundary. Literal `as const` assertions and widening assertions to `unknown`, `object`, or primitive keyword types are also allowed.

**Fixable:** No · **Options:** Yes · **Suggested severity:** `error`

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `exemptPackages` | `string[]` | `['@studnicky/types', '@studnicky/eslint-config']` | Package names whose files are excluded from the rule. |

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
type Payload = { readonly value: string };
declare const raw: unknown;
const payload = raw as Payload;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
type Payload = { readonly value: string };
declare const raw: unknown;
const payload = <Payload>raw;
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
namespace PayloadEntity {
  export type Type = { readonly value: string };
  export function intake(input: unknown): Type {
    return input as Type;
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const payload = { value: 'parsed' } as const;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
declare const raw: unknown;
const widened = raw as unknown;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
type Payload = { readonly value: string };
declare const parsed: Payload;
const repeated = parsed as Payload;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
type ForeignNode = { readonly kind: string };
declare const raw: unknown;
const node = raw as ForeignNode;
```

## Rationale

[`all-types-are-entities`](./all-types-are-entities.md), [`whole-canonical-types`](./whole-canonical-types.md), [`folder-content-shape`](./folder-content-shape.md), and [`intake-parse-only`](./intake-parse-only.md) make an entity type evidence that its value passed through an entity’s parsing boundary. An assertion from `unknown` or `any` to a named type forges that evidence, so this rule closes the remaining escape hatch.

`@studnicky/types` is exempt because it supplies the narrowing primitives that parsers are built from. `@studnicky/eslint-config` is exempt because it works with foreign ESLint and TypeScript AST node shapes rather than application data; the repository’s assertions in that package describe those foreign shapes.
