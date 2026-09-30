---
title: '@studnicky/explicit-return-binding'
description: 'Requires returned operations to bind their result to a const before returning it.'
---

# @studnicky/explicit-return-binding

Requires a returned operation to bind its result to a `const` before returning it. The rule is registered and enabled in this repository.

It reports a `return` whose argument is a call, optional-chained call, tagged template, or operator expression: binary, logical, conditional, unary, assignment, update, or comma. TypeScript assertion wrappers are unwrapped before classification.

It does not report a bare identifier, literal, `this`, member read, `new` expression, object, array, function, class, `await`, or `yield`. Those forms already name a value, construct one, or mark a suspension point rather than delegate a computation.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Interaction with `arrow-body-style`

This repository enables core `arrow-body-style` with `'always'`. Its autofix rewrites an expression-bodied arrow `() => compute()` into `() => { return compute(); }`, which this rule then reports. The rewrite is behavior-preserving; `eslint --fix` stops at that form, and the binding is written by hand:

<!-- inline-ts-ok: eslint rule example -->
```ts
const run = (): number => {
  const result = compute();
  return result;
};
```

## Survey basis

The house style is that a return which does work names its result before handing it back. No existing rule enforces this: all 97 `@stylistic` rules and all 146 rules configured in `eslint.config.ts` fail to match this shape. `sonarjs/prefer-immediate-return` enforces the opposite (it flags `const result = f(); return result;` and suggests inlining); it is not enabled in this config, and this rule supersedes it within the scope described above.

`grep -rl 'const result = ' packages/*/src --include='*.ts' | wc -l` finds 107 files already following the style; `grep -rn 'const result = ' packages/*/src --include='*.ts' | wc -l` finds 586 sites. Sampling those sites shows the bound expression is almost always a call — a method invocation or a static factory call.

`REQUIRES_BINDING_TYPES` excludes four categories, each disproven by direct codebase evidence:

- `AwaitExpression`/`YieldExpression` — `return await x;` appears 26 times and is never bound (`const result = await ...` matches 0 times). The `await` keyword already marks the suspension point.
- `NewExpression` — 37 unbound vs. 8 bound, dominated by unbound (`return new ModuleError(...)`, `return new Agent(options)`). Treated as construction, not delegation, matching how `TrivialExpression.isTrivial` treats factories and constructors.
- `ObjectExpression`/`ArrayExpression` — `return { ...` matches 5 times, all unbound.
- `MemberExpression` — plain field reads outside `this.` match 30 times, all unbound, at any chain depth.

## Switch-case exemption

A `return` that is a direct statement of a `SwitchCase`'s consequent — not nested inside a further block or conditional within that case — is exempt regardless of its argument shape. [`v8/switch-statements`](./v8/switch-statements.md) requires exactly that position to stay a single unbraced statement; wrapping it in a block to add a `const` binding is itself a violation of that rule. The two rules cannot both be satisfied for a delegating switch case, so this rule yields at that one position.

<!-- inline-ts-ok: eslint rule example -->
```ts
switch (action) {
  case 'start': return initialize();
  default: return undefined;
}
```

A `return` nested one level deeper inside the case — inside an `if`, a block, or any other statement — is not exempt and is still reported.

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
function f(): number {
  return Math.abs(-1);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function f(a: number, b: number): number {
  return a + b;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function f(g?: () => number): number | undefined {
  return g?.();
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
function f(value: number): number {
  return value;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function f(): { a: number } {
  return { a: 1 };
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
function f(): number {
  const result = g();
  return result;
}

function g(): number {
  return 1;
}
```

## Rule boundary

[`inline-trivial-logic`](./inline-trivial-logic.md) decides whether a forwarding wrapper should exist. This rule decides how a returned operation is structured. Both rules can report the same function when it contains a bound forwarding call.

## No autofix

The rule deliberately has no fixer. Binding a return expression can remove TypeScript contextual typing and widen values, including object-literal members in conditional return expressions. A manual repair preserves the intended type context.

A return type contextually typed by the function's declared return type — a literal-type member in a conditional return expression — widens to `string` once bound to an un-annotated `const`, producing `TypeContractClassification.ts(1983,5): TS2322`; an automated fix across this shape applies at 325 call sites in `packages/eslint-config/src` alone. Copying the enclosing function's declared return-type annotation onto the new `const` closes that specific case, but not a return type mentioning the function's own generic parameters, a conditional or mapped return type, an overload signature picking a different return type per call site, or a type nameable only in the declaration's enclosing scope — each can fail silently in ways no AST shape-check catches for every case, because binding a contextually-typed expression to a variable inherently changes how TypeScript infers it. Detection stays `error`; every violation — 754 across the codebase — is left for a manual fix.

## Configuration

```js
export default [{
  rules: {
    '@studnicky/explicit-return-binding': 'error'
  }
}];
```
