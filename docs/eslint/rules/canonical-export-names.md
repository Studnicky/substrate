---
title: '@studnicky/canonical-export-names'
description: 'Disallows aliased exports and any non-index re-export path.'
---

# @studnicky/canonical-export-names

Disallows renaming symbols at the export site (`export { foo as bar }`) and disallows any non-index re-export path. Outside index files (`index.ts`, `index.mts`, etc.), the rule forbids direct re-exports (`export { Foo } from './foo.js'`), star re-exports (`export * from './foo.js'`), and forwarding an imported binding (`import { Foo } from './foo.js'; export { Foo };`). The same restriction applies to type-only imports and exports.

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

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗ userService.ts — import then export still re-exports
import { MyClass } from './myClass.js';
export { MyClass };
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
