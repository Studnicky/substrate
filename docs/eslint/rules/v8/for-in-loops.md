---
title: '@studnicky/v8/for-in-loops'
description: 'Reports every for...in statement and documents the measured replacement shapes.'
---

# @studnicky/v8/for-in-loops

Reports every `for...in` statement. The rule is a syntax selector and does not attempt to determine whether an object has inherited keys, accessors, or a particular runtime shape.

For repeated traversal of the same object, compute `Object.values(object)` or `Object.keys(object)` once outside the repeated loop and iterate that array. At 5,000,000 property visits, hoisted `Object.keys` took 25.132 ms and hoisted `Object.values` 2.172 ms, versus 95.987 ms for `for...in`. Do not recompute `Object.entries(object)` inside the replacement loop: that form measured 367.317 ms (3.83× slower than `for...in`) because it creates a key-value array for every property on every repeat.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const key in settings) {
  useSetting(key, settings[key]);
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const keys = Object.keys(settings);

for (let index = 0; index < keys.length; index += 1) {
  const key = keys[index];
  if (key !== undefined) {
    useSetting(key, settings[key]);
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const values = Object.values(settings);

for (let index = 0; index < values.length; index += 1) {
  const value = values[index];
  if (value !== undefined) {
    useValue(value);
  }
}
```
