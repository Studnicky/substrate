---
title: '@studnicky/single-export'
description: 'Requires each non-index file to export exactly one named symbol matching the filename, except for exempt directories and constrained enum files.'
---

# @studnicky/single-export

Each non-index source file must export exactly one named symbol, and the export name must match the filename base (case-insensitively, supporting camelCase, PascalCase, and SCREAMING_SNAKE_CASE for constant modules). Default exports are forbidden in all files. `export *` is forbidden outside index files.

Index files (`index.ts`, `index.mts`, `index.cts`, `index.tsx`) are exempt from the single-symbol limit but still forbid default exports.

Restricted topology may be expressed either as folders (`entities/`, `errors/`, `interfaces/`, `constants/`, `types/`) or as filename suffixes such as `user.constants.ts` and `request.types.ts`. Those modules are exempt from the single-symbol and filename-match checks. Outside that topology, enum files are exempt only when every export is an `enum` or a const value.

Constant modules have an additional constraint: every exported symbol must use `SCREAMING_SNAKE_CASE`.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

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
// entities/UserEntity.ts — entity files may export their schema trio
export const UserEntitySchema = { type: 'object' } as const;
export type UserEntity = { id: string };
export function validateUserEntity(candidate: unknown): candidate is UserEntity { return true; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// http.constants.ts — constant modules may use fractal filename topology
export const DEFAULT_TIMEOUT = 1_000;
export const MAX_RETRIES = 3;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Direction.ts — enum files may also export companion constants
export enum Direction { Up, Down }
export const DEFAULT_DIRECTION = Direction.Up;
```
