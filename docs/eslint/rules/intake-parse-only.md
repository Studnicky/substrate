---
title: '@studnicky/intake-parse-only'
description: 'Permits unknown and any parameters only on an entity namespace intake member.'
---

# @studnicky/intake-parse-only

Permits an `unknown` or `any` parameter only on the `intake` member of a TypeScript namespace whose name ends in `Entity`. Every other function declaration, function expression, and arrow function with such a parameter is reported. Calls made inside an `intake` body are expressions rather than declarations and are not reported.

**Fixable:** No · **Options:** Yes · **Suggested severity:** `error`

## Options

| Name | Type | Default | Description |
|---|---|---|---|
| `exemptPackages` | `string[]` | `['@studnicky/types']` | Package names whose files are excluded from the rule. |

## ✗ Incorrect

<!-- inline-ts-ok: conceptual rule example -->
```ts
declare namespace RecordEntity {
  type Type = { readonly id: string };
  function validate(value: unknown): value is Type;
}
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
function handle(payload: unknown): void {}
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
function parse(input: any): void {}
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
declare namespace Record {
  function intake(input: unknown): void;
}
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
function intake(input: unknown): void {}
```

## ✓ Correct

<!-- inline-ts-ok: conceptual rule example -->
```ts
declare namespace RecordEntity {
  type Type = { readonly id: string };
  function intake(input: unknown): Type;
}
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
function handle(payload: string): void {}
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
declare namespace RecordEntity {
  type Type = { readonly id: string };
  const intake = (input: unknown): Type => ({ id: String(input) });
}
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
declare namespace RecordEntity {
  function intake(input: unknown): boolean {
    return Guard.isObject(input);
  }
}
```

## Rationale

Three rules establish the entity boundary from different directions: [`all-types-are-entities`](./all-types-are-entities.md) requires each canonical data shape to be an entity, [`whole-canonical-types`](./whole-canonical-types.md) requires consumers to use that entity whole, and [`folder-content-shape`](./folder-content-shape.md) fixes the members an entity namespace can expose. None constrains the direction in.

This rule makes unparsed input enter through exactly one boundary, `SomeEntity.intake(input)`. Its return `SomeEntity.Type` is proof that the value crossed the parsing boundary, so downstream code accepts an entity rather than repeatedly narrowing an unparsed value. The default `@studnicky/types` exemption keeps shared narrowing primitives such as `Guard.isObject` and value-returning `as*` helpers outside the entity model.
