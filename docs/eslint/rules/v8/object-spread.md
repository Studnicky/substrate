---
title: '@studnicky/v8/object-spread'
description: 'Disallows construction-time object merging that reaches the instance being constructed.'
---

# @studnicky/v8/object-spread

Disallows an object spread or `Object.assign({}, source)` only when the resulting object is assigned directly to `this.property` or initializes a non-computed class field at construction time. It also disallows `Object.assign(this, source)` at construction time, because that operation merges an unconstrained key set directly onto the instance. Construction time includes the constructor and a regular method or arrow-valued class field that the constructor calls through `this`.

The rule leaves a purely local spread alone because it does not reach the constructed instance. At 5,000,000 calls on Node v24, creating a direct object literal took 1.93 ms and creating the equivalent object with a spread took 109.43 ms, a 56.7x difference. `Object.assign(this, source)` has the additional hidden-class hazard: different source keys cause the instance's own map to diverge across constructions.

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
