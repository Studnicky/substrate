---
title: '@studnicky/no-trivial-shim'
description: 'Disallows wrapper functions that only forward or delegate a value without adding logic.'
---

# @studnicky/no-trivial-shim

Disallows functions whose entire body is a single return (or expression body) of a trivially forwarded value: an identifier, a call expression, an awaited expression, or a chain. Functions that construct new objects (`new`, `{}`, `[]`), access `this` members, or return literals are not trivial and are allowed. The auto-fix inlines the return expression.

**Fixable:** Yes (inlines the expression) · **Options:** `allowLiterals`, `allowMemberExpressions` · **Suggested severity:** `error`

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

## Options

```json
{
  "@studnicky/no-trivial-shim": ["error", {
    "allowLiterals": false,
    "allowMemberExpressions": false
  }]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowLiterals` | `boolean` | `false` | Allow functions that return a literal value. |
| `allowMemberExpressions` | `boolean` | `false` | Allow functions that return a member expression (e.g. `obj.prop`). |
