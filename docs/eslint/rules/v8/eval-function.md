---
title: '@studnicky/v8/eval-function'
description: 'Disallows eval().'
---

# @studnicky/v8/eval-function

Disallows `eval(...)`. The presence of `eval` prevents V8 from optimizing the surrounding function because it must assume any local variable may be accessed or modified by the evaluated string. It is also a security risk.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
eval('console.log(x)');
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const result = eval(userInput);
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Use static code paths instead
const handlers = new Map<string, () => void>([
  ['log', () => { console.log(x); }]
]);
handlers.get(command)?.();
```
