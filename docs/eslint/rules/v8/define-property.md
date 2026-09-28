---
title: '@studnicky/v8/define-property'
description: 'Reports accessor descriptors and same-function redefinitions detected through Object or Reflect property-definition calls.'
---

# @studnicky/v8/define-property

Reports `Object.defineProperty`, `Object.defineProperties`, and `Reflect.defineProperty` only when the rule can prove a hazard: an accessor descriptor containing `get` or `set`, or a static property key that was already established earlier in the same enclosing function. A fresh data-property definition is permitted. `Object` aliases and destructured `defineProperty`/`defineProperties` bindings are recognized, as are bracket spellings with literal keys.

A property is tracked when it is assigned directly on `this` or a simple identifier, or when an earlier supported property-definition call establishes the same target and static string key. The tracking is intentionally limited to one enclosing function; dynamic keys and targets requiring alias analysis are not inferred. `defineProperties` reports once when any static entry is an accessor or redefinition.

Fresh definitions retain fast properties, including non-enumerable or non-configurable data properties. Redefining data as an accessor measured 31.45 ms for 5,000,000 reads versus 1.99 ms for an unredefined fast property (15.8×). An accessor descriptor is also reported because its per-instance closures diverge instance maps even when the object remains in fast-properties mode. [`conditional-property-assignment`](./conditional-property-assignment) reaches the same non-uniform-establishment hazard through plain `this.x = ...` assignment instead of a definition call.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Verifying the hazard

Under `--allow-natives-syntax`, `%HasFastProperties` reports `true` for a plain assignment, for a property built with `Object.defineProperty` from the start, and for one built non-enumerable or non-configurable. It reports `false` only when an established data property is redefined as an accessor, which is the case that drops the object into dictionary mode.

## Shape divergence is a separate hazard from demotion

A conditional or post-construction `Object.defineProperty` diverges instance maps even when every
instance stays in fast properties. Under `--allow-natives-syntax`, two instances of a constructor
that calls `defineProperty` on only one branch report `%HaveSameMap` `false`, and so do two
otherwise-identical objects when one is given a non-writable property afterwards. This rule and
[`conditional-property-assignment`](./conditional-property-assignment) reduce to the same question:
whether every instance reaches the same shape. A `defineProperty` reached through some branches
only, or issued after construction on some instances only, answers no regardless of descriptor kind.

A fresh accessor descriptor that was never a data property diverges maps as well —
`%HasFastProperties` reports `true` while `%HaveSameMap` reports `false` across two instances —
which is the closure-per-instance cost rather than anything specific to `defineProperty`.

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
