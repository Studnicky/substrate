---
title: '@studnicky/v8/define-property'
description: 'Reports accessor descriptors and same-function redefinitions detected through Object or Reflect property-definition calls.'
---

# @studnicky/v8/define-property

Reports `Object.defineProperty`, `Object.defineProperties`, and `Reflect.defineProperty` only when the rule can prove a hazard: an accessor descriptor containing `get` or `set`, or a static property key that was already established earlier in the same enclosing function. A fresh data-property definition is permitted. `Object` aliases and destructured `defineProperty`/`defineProperties` bindings are recognized, as are bracket spellings with literal keys.

A property is tracked when it is assigned directly on `this` or a simple identifier, or when an earlier supported property-definition call establishes the same target and static string key. The tracking is intentionally limited to one enclosing function; dynamic keys and targets requiring alias analysis are not inferred. `defineProperties` reports once when any static entry is an accessor or redefinition.

Fresh definitions retain fast properties, including non-enumerable or non-configurable data properties. Redefining data as an accessor measured 31.45 ms for 5,000,000 reads versus 1.99 ms for an unredefined fast property (15.8×). An accessor descriptor is also reported because its per-instance closures diverge instance maps even when the object remains in fast-properties mode.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const state: { value?: number } = {};
state.value = 1;
Object.defineProperty(state, 'value', { 'value': 2 });
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const profile = {};
Object.defineProperty(profile, 'name', {
  get(): string {
    return 'Ada';
  }
});
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const state: { readonly id?: number } = {};
Object.defineProperty(state, 'id', {
  'configurable': false,
  'enumerable': true,
  'value': 1,
  'writable': false
});
```

<!-- inline-ts-ok: eslint rule example -->
```ts
class Profile {
  #name: string;

  public constructor(name: string) {
    this.#name = name;
  }

  public get name(): string {
    return this.#name;
  }
}
```
