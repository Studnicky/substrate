---
title: '@studnicky/static-method-verbs'
description: 'Disallows freestanding functions at module scope.'
---

# @studnicky/static-method-verbs

Disallows module-scope function declarations and variable-bound arrow/function expressions — every freestanding function at the top level of a module, whether exported or not, is forbidden regardless of its name. Namespace bodies are transparent, and the rule also detects function-valued object members and object or array destructuring that binds such a function. Move the logic into a static method of a class instead. A function nested inside a class method, another function, or any non-module scope is never flagged.

Detection is gated by the `mode` option:

- `"any"` — flags every module-scope function declaration or const arrow/function-expression, with no exemption.
- `"structural"` (the default) — exempts a function whose entire body is a trivial single-statement pass-through: a block body containing only a `return` of an identifier, call expression, awaited expression, or chain (the same shape [`inline-trivial-logic`](./inline-trivial-logic.md) already flags), or the expression-bodied arrow equivalent. Any other body — multiple statements, real control flow, or a `return` that constructs a new object/array — is still flagged.
- `"typed"` — flags a function only when the type checker resolves its return type to a named type alias or interface, as opposed to a primitive, `void`, or an inline object-literal type with no name. Requires type-aware parser services (`parserOptions.project`); if they are unavailable the rule reports nothing at all.

An entity namespace's `validate` type guard is exempt in every mode. [`folder-content-shape`](./folder-content-shape.md) requires that exact schema-validation member, so the shared predicate keeps the two rules compatible.

**Fixable:** No · **Options:** `mode` · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// Multi-statement body — flagged in every mode
function compute(x: number): number { const y = x * 2; return y; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Expression-bodied arrow constructing a new object — not a trivial pass-through, flagged
const build = (x: number) => ({ value: x });
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
class Calculator {
  static compute(x: number): number { const y = x * 2; return y; }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
class Builder {
  static build(x: number): { value: number } { return { value: x }; }
}
```

## Structural exemption (default)

Under the default `"structural"` mode, a trivial single-return pass-through is exempt — it is `inline-trivial-logic`'s concern, not this rule's:

<!-- inline-ts-ok: eslint rule example -->
```ts
// Trivial pass-through — exempt under the default "structural" mode
export function identity(x: string): string { return x; }
```

## Options

```json
{
  "@studnicky/static-method-verbs": ["error", { "mode": "structural" }]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"any" \| "structural" \| "typed"` | `"structural"` | Detection mode: `any` flags every module-scope function; `structural` exempts trivial pass-through bodies (already covered by `inline-trivial-logic`); `typed` flags only functions whose return type is a named type/interface (requires type-aware parser services). |
