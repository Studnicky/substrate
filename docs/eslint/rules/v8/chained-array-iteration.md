---
title: '@studnicky/v8/chained-array-iteration'
description: 'Disallows multiple resolved array iteration passes in one chain or adjacent temporary use.'
---

# @studnicky/v8/chained-array-iteration

Disallows two or more built-in `every`, `filter`, `find`, `flatMap`, `forEach`, `map`, `reduce`, or `some` passes along one `Array` or `ReadonlyArray` call chain, including when non-iterating calls appear between them. It also detects an adjacent `const` temporary that holds one such call and has exactly one use as the receiver of the next. The rule resolves signatures, so same-named methods on unrelated fluent APIs are not reported.

For a 5,000,000-element array in Node v24, `map(...).filter(...)` takes 54.09 ms while a single `reduce` takes 26.76 ms: 2.02× slower, or 102% more time. Combine transformation and selection into one pass where the chain represents repeated traversal.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
const names = users.filter((user) => user.active).map((user) => user.name);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const activeUsers = users.filter((user) => user.active);
const names = activeUsers.map((user) => user.name);
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const names = users.reduce<string[]>((result, user) => {
  if (user.active) {
    result.push(user.name);
  }
  return result;
}, []);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const visible = users.reduce<typeof users>((result, user) => {
  if (user.visible) {
    result.push(user);
  }
  return result;
}, []);
```
