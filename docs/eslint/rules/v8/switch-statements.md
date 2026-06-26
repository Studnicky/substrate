---
title: '@studnicky/v8/switch-statements'
description: 'Disallows block statement bodies in switch cases.'
---

# @studnicky/v8/switch-statements

Disallows `switch` cases with a `BlockStatement` body (`case X: { ... }`). V8 switch dispatch expects simple calls or returns; block statement bodies inhibit the fast dispatch table and prevent V8 from generating optimal jump-table code.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
switch (action) {
  case 'start': {
    const result = init();
    return result;
  }
  case 'stop': {
    cleanup();
    break;
  }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Simple calls or returns without block wrappers
switch (action) {
  case 'start': return init();
  case 'stop': return cleanup();
  default: return noop();
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Or use a dispatch map instead of switch
const handlers = new Map<string, () => void>([
  ['start', () => init()],
  ['stop', () => cleanup()]
]);
handlers.get(action)?.();
```
