---
title: '@studnicky/v8/array-from-map-callback'
description: 'Disallows the two-argument built-in Array.from form.'
---

# @studnicky/v8/array-from-map-callback

Disallows `Array.from(iterable, mapFn)`. The rule resolves `ArrayConstructor.from` from the standard library, covering computed or aliased calls while excluding an unrelated static method named `from`. It applies at every call site, not only in loops: the measured cost is proportional to the source size even for one top-level call.

For a 5,000,000-element array in Node v24, `Array.from(arr, mapFn)` takes 79.28 ms and `new Array(n)` with indexed assignment takes 6.27 ms, a 12.65× difference. Use an index-assignment loop where the mapped result is needed, or use the one-argument form when conversion is sufficient.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const doubled = Array.from(values, (value) => value * 2);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const labels = Array.from(records, (record) => record.label);
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const doubled = new Array<number>(values.length);
for (let index = 0; index < values.length; index += 1) {
  doubled[index] = (values[index] ?? 0) * 2;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const copied = Array.from(values);
```
