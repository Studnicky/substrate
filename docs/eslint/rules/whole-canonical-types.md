---
title: '@studnicky/whole-canonical-types'
description: 'Bans Partial/Pick/Omit subset views of canonical, codebase-owned named types.'
---

# @studnicky/whole-canonical-types

Bans deriving `Partial<X>`, `Pick<X, K>`, or `Omit<X, K>` subset views from canonical, codebase-owned named `type`/`interface` declarations — most often entity `.Type`s. `Partial`/`Pick`/`Omit` silently narrow a canonical shape into an ad-hoc subset, so downstream consumers stop being forced to reckon with every property the canonical shape actually carries. If a genuinely different shape is needed, define an explicit, fully-spelled-out type/entity for it instead of deriving one positionally from the canonical type. The rule uses the TypeScript type checker to resolve the utility's first type argument to its declaration(s): a local generic type parameter, an inline object-literal type, or a type declared entirely in `node_modules` is not flagged, since those are not "our" canonical domain shapes being silently subsetted — only a named `type`/`interface` this codebase itself declares is. This rule has **no directive-comment exemption** — an `eslint-disable` comment is not honored or expected for it. This is a deliberate design choice, not an oversight: partial views of canonical shapes are a correctness hazard by construction, so the fix is always to use the full type or define an explicit new one, never to suppress the finding.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// 'Partial<X>' on a local canonical type alias — flagged
type FooType = { a: number; b: string }; type BarType = Partial<FooType>;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// 'Pick<X, K>' on a local canonical type alias — flagged
type FooType = { a: number; b: string }; type BarType = Pick<FooType, 'a'>;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// 'Omit<X, K>' on a local canonical interface — flagged
interface FooInterface { a: number; method(): void; }
type BarType = Omit<FooInterface, 'a'>;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// 'Partial<X>' used as a function parameter type — flagged
type FooType = { a: number };
function accept(value: Partial<FooType>): void {}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// 'Partial<T>' on a generic type parameter — not flagged, T is not a canonical owned shape
function accept<T>(value: Partial<T>): void {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// 'Partial<{...}>' on an inline object-literal type — not flagged, no named canonical type referenced
type BarType = Partial<{ a: number; b: string }>;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// 'Required<X>' — not flagged, not a subsetting utility (does not hide properties)
type FooType = { a: number }; type BarType = Required<FooType>;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// 'Partial<X>' on a type declared in node_modules — not flagged, not a domain
// shape this codebase owns
import type { Rule } from 'eslint';
type BarType = Partial<Rule.RuleModule>;
```
