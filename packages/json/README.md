# @studnicky/json

> JSON/object value-tools: deep merge, clone, equal, freeze, path access, sort, patch, hash

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/json)

A collection of pure-static utility classes for working with JSON-compatible values in TypeScript. Every class is V8-monomorphic, free of side effects, and safe to use in hot paths.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/json
```

## Usage

```ts
import { Clone, DataType, Draft, Frozen, FrozenMutationError, Hash, Merge, Patch, Path, Sort, StructuralHash } from '@studnicky/json';

// --- Merge ---
const base = { a: 1, b: { x: 10, y: 20 } };
const overlay = { b: { y: 99, z: 3 }, c: 'new' };
const merged = Merge.deep(base, overlay);
// { a: 1, b: { x: 10, y: 99, z: 3 }, c: 'new' }
// Arrays are replaced atomically; override mergeArrays to concat.

// --- Clone ---
const original = { items: [1, 2, 3], created: new Date() };
const copy = Clone.deep(original);
// copy !== original, copy.items !== original.items
const shallow = Clone.shallow({ a: 1, b: 2 });

// --- Path ---
const access = Path.toAccess('/items/0/name');
// 'items[0].name'

const obj = { user: { address: { city: 'Melbourne' } } };
const city = Path.get(obj, 'user.address.city');
// 'Melbourne'

// --- Sort ---
['file10', 'file2', 'file1'].sort(Sort.natural);
// ['file1', 'file2', 'file10']

['id', 'type', 'description'].sort(Sort.longestFirst);
// ['description', 'type', 'id']

['description', 'id', 'type'].sort(Sort.shortestFirst);
// ['id', 'type', 'description']

// --- Hash ---
const h = Hash.value({ b: 2, a: 1 });
// deterministic 8-char hex; key order normalised

// --- StructuralHash ---
const schemaHash = StructuralHash.of({ type: 'string', title: 'ignored', description: 'also ignored' });
// Same hash as StructuralHash.of({ type: 'string' })

// --- DataType ---
DataType.deepEqual({ a: [1, 2] }, { a: [1, 2] }); // true
DataType.isPlainObject({});                          // true
DataType.isRecord([]);                               // false
DataType.hasCycle({});                               // false

// --- Frozen ---
const frozen = Frozen.deepFreeze({ nested: { value: 42 } });
// Object.isFrozen(frozen) === true
// Frozen Map/Set mutation methods throw FrozenMutationError.

// --- Patch (instance-based, RFC-6902) ---
const doc = { status: 'draft', count: 0 };
const patch = Patch.create([
  { op: 'replace', path: '/status', value: 'published' },
  { op: 'add', path: '/count', value: 1 },
]);
patch.apply(doc);
// doc === { status: 'published', count: 1 }

// A single operation uses the same construction route:
Patch.create({ op: 'replace', path: '/status', value: 'published' }).apply(doc);

// --- Draft (mutate a draft, get an immutable result) ---
const base = { status: 'draft', tags: ['a'], untouched: { value: 1 } };

const next = Draft.produce(base, (draft) => {
  draft.status = 'published';
  draft.tags.push('b');
});
// next.status === 'published', next !== base, base untouched
// next.untouched === base.untouched (structural sharing — untouched branches keep the same reference)

// producePatch also returns the RFC-6902 patch that produced the result,
// reusing this package's own Patch operation shape:
const { next: n2, patch } = Draft.producePatch({ count: 0 }, (draft) => {
  draft.count = 1;
});
// patch === [{ op: 'replace', path: '/count', value: 1 }]
Patch.create(patch).apply({ count: 0 }); // === n2

// A no-op recipe returns base itself (reference identity):
Draft.produce(base, () => {}) === base; // true
```

## SchemaValidator

Compiles a JSON Schema 2020-12 document into a reusable type-guard predicate, backed by Ajv (`strict: true`, `allErrors: true`, `ajv-formats` registered). Entities declare a single schema and derive both their compile-time type and runtime guard from it, so there is no second, hand-written data declaration to drift out of sync.

```ts
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace RecordEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      count: { type: 'number' },
      id: { type: 'string' }
    },
    required: ['count', 'id'],
    type: 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  // Compile once at module load and reuse — compilation is the expensive step.
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}

function handle(payload: unknown): void {
  if (RecordEntity.validate(payload)) {
    payload.count; // narrowed to RecordEntity.Type
    return;
  }

  // validate.errors carries Ajv's ErrorObject[] after every call
  console.error(SchemaValidator.formatErrors(RecordEntity.validate.errors));
  // "(root): must have required property 'count'"
}
```

`SchemaValidator.compile` returns Ajv's `ValidateFunction<TValidated>` directly — it already narrows `unknown` to `TValidated` and exposes `.errors`. `SchemaValidator.formatErrors` renders that array into one human-readable line (falling back to `'invalid payload'` when there are no errors); override the `protected static formatError` step in a subclass to customise per-error wording.

Import `JSONSchema` and `FromSchema` directly from `json-schema-to-ts`, and import `ValidateFunction` directly from `ajv`; a consuming package declares both owners as direct dependencies. The schema and derivation may be split across files, with each site importing the owner symbol it uses. Public `JSONSchema7Type` annotations come from `json-schema`, with declarations supplied by the package's direct `@types/json-schema` dependency. `@studnicky/json` does not proxy-export these dependency-owned types.

`DraftNodeStateEntity`, `PatchApplyResultStatusEntity`, and `PathWildcardResultEntity` own the schema-expressible fields composed by the package's draft, patch-result, and wildcard-result interfaces. Runtime object graphs and `unknown` values remain on interfaces because they are not pure JSON Schema data contracts.

## Extending

All classes are pure-static (except `Patch`, which is instance-based). Each exposes `protected static` steps you can override in a subclass.

```ts
import { Merge } from '@studnicky/json';

// Concat arrays instead of replacing them
class ConcatMerge extends Merge {
  protected static override mergeArrays(base: unknown[], overlay: unknown[]): unknown[] {
    return [...base, ...overlay];
  }
}

const result = ConcatMerge.deep({ tags: ['a'] }, { tags: ['b'] });
// { tags: ['a', 'b'] }
```

Other useful overrides:

```ts
import { Hash } from '@studnicky/json';

// Include a custom salt in every hash
class SaltedHash extends Hash {
  protected static override hashValue(value: unknown): string {
    return `salt:${super.hashValue(value)}`;
  }
}

import { Frozen } from '@studnicky/json';

// Skip freezing class instances
class SelectiveFrozen extends Frozen {
  protected static override shouldFreeze(value: object): boolean {
    return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
  }
}
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/json

## License

MIT
