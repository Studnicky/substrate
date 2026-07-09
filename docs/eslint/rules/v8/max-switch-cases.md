---
title: '@studnicky/v8/max-switch-cases'
description: 'Requires a dispatch map once a switch statement reaches 20 non-default cases.'
---

# @studnicky/v8/max-switch-cases

Measured on Node v24 (1.5M calls per case count, JIT-warmed) comparing a `switch` statement against an equivalent dispatch map: `switch` is consistently and clearly faster below roughly 20 cases (0.25x-0.8x of dispatch-map time), the 20-100 case range is noisy with no consistent winner, and a dispatch map pulls ahead only once case count grows large (~150+). Below the threshold, prefer `switch` — it is measurably faster and keeps case bodies simple. At or above the threshold, this rule requires a dispatch map (`Record<key, handler>`) instead.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
function f(k: number): number {
  switch (k) {
    case 0: return 0;
    case 1: return 1;
    // ...17 more cases...
    case 19: return 19;
    default: return -1;
  }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const HANDLERS: Record<number, () => number> = {
  0: () => 0,
  1: () => 1,
  // ...17 more entries...
  19: () => 19
};

function f(k: number): number {
  return HANDLERS[k]?.() ?? -1;
}
```
