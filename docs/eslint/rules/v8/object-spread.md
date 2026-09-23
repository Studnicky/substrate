---
title: '@studnicky/v8/object-spread'
description: 'Disallows construction-time object merging that reaches the instance being constructed.'
---

# @studnicky/v8/object-spread

Disallows an object spread or `Object.assign({}, source)` only when the resulting object is assigned directly to `this.property` or initializes a non-computed class field at construction time. It also disallows `Object.assign(this, source)` at construction time, because that operation merges an unconstrained key set directly onto the instance. Construction time includes the constructor and a regular method or arrow-valued class field that the constructor calls through `this`.

The rule leaves a purely local spread alone because it does not reach the constructed instance. At 5,000,000 calls on Node v24, creating a direct object literal took 1.93 ms and creating the equivalent object with a spread took 109.43 ms, a 56.7x difference. `Object.assign(this, source)` has the additional hidden-class hazard: different source keys cause the instance's own map to diverge across constructions, confirmed with `%HaveSameMap` under `--allow-natives-syntax` — two `Object.assign(this, extra)` constructions with different extra keys report `false`, while the equivalent spread onto a nested `this.bag` property reports `true` because only `bag`'s own shape varies, not `this`'s, and a spread assigned only to a local variable leaves `this` untouched entirely, reporting `true` regardless of source keys. The hazard is map divergence, not dictionary-mode demotion: `%HasFastProperties(new ThisAssignMerge({x:1}))` still reports `true`, so the diverging instance stays in fast properties and pays through megamorphic access instead.

A value is only "this-reaching" when it is itself assigned directly to `this.<name>` or initializes a class field; passing it through a local variable or a return statement is not proven this-reaching and is left unflagged, favoring a false negative over reporting a throwaway that never touches the constructed instance. A spread or `Object.assign({}, …)` whose result never flows into `this` is left to whatever rule targets that value's own use — [`computed-object-properties`](./computed-object-properties) if it is itself a hazard, [`dynamic-property-access`](./dynamic-property-access) if it is read with a variable key later. [`conditional-property-assignment`](./conditional-property-assignment) additionally requires its two `Object.assign(this, cond ? {} : {})` branches to differ before flagging; this rule flags `Object.assign(this, …)` unconditionally, since any non-static source merged directly onto `this` can vary per call.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
class Settings {
  public bag: Record<string, string>;

  public constructor(extra: Record<string, string>) {
    this.bag = { ...extra };
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
class Settings {
  public constructor(extra: Record<string, string>) {
    Object.assign(this, extra);
  }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
class Settings {
  public enabled: boolean;
  public retries: number;

  public constructor(extra: { readonly enabled?: boolean; readonly retries?: number }) {
    this.enabled = extra.enabled ?? false;
    this.retries = extra.retries ?? 3;
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
class Settings {
  public tag: string;

  public constructor(extra: Record<string, string>) {
    this.tag = 'settings';
    const local = { ...extra };
    console.log(local);
  }
}
```
