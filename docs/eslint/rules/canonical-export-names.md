---
title: '@studnicky/canonical-export-names'
description: 'Disallows aliased exports and re-exports outside index files.'
---

# @studnicky/canonical-export-names

Disallows renaming a symbol at the export site. Every `ExportSpecifier` must export the local name unchanged, including in index files and type-only exports.

Outside `index.js`, `index.mjs`, `index.mts`, and `index.ts`, the rule also reports direct named re-exports, `export *` re-exports, `export =` assignments of imported bindings, and exporting an imported binding. It tracks a direct imported binding through one simple declaration such as `const localCopy = imported;` before checking a later export.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

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

<!-- inline-ts-ok: conceptual rule example -->
```ts
// index.ts
export { MyClass } from './MyClass.js';
export * from './helpers.js';
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
export { MyClass };
```
