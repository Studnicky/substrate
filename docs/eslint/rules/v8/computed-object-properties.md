---
title: '@studnicky/v8/computed-object-properties'
description: 'Reports computed object-literal properties and Object.fromEntries calls that bypass V8’s fast object-literal creation path.'
---

# @studnicky/v8/computed-object-properties

Reports a computed property that is a direct child of an object literal, and every `Object.fromEntries(...)` call. Both forms build an object whose property list is not fully available to V8’s fast boilerplate-clone path. The rule does not inspect computed properties in nested expressions as though they belonged to an enclosing literal, and it leaves post-creation bracket writes to [`dynamic-property-access`](./dynamic-property-access).

Computed syntax remains in scope even when its key is a string literal: object creation does not fold `{ ['name']: value }` into the direct-key creation path. At 5,000,000 literal creations, direct properties took 2.01 ms, literal computed properties 26.52 ms (13.2×), and variable keys 43.92 ms (21.9×). `Symbol.*` keys are exempt because a well-known symbol has no non-computed spelling; this is an ergonomics exception, not a claim that the creation cost disappears.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const label = 'name';
const record = { [label]: 'Ada' };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const record = { ['name']: 'Ada' };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const record = Object.fromEntries([['name', 'Ada']]);
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const record = { 'name': 'Ada' };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const values = new Map<string, string>();
values.set('name', 'Ada');
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const iterable = {
  [Symbol.iterator](): IterableIterator<string> {
    return ['Ada'][Symbol.iterator]();
  }
};
```
