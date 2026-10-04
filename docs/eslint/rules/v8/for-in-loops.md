---
title: '@studnicky/v8/for-in-loops'
description: 'Reports every for...in statement and documents the measured replacement shapes.'
---

# @studnicky/v8/for-in-loops

Reports every `for...in` statement. The rule is a syntax selector and does not attempt to determine whether an object has inherited keys, accessors, or a particular runtime shape.

For repeated traversal of the same object, compute `Object.values(object)` or `Object.keys(object)` once outside the repeated loop and iterate that array. Measured on Node v24 over a 50-key plain object, 100,000 repeats (5,000,000 property visits, 3 warm-up calls plus the median of 7 timed calls), hoisted `Object.keys` took 25.132 ms, hoisted `Object.values` 2.172 ms and hoisted `Object.entries` 4.023 ms, versus 95.987 ms for `for...in` — every hoisted form between 4× and 43× faster. Do not recompute `Object.entries(object)` inside the replacement loop: that form measured 367.317 ms (3.83× slower than `for...in`) because it creates a key-value array for every property on every repeat. `Object.keys` recomputed inside the loop instead of hoisted still beats `for...in` (69.760 ms, 0.727×) but far less than the hoisted form.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Why the message drops Object.entries as the first-choice remedy

As a bare selector on `ForInStatement`, the rule cannot see whether a caller actually hoists the replacement out of a repeated loop — that requires code that does not exist at report time. The message states the hoist requirement explicitly and recommends `Object.keys`/`Object.values` first, because `Object.entries` is both the shape callers are most likely to reach for and the one most damaged by not hoisting.

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
