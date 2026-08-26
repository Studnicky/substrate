---
title: '@studnicky/inline-trivial-logic'
description: 'Disallows wrapper functions that only forward or delegate a value without adding logic.'
---

# @studnicky/inline-trivial-logic

Disallows shim functions that only forward or delegate a value without adding logic. It examines an expression-bodied arrow, a single `return`, or the exact two-statement reduction `var`/`let`/`const result = expression; return result;` (leading empty statements are ignored). It can report a forwarded identifier, call, awaited expression, chain, or a non-`this` member expression. Correct remediation rewrites call sites and can change public or virtual dispatch semantics.

**Fixable:** No · **Options:** `allowLiterals`, `allowMemberExpressions` · **Suggested severity:** `error`

## Exemptions

The rule leaves these shapes alone because they are a value, a contract boundary, or do not have a safe call-site rewrite:

- factories that create an object, array, or instance; member access rooted at `this`; and a function returning `this`;
- literal and template-literal returns by default, and an identifier that selects one of multiple own parameters rather than forwarding a sole parameter;
- a function with a type-predicate return annotation;
- an inline function passed as a call or constructor argument, including through an object or array literal argument;
- a class function expression or arrow member mandated by an implemented/inherited member, or marked `protected` or `override`;
- calls that read instance state through `this` or a `#private` field, or that call through a `#private`, `private`, or `protected` receiver;
- calls whose arguments are not literals or a one-to-one relay of the function's own parameters; and
- a direct call through a locally scoped receiver, where the wrapper preserves that receiver's method binding.

A public zero-argument `this.method()` call and a direct call that forwards only its own parameters remain reportable shims.

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// Trivial call-through
function getUser(id: string): Promise<User> {
  return repository.findById(id);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Trivial identifier forward
const wrapValue = (v: string) => v;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Trivial await forward
async function fetchData(url: string): Promise<Data> {
  return await http.get(url);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// The explicit-return-binding spelling remains the same shim
function getUser(id: string): Promise<User> {
  const result = repository.findById(id);
  return result;
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Adds validation logic before delegating
function getUser(id: string): Promise<User> {
  validateId(id);
  return repository.findById(id);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Constructs a new object — not trivial
function createUser(name: string): User {
  return new User(name);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Callback position has no call site to inline into
runWhenEnabled(() => service.refresh());
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// The arguments do work; they are not a one-to-one forward
function withLimit(value: number, limit: number): number {
  return Math.min(value, limit - 1);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Default literal policy treats this function as the value it produces
function empty(): string {
  return '';
}
```

## Options

```json
{
  "@studnicky/inline-trivial-logic": ["error", {
    "allowLiterals": true,
    "allowMemberExpressions": false
  }]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowLiterals` | `boolean` | `true` | Allow functions that return a literal or template-literal value. Set `false` to report them. |
| `allowMemberExpressions` | `boolean` | `false` | Allow functions that return a member expression (e.g. `obj.prop`). |
