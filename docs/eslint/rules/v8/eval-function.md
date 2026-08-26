---
title: '@studnicky/v8/eval-function'
description: 'Reports recognized eval calls, aliases, indirect forms, and direct new Function expressions.'
---

# @studnicky/v8/eval-function

Reports calls through `eval`, `globalThis.eval`, `window.eval`, `self.eval`, their literal bracket forms, and sequence expressions whose final value is one of those references. It also records a `const` or `let` identifier initialized directly from a recognized reference and reports calls through that identifier. Direct `new Function(...)` expressions are reported as well.

The rule treats dynamically evaluated source as both an optimization and security boundary. Replace it with a static dispatch table, a parser for a defined data format, or ordinary functions selected from known input.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
eval('2 + 2');
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const execute = globalThis['eval'];
execute('2 + 2');
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const add = new Function('left', 'right', 'return left + right');
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
const operations: Record<string, (left: number, right: number) => number> = {
  'add': (left, right) => left + right
};
const result = operations.add(2, 2);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function isEnabled(input: string): boolean {
  return input === 'enabled';
}
```
