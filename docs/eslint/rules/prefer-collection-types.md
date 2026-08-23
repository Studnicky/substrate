---
title: '@studnicky/prefer-collection-types'
description: 'Prefers Set/Map over arrays and POJOs for membership tests and keyed lookups.'
---

# @studnicky/prefer-collection-types

Flags four patterns where arrays or plain objects perform worse than `Set` or `Map`:

- **Pattern A**: Inline array literal membership using `.includes()` or an `indexOf()` comparison — use `new Set([...]).has(value)`.
- **Pattern B**: An `Object.fromEntries()` result accessed through computed brackets, directly or through a `const` binding — use `new Map(pairs).get(key)`.
- **Pattern C**: A `const` array used exclusively for `.includes()` or `indexOf()` membership tests, in any scope — declare it as `new Set(...)`.
- **Pattern D**: Array literal `.includes()` inside `.filter()`, `.some()`, `.every()`, `.find()`, or `.findIndex()` callbacks — convert the array to a `Set`.

Set.has is 29× faster than Array.includes on equal-size inputs.

**Fixable:** No · **Options:** `checkArrayLiterals`, `checkFromEntries`, `checkModuleScopeArrays` · **Suggested severity:** `warn`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// Pattern A — inline array .includes()
if (['admin', 'moderator', 'owner'].includes(role)) { /* ... */ }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Pattern C — const array used only for membership checks
const VALID_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
if (VALID_METHODS.includes(method)) { /* ... */ }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Pattern D — .includes() inside iteration callback
const active = users.filter(u => ['active', 'pending'].includes(u.status));
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Pattern B — Object.fromEntries accessed via computed key
const value = Object.fromEntries(pairs)[key];
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Use Set for membership tests
if (new Set(['admin', 'moderator', 'owner']).has(role)) { /* ... */ }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Module-scope Set
const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE']);
if (VALID_METHODS.has(method)) { /* ... */ }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Set inside iteration callback
const ACTIVE_STATUSES = new Set(['active', 'pending']);
const active = users.filter(u => ACTIVE_STATUSES.has(u.status));
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Use Map instead of fromEntries + bracket access
const map = new Map(pairs);
const value = map.get(key);
```

## Options

```json
{
  "@studnicky/prefer-collection-types": ["warn", {
    "checkArrayLiterals": true,
    "checkFromEntries": true,
    "checkModuleScopeArrays": true
  }]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `checkArrayLiterals` | `boolean` | `true` | Flag inline array literals used with `.includes()` or membership-style `indexOf()` comparisons (Patterns A and D). |
| `checkFromEntries` | `boolean` | `true` | Flag direct and const-bound `Object.fromEntries()` results accessed with computed bracket notation (Pattern B). |
| `checkModuleScopeArrays` | `boolean` | `true` | Flag const arrays used exclusively for `.includes()` or membership-style `indexOf()` tests (Pattern C). |
