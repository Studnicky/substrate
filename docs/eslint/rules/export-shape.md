---
title: '@studnicky/export-shape'
description: 'Enforces a module export surface: one named export matching the filename, canonical export names, and index-only re-export placement.'
---

# @studnicky/export-shape

Governs the shape of a module's export surface: how many symbols it exports and what they are named relative to the filename, plus whether an export may be aliased or re-exported outside a package index.

## Export cardinality and naming

Each non-index source file must export exactly one named symbol, and the export name must match the filename base (case-insensitively, supporting camelCase, PascalCase, and SCREAMING_SNAKE_CASE for constant modules). Violating the count reports `tooMany`; violating the name match reports `mismatch`. Default exports are forbidden in all files (`defaultExport`). `export *` is forbidden outside index files (`exportAll`).

Index files (`index.ts`, `index.mts`, `index.cts`, `index.tsx`) are exempt from the single-symbol limit but still forbid default exports.

Restricted topology may be expressed either as folders (`entities/`, `errors/`, `interfaces/`, `constants/`, `types/`) or as filename suffixes such as `user.constants.ts` and `request.types.ts`. The `entities`, `errors`, `interfaces`, and `types` exemptions apply only when at least one export has the matching shape; a path alone does not earn an exemption. Constant modules are content-gated by their naming rule. Outside that topology, enum files are exempt only when every export is an `enum` or a const value.

A companion enum — a type alias and a const of the same name, the type + const satisfies-object pattern — earns the same exemption as an `enum` file, provided every other export in the file is a type alias or a const value. The file must still be named for the shared companion name.

Constant modules have an additional constraint: every exported symbol must use `SCREAMING_SNAKE_CASE` (`constantsCase`).

## Export naming and re-export placement

Every `ExportSpecifier` must export the local name unchanged, including in index files and type-only exports; renaming a symbol at the export site reports `exportAlias`.

Outside `index.js`, `index.mjs`, `index.mts`, and `index.ts`, the rule also reports direct named re-exports (`reExportOutsideIndex`), `export *` re-exports (`starReExportOutsideIndex`), `export =` assignments of imported bindings (`reExportOutsideIndex`), and exporting an imported binding (`exportImportedBindingOutsideIndex`). It tracks a direct imported binding through one simple declaration such as `const localCopy = imported;` before checking a later export.

The index-file basenames recognized for the cardinality checks and for the naming/re-export-placement checks are each their own fixed set, so a file may be treated as an index for one family of checks without being treated as one for the other.

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

<!-- inline-ts-ok: conceptual rule example -->
```ts
export { MyClass as TheClass };
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
// user-service.ts
export { MyClass } from './MyClass.js';
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
// user-service.ts
import { MyClass } from './MyClass.js';
const localCopy = MyClass;
export { localCopy };
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
// user-service.ts
export * from './helpers.js';
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// UserService.ts — single named export matching filename
export class UserService { /* ... */ }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// index.ts — multiple exports and re-exports are allowed in index files
export { UserService } from './UserService.js';
export * from './helpers.js';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// entities/UserEntity.ts — a genuine entity-shaped file may have multiple exports
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

<!-- inline-ts-ok: eslint rule example -->
```ts
// AvailabilityType.ts — a companion enum (type + const of the same name) may export a values sibling
export type AvailabilityType = 'date_specific' | 'regular'
export const AvailabilityType = {
  DATE_SPECIFIC: 'date_specific',
  REGULAR: 'regular'
} satisfies Record<string, AvailabilityType>
export const AvailabilityTypeValues: readonly AvailabilityType[] = Object.values(AvailabilityType)
```
