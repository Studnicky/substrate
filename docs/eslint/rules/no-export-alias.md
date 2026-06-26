---
title: '@studnicky/no-export-alias'
description: 'Disallows aliased exports and re-exports outside index files.'
---

# @studnicky/no-export-alias

Disallows renaming symbols at the export site (`export { foo as bar }`) and disallows re-export statements outside index files. Re-exports that forward the same name unchanged are only permitted in index files (`index.ts`, `index.mts`, etc.). The rule also forbids `export *` outside index files.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗ userService.ts — renaming at export site
export { MyClass as TheClass };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗ userService.ts — re-export outside an index file
export { MyClass } from './myClass.js';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗ userService.ts — star re-export outside an index file
export * from './helpers.js';
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✓ index.ts — forwarding the canonical name unchanged
export { MyClass } from './MyClass.js';
export { UserService } from './UserService.js';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✓ index.ts — star re-export is permitted in index files
export * from './types.js';
```
