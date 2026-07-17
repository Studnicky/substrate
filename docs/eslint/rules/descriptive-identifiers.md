---
title: '@studnicky/descriptive-identifiers'
description: 'Disallows internal shorthand identifiers (cb, dlq, cfg, opts, ctx, idx, etc.) in favour of descriptive names.'
---

# @studnicky/descriptive-identifiers

Disallows internal shorthand identifiers such as `cb`, `dlq`, `cfg`, `opts`, `ctx`, `idx`, `mgr`, `svc`, and similar abbreviated tokens, in favour of descriptive names. Identifiers are split into camelCase tokens and each token is checked against a banned-shortening set; loop iterators `i`/`j`/`k` and a whitelist of standards-defined or project-established acronyms (`HTTP`, `JSON`, `URL`, `UUID`, `TTL`, `LRU`, `JsonValue`, and others) are exempt. Non-computed member expression properties (e.g. `Math.max`) are not checked, since they name an external API rather than a project-owned identifier.

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
// whitelisted acronym token — HTTP is a recognized spec term
const httpClient = 1;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// loop iterators i/j/k are exempt
for (let i = 0; i < 10; i += 1) { void i; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// non-computed member expression property on an external API — not checked
const n = Math.max(1, 2);
void n;
```
