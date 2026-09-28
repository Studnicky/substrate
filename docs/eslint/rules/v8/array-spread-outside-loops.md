---
title: '@studnicky/v8/array-spread-outside-loops'
description: 'Disallows bound array literals with spread that execute once per iteration.'
---

# @studnicky/v8/array-spread-outside-loops

Disallows a spread element in an array literal that is assigned to an identifier or property, or initializes a variable, when that expression executes once per iteration. Repeatedly rebuilding an array with `[...result, item]` allocates and copies the growing prefix on every iteration, producing quadratic work. A built-in per-element iteration callback is treated as a loop body.

The rule targets only bound array literals. Spread passed as a call argument, such as `result.push(...items)`, is a related but distinct O(n) pattern — spreading into an argument list rather than into an array literal bound to a variable or property — and is intentionally out of scope; nested or unbound literals are likewise excluded.

Per-iteration detection resolves through `LoopContext`, not a function-boundary walk: a spread inside a `.forEach()`/`.map()` callback allocates a fresh array once per element, identically to one written with a loop keyword, so the callback counts as a loop body. `CallIdentity` is not used here, unlike sibling rules that target a method call — a `SpreadElement` inside an `ArrayExpression` is pure syntax, not a resolved call, so there is no callee signature to resolve identity from.

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
