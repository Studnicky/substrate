---
title: '@studnicky/v8/inline-arrow-functions'
description: 'Reports multi-statement block arrows only at positions proven to allocate them once per iteration.'
---

# @studnicky/v8/inline-arrow-functions

Reports a block-bodied arrow with at least two effective statements only when its position is proven to allocate it once per iteration: as a property value in an object literal built per iteration, as a direct call or constructor argument at a per-iteration call site, or as a default parameter of a function whose resolvable direct call sites are all per iteration. One-shot factories and unproven call paths remain outside the rule.

The statement count treats an immediately adjacent `const value = expression; return value;` pair as one effective statement. [`explicit-return-binding`](../explicit-return-binding) requires that return-binding form, so treating it as two statements would make the rules mutually unsatisfiable. A `let` or `var` pair, a non-adjacent return, and every other two-statement body remain multi-statement.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
for (let index = 0; index < 10; index += 1) {
  const handlers = {
    'next': () => {
      const value = index + 1;
      return value + 1;
    }
  };
  handlers.next();
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
for (const value of values) {
  consume(() => {
    const next = value + 1;
    return next + 1;
  });
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
for (let index = 0; index < 10; index += 1) {
  const handlers = {
    'next': () => {
      const value = index + 1;
      return value;
    }
  };
  handlers.next();
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const handler = (value: number): number => {
  const next = value + 1;
  return next + 1;
};

for (let index = 0; index < 10; index += 1) {
  consume(handler);
}
```
