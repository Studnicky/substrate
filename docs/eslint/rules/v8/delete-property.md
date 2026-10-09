---
title: "@studnicky/v8/delete-property"
description: "Reports property deletion except where type information proves the target has no fixed-property contract."
---

# @studnicky/v8/delete-property

Reports `delete object.property`, optional-chain deletion, and `Reflect.deleteProperty(object, key)`. With TypeScript type services, it permits a target only when every meaningful non-nullish type constituent has a string or number index signature, or is the bare `object` type. Those shapes make no fixed-property guarantee for deletion to violate. Without type services, every supported deletion is reported.

The exemption is evidence about the type contract, not a claim that deletion is free. Deleting an own property drops the object out of fast properties regardless of what kind of object it is — `%HasFastProperties` reports `false` after deletion for both a fixed-shape class instance and a dynamically keyed record. Across 2,000,000 objects, deleting from a fixed-shape class instance made reads 9.6× slower (155.0 ms versus 16.2 ms); a dynamically keyed record was still 2.3× slower (49.0 ms versus 20.9 ms). Use an index-signature or bare-object deletion only when removal is the required operation.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Why the exemption boundary is an index signature

A type with a declared index signature (`Record<string, T>`, `{ [key: string]: T }`, an array/tuple's synthesized number index) already admits it has no fixed hidden-class contract — that is what an index signature is: a claim that any key of that kind may exist. Deleting from it revokes no guarantee the type never made. A fixed-shape class instance or interface with only declared members makes the opposite claim, and `delete` breaks it, so the rule keeps reporting there — `delete this.cause` in an error class pays the 9.6× cost above every time. `this` in an ordinary class carries no index signature.

`Reflect.deleteProperty`'s target can also resolve to TypeScript's bare `object` keyword type, for example after a `typeof x !== 'object'` / `Array.isArray(x)` narrowing inside a generic removal helper. `checker.getIndexInfoOfType` returns `undefined` for both index kinds on that narrowed type, but `object` also declares zero members (`TypeFlags.NonPrimitive`): there is no fixed hidden-class contract for the engine to break, because the type system commits to no shape at that point. A `delete obj.x` member expression can never reach this branch, since accessing a named property statically requires the type to declare one; only `Reflect.deleteProperty`'s untyped-key signature can reach a bare `object` target.

## Known exemption sites

Two sites in this repo delete because removal is the specified semantic, with no alternative spelling: `packages/json/src/json/Draft.ts:63`, the `deleteProperty` trap of a `Proxy` handler, where a rule banning property removal inside the trap whose entire purpose is implementing the `delete` operator would be self-contradictory; and `packages/json/src/json/Patch.ts:233`, RFC-6902 `remove`, which defines the operation as removing the member — `'x' in obj` must become `false`, which assigning `undefined` does not satisfy, and rebuilding the parent object would change identity and break in-place mutation. The exemption exists because the operation is mandatory at those two sites, not because it is free — both still pay the cost measured above.

## Behavior without type services

Every supported deletion is reported when type services are unavailable — the opposite default from [`dynamic-property-access`](./dynamic-property-access) and [`for-of-arrays`](./for-of-arrays), which stay silent without types because syntax alone cannot tell a safe array index from an unsafe object key, and guessing would manufacture false positives on arrays. This rule has no such ambiguity: every `delete` on a member expression already costs something, proven above even for the dynamic-record case, so reporting by default and lifting the report only on proven dynamic-shape evidence is the conservative direction.

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->

```ts
class Session {
  public token = "secret";

  public clear(): void {
    delete this.token;
  }
}
```

<!-- inline-ts-ok: eslint rule example -->

```ts
const account: { id: string; temporary: boolean } = { id: "1", temporary: true };
delete account.temporary;
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->

```ts
const cache: Record<string, string> = { token: "secret" };
delete cache.token;
```

<!-- inline-ts-ok: eslint rule example -->

```ts
function removeMember(target: object): boolean {
  return Reflect.deleteProperty(target, "temporary");
}
```
