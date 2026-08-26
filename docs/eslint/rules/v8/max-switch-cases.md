---
title: '@studnicky/v8/max-switch-cases'
description: 'Requires a dispatch map only when a switch exceeds the threshold for its case-label kind.'
---

# @studnicky/v8/max-switch-cases

Counts non-`default` cases for switches that resolve to the same discriminant within one enclosing block. It recognizes identifiers, `this`, and non-computed or literal-computed member chains as the same discriminant, so splitting one decision across sibling switches does not avoid the limit.

The limit comes from the literal case labels, not the static type of the discriminant. All-integer labels have no cap. The measurement covers dense integer labels at 3, 10, 20, 50, and 100 cases, where the switch won or tied the equivalent dispatch map; sparse integer ranges receive the same treatment but are unproven. String labels are reported at six or more cases, the first measured count where the map won. Mixed, non-literal, boolean, and other labels use the conservative, unproven fallback of 20 cases.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
function priorityFor(kind: string): number {
  switch (kind) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'normal': return 2;
    case 'low': return 1;
    case 'deferred': return 0;
    case 'none': return -1;
    default: return -2;
  }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const PRIORITIES: Record<string, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
  deferred: 0,
  none: -1
};

function priorityFor(kind: string): number {
  return PRIORITIES[kind] ?? -2;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function valueFor(index: number): number {
  switch (index) {
    case 0: return 0;
    case 1: return 1;
    case 2: return 2;
    case 3: return 3;
    case 4: return 4;
    case 5: return 5;
    default: return -1;
  }
}
```
