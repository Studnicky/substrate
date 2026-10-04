---
title: '@studnicky/v8/switch-statements'
description: 'Requires switch cases to delegate with a simple call or return.'
---

# @studnicky/v8/switch-statements

Requires each switch case to delegate rather than contain inline multi-statement logic. A case body wrapped in a block is reported, as is an unwrapped case with two or more statements after ignoring one trailing `break`, `continue`, or `return`. A single delegated call or return, optionally followed by one of those terminators, is allowed.

This is a readability and structure rule, not a V8-performance rule. Proven with `node --allow-natives-syntax --print-bytecode --print-bytecode-filter=<fn>` on a 20-case integer switch: a version with one-line delegating case bodies and a version with multi-statement inlined case bodies both compile to the identical dispatch opcode `SwitchOnSmiNoFeedback [0], [20], [0]` on Node v24 — case-body size has zero effect on dispatch strategy. The message carries no `v8Optimization/` prefix because it protects no V8 mechanism.

The rule applies regardless of case count and is independent of the switch-versus-dispatch-map choice [`max-switch-cases`](./max-switch-cases) enforces at scale: a small switch below that threshold still must keep each case a one-line delegation to a static class method, not an inline block. `max-switch-cases` carries the proven performance claim about case count; this rule addresses case-body size only.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
switch (action) {
  case 'start': {
    const result = initialize();
    return result;
  }
  case 'stop':
    cleanup();
    audit();
    break;
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
switch (action) {
  case 'start': return initialize();
  case 'stop':
    cleanup();
    break;
  default: return undefined;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function stop(): void {
  cleanup();
  audit();
}

switch (action) {
  case 'stop':
    stop();
    break;
}
```
