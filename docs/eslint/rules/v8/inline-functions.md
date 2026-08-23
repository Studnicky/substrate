---
title: '@studnicky/v8/inline-functions'
description: 'Disallows inline function expressions only where they are provably allocated once per iteration.'
---

# @studnicky/v8/inline-functions

Disallows a `function` expression only when its position proves that it is allocated for every iteration. The rule checks three positions: an object-property value in a dispatch map constructed inside a loop or per-element iteration callback; an argument passed to a call or `new` expression in such a position; and a default parameter whose owning function has only direct, per-iteration call sites in the same file. Conditional branches and array-literal elements are unwrapped before those positions are evaluated.

Allocating a closure in a genuinely hot loop measured 2.3x more costly on Node v24. Function nesting alone does not prove that cost: a factory called once during module initialization is exempt, as are any positions whose per-iteration allocation cannot be proven.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const values = [1, 2, 3];
const results: number[] = [];

for (const value of values) {
  const handlers = {
    square: function (input: number): number {
      return input * input;
    }
  };

  results.push(handlers.square(value));
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function invoke(callback: () => void): void {
  callback();
}

for (const value of values) {
  invoke(function (): void {
    console.log(value);
  });
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
function square(input: number): number {
  return input * input;
}

const handlers = { square };
const results = values.map(handlers.square);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function createHandlers() {
  return {
    square: function (input: number): number {
      return input * input;
    }
  };
}

const handlers = createHandlers();
const result = handlers.square(2);
```
