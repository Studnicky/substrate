---
title: '@studnicky/no-freestanding-verb-noun'
description: 'Disallows freestanding verbNoun functions at module scope.'
---

# @studnicky/no-freestanding-verb-noun

Disallows module-scope function declarations and `const` arrow functions whose names start with a known verb prefix followed by an uppercase letter (e.g. `parseUser`, `createToken`, `getConfig`). Move the logic into a static method of a class named after the noun being produced.

The default verb set covers `get`, `set`, `create`, `parse`, `build`, `fetch`, `format`, `validate`, `serialize`, `deserialize`, `handle`, `process`, `transform`, `convert`, `map`, `filter`, `reduce`, and others.

**Fixable:** No · **Options:** `additionalPrefixes`, `ignorePrefixes` · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
function parseUser(raw: unknown): User { return raw as User; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const createToken = (payload: Payload): string => sign(payload);
```

<!-- inline-ts-ok: eslint rule example -->
```ts
export function getConfig(): Config { return loadConfig(); }
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
class User {
  static parse(raw: unknown): User { return raw as User; }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
class Token {
  static create(payload: Payload): string { return sign(payload); }
}
```

## Options

```json
{
  "@studnicky/no-freestanding-verb-noun": ["error", {
    "additionalPrefixes": ["emit", "spawn"],
    "ignorePrefixes": ["setup"]
  }]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `additionalPrefixes` | `string[]` | `[]` | Extra verb prefixes to ban beyond the built-in set. |
| `ignorePrefixes` | `string[]` | `[]` | Verb prefixes to allow (removes from the banned set). |
