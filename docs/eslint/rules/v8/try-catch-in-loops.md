---
title: '@studnicky/v8/try-catch-in-loops'
description: 'Disallows try-catch blocks inside loop bodies.'
---

# @studnicky/v8/try-catch-in-loops

Disallows `try-catch` blocks inside loop bodies. V8 cannot fully optimize functions containing `try-catch` in hot paths. Extract the `try-catch` to a wrapper function called from the loop, so the loop body remains in the fast path.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const item of items) {
  try {
    process(item);
  } catch (err) {
    logger.error(err);
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
for (let i = 0; i < arr.length; i++) {
  try {
    result.push(parse(arr[i]));
  } catch {
    result.push(null);
  }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Extract try-catch to a wrapper function
function trySafe(item: Item): void {
  try {
    process(item);
  } catch (err) {
    logger.error(err);
  }
}

for (const item of items) {
  trySafe(item);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function tryParse(value: unknown): ParsedType | null {
  try { return parse(value); } catch { return null; }
}

for (let i = 0; i < arr.length; i++) {
  result.push(tryParse(arr[i]));
}
```
