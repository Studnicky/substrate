---
title: '@studnicky/v8/array-splice-outside-loops'
description: 'Disallows built-in Array.splice calls that execute once per iteration.'
---

# @studnicky/v8/array-splice-outside-loops

Disallows `Array.prototype.splice` when it executes once per iteration of a loop keyword or a built-in per-element iteration callback. Each splice shifts the elements after its cut point, making one call O(n) and repeated calls quadratic. The rule resolves the standard-library signature, so computed access is covered and same-named user methods are not.

A deferred callback defined inside a loop is not reported merely because of its lexical location: a non-iteration function boundary stops the per-iteration analysis. Build the retained collection with `filter` or another out-of-place operation instead of repeatedly removing elements.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (let index = items.length - 1; index >= 0; index -= 1) {
  if (!items[index]?.active) {
    items.splice(index, 1);
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
items.forEach((item) => {
  if (item.stale) {
    items.splice(items.indexOf(item), 1);
  }
});
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const activeItems = items.filter((item) => item.active);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const staleIds = new Set(idsToRemove);
const retained = records.filter((record) => !staleIds.has(record.id));
```
