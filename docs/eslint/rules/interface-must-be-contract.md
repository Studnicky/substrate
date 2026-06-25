---
title: '@studnicky/interface-must-be-contract'
description: 'Interfaces express runtime contracts. Pure data shapes must be schema-derived type aliases.'
---

# @studnicky/interface-must-be-contract

An `interface` must carry at least one contract signal: a method signature, call signature, construct signature, function-typed property, or named-type reference (such as a class instance). Interfaces that contain only JSON-serializable property or index signatures are data shapes and must be declared as schema-derived `type XxxType` in an entity file.

**Fixable:** No · **Options:** `allow` (array of interface names to exempt) · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// Pure data shape — use a schema-derived type instead
interface UserRecord {
  id: string;
  name: string;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Index-only shape — no contract signals
interface StringMap {
  [key: string]: string;
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Contract — carries a method signature
interface UserRepositoryInterface {
  find(id: string): Promise<UserRecord>;
  save(user: UserRecord): Promise<void>;
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Contract — carries a named-type reference (class instance)
interface ServiceInterface {
  clock: Clock;
  logger: Logger;
  start(): Promise<void>;
}
```

## Options

```json
{
  "@studnicky/interface-must-be-contract": ["error", { "allow": ["LegacyShape"] }]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allow` | `string[]` | `[]` | Interface names to exempt from this rule. |
