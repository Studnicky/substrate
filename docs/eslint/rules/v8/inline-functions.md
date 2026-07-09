---
title: '@studnicky/v8/inline-functions'
description: 'Disallows inline function expressions in a dispatch map rebuilt on every call.'
---

# @studnicky/v8/inline-functions

Same allocation-churn problem as inline arrow functions, for `function` expression values instead of arrow functions: a dispatch map built once at module scope or as a `static` class field allocates each function value a single time, while the same literal rebuilt inside a function or method body, or in a non-static instance field, re-allocates every function value on every call. Extract the handler to a named function, or hoist the map itself to module or `static` scope. Property values named `transform` or `transformAsync` are exempt, as are references to an already-named function.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
function build() {
  return {
    a: function () { return 1; }
  };
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const map = {
  a: function () { return 1; }
};
```
