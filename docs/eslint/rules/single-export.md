---
title: '@studnicky/single-export'
description: 'Requires each non-index file to export exactly one named symbol matching the filename.'
---

# @studnicky/single-export

Each non-index source file must export exactly one named symbol, and the export name must match the filename base (case-insensitively, supporting camelCase, PascalCase, and SCREAMING_SNAKE_CASE for files under `constants/`). Default exports are forbidden in all files. `export *` is forbidden outside index files.

Index files (`index.ts`, `index.mts`, `index.cts`, `index.tsx`) are exempt from the single-symbol limit but still forbid default exports.

Exempt categories (files containing only these may export multiple symbols): type-only exports, const-value exports, enum exports, or error-class exports.

**Fixable:** No · **Options:** No · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// userService.ts — multiple named exports
export class UserService { /* ... */ }
export class AdminService { /* ... */ }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// userService.ts — default export
export default class UserService { /* ... */ }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// userService.ts — export name does not match filename
export class UserManager { /* ... */ }
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// UserService.ts — single named export matching filename
export class UserService { /* ... */ }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// index.ts — multiple exports are allowed in index files
export { UserService } from './UserService.js';
export { AdminService } from './AdminService.js';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// UserStatus.ts — type-only exports may have multiple symbols
export type UserStatusType = 'active' | 'inactive' | 'pending';
export type UserRoleType = 'admin' | 'user' | 'guest';
```
