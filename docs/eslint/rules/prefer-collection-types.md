---
title: '@studnicky/prefer-collection-types'
description: 'Prefers Set/Map over arrays and POJOs for membership tests and keyed lookups.'
---

# @studnicky/prefer-collection-types

Flags four patterns where arrays or plain objects perform worse than `Set` or `Map`:

- **Pattern A**: Inline array literal `.includes()` — `['a', 'b'].includes(x)` should use `new Set(['a', 'b']).has(x)`.
- **Pattern B**: `Object.fromEntries()` accessed via computed bracket — use `new Map(pairs).get(key)`.
- **Pattern C**: Module-scope `const` arrays used exclusively for `.includes()` membership tests — declare as `new Set(...)`.
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
// Pattern C — module-scope array used only for .includes()
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
| `checkArrayLiterals` | `boolean` | `true` | Flag inline array literals used with `.includes()` (Patterns A and D). |
| `checkFromEntries` | `boolean` | `true` | Flag `Object.fromEntries()` results accessed with computed bracket notation (Pattern B). |
| `checkModuleScopeArrays` | `boolean` | `true` | Flag module-scope const arrays used exclusively for `.includes()` membership tests (Pattern C). |
