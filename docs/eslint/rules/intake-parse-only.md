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
| `exemptPackages` | `string[]` | `['@studnicky/types', '@studnicky/eslint-config', '@studnicky/predicates', '@studnicky/intake-kit']` | Package names whose files are excluded from the rule — the parsing primitives, coercion machinery, and compile engine every `intake` is built from can't themselves be required to go through `intake`. Replaces the default entirely; does not merge with it. |
| `structuralProperties` | `string[]` | `['buffer', 'byteLength', 'byteOffset', 'length', 'size', 'then']` | Non-called property reads (`value.length`, not `value.map()`) that belong to a fixed JS/DOM built-in surface rather than an application-defined schema field, so reading one isn't a shape-trust decision. This package's own built-in vocabulary ships as the default; a consumer whose code reads a different built-in surface (`Blob.type`, `Blob.size`, a domain library's own structural properties) supplies their own array. Replaces the default entirely; does not merge with it. |

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

This rule makes unparsed input enter through exactly one boundary, `SomeEntity.intake(input)`. Its return `SomeEntity.Type` is proof that the value crossed the parsing boundary, so downstream code accepts an entity rather than repeatedly narrowing an unparsed value. The default `exemptPackages` keep shared narrowing primitives (`Guard.isObject`), coercion/matching machinery, and the compile engine `intake` itself is built from outside the entity model — each would have to depend on the very boundary it implements.

Not every `unknown`/`any` parameter is trusting a shape in the first place. A lifecycle hook that only stores or forwards a value, a generic logger that stringifies whatever it's given, or a structural walk that visits properties through a *variable* key (`Reflect.get(x, key)` from `Object.keys(x)`) never assumes a named field exists, so there's no shape for `intake` to validate — these parameters are exempt automatically, with no configuration. The same holds for a member access immediately invoked as a call (`value.map(...)`, `value.entries()`): `intake` validates data shape, not behavior, so a schema-backed boundary has nothing to say about whether a value exposes a callable method. A private, unexported helper (a `#`-prefixed or `private` class member, or a non-exported function) nested inside a `*Entity` namespace shares the boundary with `intake` itself, since privacy already proves nothing outside the entity can reach it directly.
