---
title: '@studnicky/no-type-aliasing'
description: 'Disallows naked type re-aliases, generic forwarding shims, and import aliases that hide canonical names.'
---

# @studnicky/no-type-aliasing

Disallows three aliasing patterns:

- **Primitive re-aliases**: `type Id = string` — use `string` directly.
- **Naked type re-aliases**: `type User = UserRecord` with no transformation — use `UserRecord` directly.
- **Generic forwarding shims**: `type List<T> = Array<T>` where the type parameters are forwarded unchanged.
- **Import aliases**: `import { Foo as Bar } from '...'` — use the canonical name `Foo`.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// Primitive re-alias
type Id = string;
type Count = number;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Naked type re-alias
type User = UserRecord;
type Opts = FetchOptions;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Generic forwarding shim
type List<T> = Array<T>;
type Dict<K, V> = Map<K, V>;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Import alias hides canonical name
import { UserRecord as User } from './user.js';
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Use canonical names directly at each site
import { UserRecord } from './user.js';

function save(record: UserRecord): Promise<void> { /* ... */ }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Transformed type aliases are allowed
type UserIdType = Pick<UserRecord, 'id'>;
type ReadonlyUser = Readonly<UserRecord>;
```
