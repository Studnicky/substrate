---
title: '@studnicky/folder-content-shape'
description: 'Folder location signals what a file top-level declarations must look like: entity Schema/Type/validate namespaces, interfaces/ vs types/ declaration form, and constants placement.'
---

# @studnicky/folder-content-shape

Folder location signals what a file's top-level declarations must look like. A file matches at most one of three mutually-exclusive categories, dispatched per-file — entity detection takes priority over folder-based declaration-form checking, which takes priority over the constants-count check:

1. **Entity files** (`entities/` folder, or `*Entity.ts`-style basenames, excluding barrel `index.*` files) must export a single namespace containing `Schema` (a `const` declared `as const`), `Type` (a type reference applying any schema-deriving type to `typeof Schema` — `FromSchema<typeof Schema>`, TypeBox's `Static<typeof Schema>`, or a project-local equivalent are all accepted identically), and `validate` (a type guard — either `SchemaValidator.compile<Type>(Schema)` or a hand-written `candidate is Type` predicate function).
2. **`interfaces/` vs `types/` folders** — files under an `interfaces/` folder must declare an `interface`, not a `type` alias; files under a `types/` folder must declare a `type` alias, not an `interface`. Only top-level declarations are judged. There is no path-based exemption from this check — a file under `tests/` or inside the `eslint-config` package itself is judged exactly like any other file.
3. **Constants placement** — all other files with 2+ top-level `const` declarations (excluding function/class-bound consts) must live under a `constants/` folder, or a `fixtures/` folder for test/example data.

None of the three categories above, nor the constants-placement check, is decided by folder name, package path, or declared identifier names — every determination is structural, from the parsed source:

- A file is an **entity file** because its basename structurally matches `*Entity.ts` (or it lives under an `entities/` folder) — never because some other file nearby happens to be one.
- A file is exempt from the constants-placement check (and, transitively, from the inline-regex check below) when it is structurally one of:
  - a **pure constants module** — every top-level statement is an import, a type declaration, or a `const` declaration whose declarators are all genuine data constants (no function, class, or non-collection `new` value mixed in). Such a file is, by its own content, already nothing but constants — moving it changes nothing, regardless of which folder it happens to live in.
  - a module that exports a namespace whose name ends in `Entity` — the same signal the entity-namespace check looks for, so a file carrying it is entity-shaped by content even if it lives outside an `entities/` folder.
  - a **pure re-export barrel** — every top-level statement re-exports from another module (`export … from '…'` / `export * from '…'`), with no local declaration of its own. A re-export carries no data of its own to relocate, whatever the file is named.

Renaming a directory, moving a file into a folder named `constants/`, or naming a declaration `Schema`/`validate`/`ajv` buys nothing on its own — a file that mixes a data constant with a function or class is still flagged for the data constant, no matter which folder it lives in.

A fourth, independent check runs alongside whichever category above a file falls into (except in files structurally exempt from the constants-placement check, per the same three bullets above): regex literals — `/pattern/flags` syntax, or `new RegExp('pattern', ...)` with an inlined string pattern — are data constants exactly like magic numbers and enums, and must never be declared inline. **This check is zero-tolerance** — a single inline regex is enough to flag it, unlike the 2+ threshold that applies to other constants.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## ✗ Incorrect

### Entity namespace shape

<!-- inline-ts-ok: eslint rule example -->
```ts
// missing namespace entirely
// (filename: src/FooEntity.ts)
export const FooEntity = {};
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Schema present but not declared as const
// (filename: src/FooEntity.ts)
import type { FromSchema } from 'json-schema-to-ts';

export namespace FooEntity {
  export const Schema = { type: 'object' };
  export type Type = FromSchema<typeof Schema>;
  export function validate(candidate: unknown): candidate is Type {
    return true;
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Type hand-written instead of derived from Schema
// (filename: src/FooEntity.ts)
export namespace FooEntity {
  export const Schema = { type: 'object' } as const;
  export type Type = { id: string };
  export function validate(candidate: unknown): candidate is Type {
    return true;
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// validate returns boolean instead of being a type guard
// (filename: src/FooEntity.ts)
import type { FromSchema } from 'json-schema-to-ts';

export namespace FooEntity {
  export const Schema = { type: 'object' } as const;
  export type Type = FromSchema<typeof Schema>;
  export function validate(_candidate: unknown): boolean {
    return true;
  }
}
```

### interfaces/ vs types/ declaration form

<!-- inline-ts-ok: eslint rule example -->
```ts
// pure-data type alias declared under interfaces/ — reserved for `interface` declarations
// (filename: src/interfaces/FooType.ts)
export type FooType = { readonly id: string };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// interface declared under types/ — reserved for `type` alias declarations
// (filename: src/types/FooInterface.ts)
export interface FooInterface { readonly id: string; }
```

### Constants placement

<!-- inline-ts-ok: eslint rule example -->
```ts
// two data consts mixed with a function const — still flagged for the two data consts;
// the folder name alone does not exempt the file, since mixing a function disqualifies
// the pure-constants-module exemption
// (filename: src/constants/mixed.ts)
export const MAX = 3;
export const MIN = 1;
export const handler = (): void => {};
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// index.ts mixing local consts with a re-export — still flagged; it is neither
// a pure re-export barrel nor a pure constants module
// (filename: src/index.ts)
export * from './helpers.js';
export const ALPHA = 1;
export const BETA = 2;
```

### Inline regex literals (zero-tolerance)

<!-- inline-ts-ok: eslint rule example -->
```ts
// single inline regex literal nested inside a function body — flagged, unlike the 2+ threshold for other constants
// (filename: src/validation/isEmail.ts)
export function isEmail(value: string): boolean {
  return /^[^@]+@[^@]+$/u.test(value);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// inline new RegExp(...) construction with a literal string pattern — flagged
// (filename: src/validation/normalize.ts)
export function normalize(value: string): string {
  return value.replace(new RegExp('[\\s]+', 'g'), ' ');
}
```

## ✓ Correct

### Entity namespace shape

<!-- inline-ts-ok: eslint rule example -->
```ts
// valid entity: Schema as const, Type from FromSchema, function type guard
// (filename: src/FooEntity.ts)
import type { FromSchema } from 'json-schema-to-ts';

export namespace FooEntity {
  export const Schema = { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } as const;
  export type Type = FromSchema<typeof Schema>;
  export function validate(candidate: unknown): candidate is Type {
    return typeof (candidate as Record<string, unknown>).id === 'string';
  }
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// valid entity: validate compiled from schema via SchemaValidator.compile<Type>(Schema)
// (filename: src/FooEntity.ts)
import { SchemaValidator } from '@studnicky/json';
import type { FromSchema } from 'json-schema-to-ts';

export namespace FooEntity {
  export const Schema = { type: 'object' } as const;
  export type Type = FromSchema<typeof Schema>;
  export const validate = SchemaValidator.compile<Type>(Schema);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// index.ts barrel under entities/ is exempt from namespace checks
// (filename: src/entities/index.ts)
export * from './FooEntity.js';
export * from './BarEntity.js';
```

### interfaces/ vs types/ declaration form

<!-- inline-ts-ok: eslint rule example -->
```ts
// interface declared under interfaces/ — not flagged
// (filename: src/interfaces/FooInterface.ts)
export interface FooInterface { readonly id: string; run(): void; }
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// type alias declared under types/ — not flagged
// (filename: src/types/FooType.ts)
export type FooType = { readonly id: string };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// type alias not under interfaces/ or types/ — unrelated folder, not flagged
// (filename: src/models/FooType.ts)
export type FooType = { readonly id: string };
```

### Constants placement

<!-- inline-ts-ok: eslint rule example -->
```ts
// single top-level const — not flagged
// (filename: src/http/client.ts)
export const MAX_RETRIES = 3;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// validate is a function const, structurally excluded; only Schema remains,
// below the 2+ threshold
// (filename: src/schemas/thing.ts)
const Schema = {};
export const validate = (): boolean => true;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// a pure constants module — every top-level declaration is a data const,
// nothing else in the file — exempt by content, regardless of folder
// (filename: src/http/client.ts)
export const TIMEOUT_MS = 1000;
export const MAX_RETRIES = 3;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// two top-level function consts — not flagged, functions are not data constants
// (filename: src/components/Button.ts)
export const handleClick = (): void => {};
export const handleSubmit = (): void => {};
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// a pure re-export barrel, not named index.ts — exempt by content, not filename
// (filename: src/aggregate.ts)
export * from './helpers.js';
export * from './other.js';
```

### Inline regex literals

<!-- inline-ts-ok: eslint rule example -->
```ts
// a pure constants module holding a single regex data const — exempt by
// content, coincidentally under constants/
// (filename: src/constants/patterns.ts)
export const EMAIL_PATTERN = /^[^@]+@[^@]+$/u;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// regex imported from constants/ and only referenced by name — no inline literal present, not flagged
// (filename: src/validation/isEmail.ts)
import { EMAIL_PATTERN } from '../constants/patterns.js';

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// "new RegExp(pattern)" built from a runtime variable, not an inlined string literal — not flagged
// (filename: src/validation/matches.ts)
export function matches(value: string, pattern: string): boolean {
  return new RegExp(pattern).test(value);
}
```
