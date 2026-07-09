---
title: '@studnicky/v8/memoize-array-length'
description: 'Disallows re-reading array.length in a for-loop test on every iteration.'
---

# @studnicky/v8/memoize-array-length

A `for` loop whose test condition reads `array.length` directly (`i < array.length`) re-evaluates that property access on every iteration. V8 cannot always prove the array is not being mutated during the loop body, so it cannot hoist the read, which prevents the loop from being optimized as tightly as one operating over a fixed bound. Memoize the length into a variable before the loop so the test compares against a plain number.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (let i = 0; i < items.length; i++) {
  process(items[i]);
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const len = items.length;
for (let i = 0; i < len; i++) {
  process(items[i]);
}
```
