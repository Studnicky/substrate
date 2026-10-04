---
title: '@studnicky/v8/max-switch-cases'
description: 'Requires a dispatch map only when a switch exceeds the threshold for its case-label kind.'
---

# @studnicky/v8/max-switch-cases

Counts non-`default` cases for switches that resolve to the same discriminant within one enclosing block. It recognizes identifiers, `this`, and non-computed or literal-computed member chains as the same discriminant, so splitting one decision across sibling switches does not avoid the limit.

The limit comes from the literal case labels, not the static type of the discriminant. All-integer labels have no cap: measured (Node v24, N = 5,000,000 dispatches, 3 warm-ups + median of 7) at every count of 3, 10, 20, 50, and 100 cases, an int-keyed switch is never meaningfully slower than an equivalent dispatch map — worst case 1.02x at 10 cases, within noise, often 2-5x faster. V8 compiles a Smi-keyed switch to `SwitchOnSmiNoFeedback`, a jump table, at any of these sizes; see [`switch-statements`](./switch-statements) for the bytecode proof that case-body size does not change this. Sparse integer ranges (for example HTTP status codes with large gaps) receive the same no-cap treatment but are unproven for that shape.

String labels cross over much earlier, because V8 has no equivalent O(1) jump table for string discriminants — dispatch degrades toward a comparison chain as case count grows. Measured with the dispatch map arm holding functions (`Record<key, handler>`, each handler called at the dispatch site, since a per-dispatch call is what the rule tells an author to build):

| cases | switch (ms) | map (ms) | winner |
|-------|-------------|----------|--------|
| 3 | 28.8 | 55.9 | switch 1.94x |
| 4 | 46.7 | 58.7 | switch 1.26x |
| 5 | 53.6 | 59.1 | switch 1.10x |
| 6 | 59.4 | 58.8 | map 1.01x (crossover) |
| 8 | 75.6 | 59.6 | map 1.27x |
| 10 | 83.4 | 54.9 | map 1.52x |

At 4 and 5 cases the switch is still measurably faster, so the threshold is set at 6, the first count where the map wins. Mixed, non-literal, boolean, and other labels use a conservative, unproven fallback of 20 cases; this catch-all category has no single representative discriminant shape to benchmark.

Two switches merge into one group only when their discriminant resolves to the same structural key: an identifier, `this`, or a non-computed or literal-computed member chain built from those. Anything more complex — a call expression, computed access with a non-literal key, a binary expression — is left unresolved and the switch is treated as its own standalone group, avoiding a false-positive merge between two switches that merely look similar but discriminate on different runtime values.

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
