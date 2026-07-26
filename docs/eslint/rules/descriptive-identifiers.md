---
title: '@studnicky/descriptive-identifiers'
description: 'Disallows internal shorthand identifiers (cb, dlq, cfg, opts, ctx, idx, etc.) in favour of descriptive names.'
---

# @studnicky/descriptive-identifiers

Disallows internal shorthand identifiers such as `cb`, `dlq`, `cfg`, `opts`, `ctx`, `idx`, `mgr`, `svc`, and similar abbreviated tokens, in favour of descriptive names. Identifiers are split into camelCase tokens and each token is checked against a banned-shortening set — there is no exemption list of acceptable names: a token is only skipped when it does not match a banned shortening, never because of what the whole identifier is called. Non-computed member expression properties (e.g. `Math.max`) are not checked, since they name an external API rather than a project-owned identifier; export specifiers in a re-export (`export { cfg } from './config.js'`) are likewise not checked, since the identifier is not declared by this module.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// variable name contains the banned shortening cfg
const cfg = {};
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// function name contains the banned shortening ctx
function getCtx(): void {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// class property name contains the banned shortening opts
class A {
  opts: string = '';
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// "http" is not a banned shortening token — not flagged
const httpClient = 1;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// single-letter loop iterators never match a banned shortening token
for (let i = 0; i < 10; i += 1) { void i; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// non-computed member expression property on an external API — not checked
const n = Math.max(1, 2);
void n;
```
