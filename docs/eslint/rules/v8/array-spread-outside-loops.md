---
title: '@studnicky/v8/array-spread-outside-loops'
description: 'Disallows bound array literals with spread that execute once per iteration.'
---

# @studnicky/v8/array-spread-outside-loops

Disallows a spread element in an array literal that is assigned to an identifier or property, or initializes a variable, when that expression executes once per iteration. Repeatedly rebuilding an array with `[...result, item]` allocates and copies the growing prefix on every iteration, producing quadratic work. A built-in per-element iteration callback is treated as a loop body.

The rule targets only bound array literals. Spread passed as a call argument, such as `result.push(...items)`, and nested or unbound literals are outside its scope.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
let result: string[] = [];
for (const item of items) {
  result = [...result, item];
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
let result: string[] = [];
items.forEach((item) => {
  result = [...result, item];
});
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const result: string[] = [];
for (const item of items) {
  result.push(item);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const merged = [...first, ...second];
```
