---
title: '@studnicky/v8/switch-statements'
description: 'Requires switch cases to delegate with a simple call or return.'
---

# @studnicky/v8/switch-statements

Requires each switch case to delegate rather than contain inline multi-statement logic. A case body wrapped in a block is reported, as is an unwrapped case with two or more statements after ignoring one trailing `break`, `continue`, or `return`. A single delegated call or return, optionally followed by one of those terminators, is allowed.

This is a readability and structure rule, not a V8-performance rule. On Node v24, a 20-case integer switch with one-line delegating bodies and one with multi-statement bodies both emitted the same `SwitchOnSmiNoFeedback` dispatch bytecode. The related `max-switch-cases` rule addresses the measured performance threshold for case count.

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
