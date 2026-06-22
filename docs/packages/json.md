---
title: '@studnicky/json'
description: JSON/object value-tools — deep merge, clone, equal, freeze, patch, hash, path, sort.
---

# @studnicky/json

> JSON/object value-tools: deep merge, clone, equal, freeze, path access, sort, patch, hash.

## Install

```bash
pnpm add @studnicky/json
```

## Usage

All exports are pure-static utility classes — no state, no singletons.

```typescript
import { Clone, Merge, DataType, Frozen, Hash, Path, Sort, Patch } from '@studnicky/json';

// Deep clone (Map/Set/Date aware)
const copy = Clone.deep(original);

// Shallow clone
const shallow = Clone.shallow(obj);

// Deep merge — type-safe, V8-monomorphic
const merged = Merge.deep(base, overlay);

// Deep structural equality (NaN/Date/RegExp/Set/Map aware)
const equal = DataType.deepEqual(a, b);

// Cycle-safe deep freeze
const frozen = Frozen.deep(value);

// FNV-1a 32-bit hash for JSON-compatible values
const hash = Hash.fnv32(value);

// JSON Pointer → dot-path access
const val = Path.get(obj, 'user.profile.name');

// Natural sort comparator
const sorted = [...items].sort(Sort.natural);

// RFC 6902 JSON Patch
const result = Patch.apply(document, [
  { op: 'replace', path: '/name', value: 'Alice' }
]);
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/json` | `Clone`, `DataType`, `Frozen`, `Hash`, `Merge`, `Patch`, `Path`, `Sort`, `StructuralHash`, `PatchError` |
| `@studnicky/json/json` | All utility classes |
| `@studnicky/json/types` | `DeepMergeType`, `PatchApplyResultType`, `PatchOperationType`, `PatchOpVariantType` |
| `@studnicky/json/errors` | `PatchError` |
| `@studnicky/json/interfaces` | `PathWildcardResultType` |

## Extending

Since the utilities are pure-static, compose them by wrapping in a domain-specific static class:

```typescript
import { Merge, Clone } from '@studnicky/json';

class ConfigUtils {
  static merge<T extends object>(base: T, overrides: Partial<T>): T {
    return Merge.deep(Clone.deep(base), overrides as T);
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/json)
