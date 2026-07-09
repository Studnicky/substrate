---
title: '@studnicky/v8/inline-arrow-functions'
description: 'Disallows inline multi-statement arrow functions in a dispatch map rebuilt on every call.'
---

# @studnicky/v8/inline-arrow-functions

A dispatch map (an object literal whose values are handler functions) built once at module scope, or as a `static` class field, allocates its arrow-function values exactly once. The same map literal built inside a function body or an instance field re-allocates every arrow function on every invocation, which is pure churn for the garbage collector and defeats V8's ability to reuse a single closure. This rule flags multi-statement (block-body) arrow functions used as object-literal property values only when the enclosing literal is rebuilt per call — a module-scope `const` or `static` field is exempt, as are single-expression arrow bodies and property keys named `callback`, `execute`, `handler`, `process`, `transform`, `transformAsync`, or `validate`.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
function build() {
  return {
    a: (x) => { let y = x; return y; }
  };
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const map = {
  a: (x) => { let y = x; return y; }
};
```
