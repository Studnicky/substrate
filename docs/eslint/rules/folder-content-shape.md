---
title: '@studnicky/folder-content-shape'
description: 'Constrains entity boundaries, declaration folders, top-level data constants, and inline regex literals.'
---

# @studnicky/folder-content-shape

Constrains a file through one of three mutually exclusive categories, with entity detection taking precedence over declaration-folder checks, which take precedence over the constants check. An independent inline-regex check runs for every category unless the module is structurally exempt from the constants check.

**Fixable:** No · **Options:** No · **Suggested severity:** `error`

## Entity files

An entity file is a non-barrel file under an `entities/` path segment or with a basename matching `*Entity` plus a TypeScript or JavaScript extension. It must export a namespace whose name matches the filename base. The namespace must export:

- `Schema`: a value-first `const`, either authored with `as const` or built by a schema-builder call;
- `Type`: a type alias derived from `typeof Schema`; and
- `validate`: either `SchemaValidator.compile<Type>(Schema)` or a function type guard;
- `intake`: `SchemaValidator.compileIntake<Type>(Schema)`, the boundary that returns a newly proven entity value; and
- `create`: `SchemaValidator.compileCreate<Type>(Schema)` when the `Schema` declarator is an object literal whose top-level `type` property is `'object'`.

`validate` narrows in place, while `intake` returns a new value whose type proves it crossed the unparsed-input boundary. `create` has a different provenance contract: it accepts locally produced partial object data without intake's coercion, default-filling, or unknown-property stripping. Scalars do not require `create`; `Partial<'healthy' | 'degraded'>` has no useful meaning.

The object-only decision reads the `Schema` declarator's own top-level `type` property. A nested property schema does not count. When a builder call, spread, or composition does not expose a literal root type, the rule does not require `create`, avoiding a false positive.

The rule reports a missing namespace and every namespace export that does not match the entity filename. It checks every exported namespace rather than silently choosing one.

<!-- inline-ts-ok: conceptual rule example -->
```ts
// src/entities/UserEntity.ts
import { SchemaValidator } from '@studnicky/json';
import type { FromSchema } from 'json-schema-to-ts';

export namespace UserEntity {
  export const Schema = { type: 'object' } as const;
  export type Type = FromSchema<typeof Schema>;
  export const validate = SchemaValidator.compile<Type>(Schema);
  export const intake = SchemaValidator.compileIntake<Type>(Schema);
  export const create = SchemaValidator.compileCreate<Type>(Schema);
}
```

<!-- inline-ts-ok: scalar entity example -->
```ts
// src/entities/HealthStatusEntity.ts
import { SchemaValidator } from '@studnicky/json';
import type { FromSchema } from 'json-schema-to-ts';

export namespace HealthStatusEntity {
  export const Schema = { enum: ['healthy', 'degraded'], type: 'string' } as const;
  export type Type = FromSchema<typeof Schema>;
  export const validate = SchemaValidator.compile<Type>(Schema);
  export const intake = SchemaValidator.compileIntake<Type>(Schema);
}
```

## `interfaces/` and `types/` folders

Outside entity files, a top-level `type` alias under an `interfaces/` path segment is reported, as is a top-level `interface` under a `types/` path segment. A declaration remains top-level when wrapped by export declarations or TypeScript namespaces; declarations inside functions, classes, and ordinary blocks are out of scope. For paths in `packages/<package>/…`, the package name itself does not count as a convention-folder segment.

<!-- inline-ts-ok: conceptual rule example -->
```ts
// src/interfaces/UserInterface.ts
export interface UserInterface {
  readonly id: string;
}
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
// src/types/UserType.ts
export type UserType = {
  readonly id: string;
};
```

## Data constants

For files that are neither entity nor declaration-folder files, the rule reports two or more top-level data-constant declarators when the module also contains other top-level content. Function-valued constants, member references, non-literal factory calls, dispatch maps, and non-collection instances are not data constants. `Set`, `Map`, `WeakSet`, and `WeakMap` constructions are data constants; `Number`, `String`, and `Boolean` calls with one literal argument are also data constants.

A module is structurally exempt from both this check and the inline-regex check when it is one of the following:

- a pure constants module: every top-level statement is an import, type declaration, or data `const` declaration;
- a module exporting a namespace whose name ends in `Entity`; or
- a pure re-export barrel with no local declarations.

The report directs authors to isolate a flagged group in a `constants/` folder, or a `fixtures/` folder for test and example data, under one exported frozen object literal.

Folder names and declaration names do not grant an exemption. Moving a mixed module into `constants/`, renaming its directory, or naming declarations `Schema`, `validate`, or `ajv` does not change its parsed structure.

<!-- inline-ts-ok: conceptual rule example -->
```ts
// A pure constants module is exempt regardless of its path.
export const TIMEOUT_MS = 1000;
export const MAX_RETRIES = 3;
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
// A data-constant group mixed with another top-level declaration is reported.
export const MAX_RETRIES = 3;
export const MIN_RETRIES = 1;
export function run(): void {}
```

## Inline regex literals

Regex literals and `new RegExp(...)` calls whose first argument is a static string are reported outside the structural exemptions above. A static pattern is a string literal, a template literal without expressions, or a `+` expression composed only of static strings. One inline pattern is sufficient to report; there is no two-constant threshold for regexes.

<!-- inline-ts-ok: conceptual rule example -->
```ts
export function isEmail(value: string): boolean {
  return /^[^@]+@[^@]+$/u.test(value);
}
```

<!-- inline-ts-ok: conceptual rule example -->
```ts
export function matches(value: string, pattern: string): boolean {
  return new RegExp(pattern).test(value);
}
```

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /project/src/FooEntity.ts
import { SchemaValidator } from '@studnicky/json';
import type { FromSchema } from 'json-schema-to-ts';

export namespace FooEntity {
  export const Schema = { type: 'object' } as const;
  export type Type = FromSchema<typeof Schema>;
  export const validate = SchemaValidator.compile<Type>(Schema);
  export const create = SchemaValidator.compileCreate<Type>(Schema);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /project/src/interfaces/FooType.ts
export type FooType = { readonly id: string };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /project/src/http/mixedWithFunction.ts
export const MAX_RETRIES = 3;
export const TIMEOUT_MS = 1000;
export const onClick = (): void => {};
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /project/src/validation/normalize.ts
export function normalize(value: string): string {
  return value.replace(new RegExp("[\\s]+", "g"), " ");
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /project/src/FooEntity.ts
import type { FromSchema } from 'json-schema-to-ts';

export namespace FooEntity {
  export const Schema = { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } as const;
  export type Type = FromSchema<typeof Schema>;
  export const validate = SchemaValidator.compile<Type>(Schema);
  export const intake = SchemaValidator.compileIntake<Type>(Schema);
  export const create = SchemaValidator.compileCreate<Type>(Schema);
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /project/src/http/client.ts
export const TIMEOUT_MS = 1000;
export const MAX_RETRIES = 3;
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /project/src/aggregate.ts
export * from './helpers.js';
export * from './other.js';
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// filename: /project/src/validation/matches.ts
export function matches(value: string, pattern: string): boolean {
  return new RegExp(pattern).test(value);
}
```
