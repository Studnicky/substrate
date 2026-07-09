---
title: '@studnicky/json'
description: JSON and object utilities for deep merge, clone, equality, freeze, patch, hash, path access, and sort.
---

# @studnicky/json

> JSON/object value-tools: deep merge, clone, equal, freeze, path access, sort, patch, hash.

## Install

```bash
pnpm add @studnicky/json
```

## Merge and Clone

Deep merge nested objects: overlay wins on conflict, base keys are preserved, and arrays are replaced atomically by default. Clone produces a new object with no shared references, with full Date/Map/Set awareness:

<<< ../../packages/json/examples/merge-clone.ts#usage

## Try it

<RunnableExample src="packages/json/examples/merge-clone" title="Deep merge and clone" />

The output shows overlay keys winning on conflict, base keys preserved, arrays replaced atomically by default, and `ConcatMerge` demonstrating the static-override subclass pattern.

## Patch, DataType, and Frozen

Apply RFC-6902 JSON Patch operations using either the constructor or static factory methods. `DataType` provides deep structural equality and type guards. `Frozen.deepFreeze` freezes all levels safely, including circular structures:

<<< ../../packages/json/examples/patch-datatype.ts#usage

## Path, Sort, Hash, and StructuralHash

Convert JSON Pointers to JS access notation, read values via proto-safe dot-paths, sort arrays naturally, and produce deterministic FNV-1a hashes. `StructuralHash` strips annotation-only keys (`$id`, `title`, `description`) before hashing:

<<< ../../packages/json/examples/path-sort-hash.ts#usage

## SchemaValidator

Compile a JSON Schema 2020-12 document into a reusable type-guard predicate, backed by Ajv (`strict: true`, `allErrors: true`, `ajv-formats` registered). Declare a single schema as the source of truth and derive both the compile-time type and the runtime guard from it, so there is no second, hand-written validator to drift out of sync:

<!-- inline-ts-ok: conceptual usage snippet; no transcludable example file exists for SchemaValidator -->
```ts
import { SchemaValidator } from '@studnicky/json';

const schema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    count: { type: 'number' },
  },
  required: ['id', 'count'],
  additionalProperties: false,
} as const;

interface RecordType {
  id: string;
  count: number;
}

// Compile once at module load and reuse — compilation is the expensive step.
const isRecord = SchemaValidator.compile<RecordType>(schema);

if (isRecord(payload)) {
  payload.count; // narrowed to RecordType
} else {
  // isRecord.errors carries Ajv's ErrorObject[] after every call
  SchemaValidator.formatErrors(isRecord.errors);
  // "(root): must have required property 'count'"
}
```

`SchemaValidator.compile` returns Ajv's `ValidateFunction<TValidated>` directly — it already narrows `unknown` to `TValidated` and exposes `.errors`. `SchemaValidator.formatErrors` renders that array into one human-readable line, falling back to `'invalid payload'` when there are no errors. Override the `protected static formatError` step in a subclass to customise per-error wording.

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/json` | `Clone`, `DataType`, `Frozen`, `Hash`, `Merge`, `Patch`, `Path`, `Sort`, `StructuralHash`, `SchemaValidator`, `PatchError` |
| `@studnicky/json/json` | All utility classes |
| `@studnicky/json/types` | `DeepMergeType`, `PatchApplyResultType`, `PatchOperationType`, `PatchOpVariantType` |
| `@studnicky/json/errors` | `PatchError` |
| `@studnicky/json/interfaces` | `PathWildcardResultType` |
| `@studnicky/json/schema` | `SchemaValidator` |

## Extending

Since the utilities are pure-static, compose them by wrapping in a domain-specific static class. The `merge-clone` example above shows subclassing `Merge` to change array-merge behaviour.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/json)
