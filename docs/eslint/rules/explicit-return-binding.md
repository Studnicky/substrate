---
title: '@studnicky/explicit-return-binding'
description: 'Requires returned operations to bind their result to a const before returning it.'
---

# @studnicky/explicit-return-binding

Requires a returned operation to bind its result to a `const` before returning it. The rule is registered and enabled in this repository.

It reports a `return` whose argument is a call, optional-chained call, tagged template, or operator expression: binary, logical, conditional, unary, assignment, update, or comma. TypeScript assertion wrappers are unwrapped before classification.

It does not report a bare identifier, literal, `this`, member read, `new` expression, object, array, function, class, `await`, or `yield`. Those forms already name a value, construct one, or mark a suspension point rather than delegate a computation.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
function f(): number {
  return Math.abs(-1);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function f(a: number, b: number): number {
  return a + b;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function f(g?: () => number): number | undefined {
  return g?.();
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
function f(value: number): number {
  return value;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function f(): { a: number } {
  return { a: 1 };
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function f(): number {
  const result = g();
  return result;
}

function g(): number {
  return 1;
}
```

## Rule boundary

[`inline-trivial-logic`](./inline-trivial-logic.md) decides whether a forwarding wrapper should exist. This rule decides how a returned operation is structured. Both rules can report the same function when it contains a bound forwarding call.

## No autofix

The rule deliberately has no fixer. Binding a return expression can remove TypeScript contextual typing and widen values, including object-literal members in conditional return expressions. A manual repair preserves the intended type context.

## Configuration

```js
export default [{
  rules: {
    '@studnicky/explicit-return-binding': 'error'
  }
}];
```
