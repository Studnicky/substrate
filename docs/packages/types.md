---
title: '@studnicky/types'
description: Shared zero-runtime utility types and type-guard helpers.
---

# @studnicky/types

> Shared zero-runtime utility types and type-guard helpers for `@studnicky/substrate`.

## Install

```bash
pnpm add @studnicky/types
```

## Usage

All exports are zero-runtime — types are erased at compile time, `Wire` is a pure-static class.

```typescript
import type { JsonValue, JsonObject, DeepReadonly, DeepMergeType } from '@studnicky/types';
import { Wire } from '@studnicky/types';

// JsonValue — recursive readonly JSON-safe union
function serialize(v: JsonValue): string {
  return JSON.stringify(v);
}

// DeepReadonly — recursive readonly wrapper
function freeze<T>(v: T): DeepReadonly<T> {
  return Object.freeze(v) as DeepReadonly<T>;
}

// Wire — type-safe accessors for wire format values
const value = Wire.string(record, 'name');         // string | undefined
const num   = Wire.number(record, 'count');        // number | undefined
const bool  = Wire.boolean(record, 'active');      // boolean | undefined
```

### JSON Schema types

```typescript
import type { JsonSchema, JsonSchemaObject, JsonSchemaTypeName } from '@studnicky/types';

const schema: JsonSchemaObject = {
  type: 'object',
  properties: {
    name: { type: 'string' }
  }
};
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/types` | All types + `Wire` |
| `@studnicky/types/types` | `JsonValue`, `JsonObject`, `DeepReadonly`, `DeepMergeType`, `JsonSchema`, `JsonSchemaObject`, `JsonSchemaTypeName` |
| `@studnicky/types/guards` | `Wire` |

## Extending

`Wire` is a pure-static class. Extend it to add domain-specific accessors:

```typescript
import { Wire } from '@studnicky/types';

class DomainWire extends Wire {
  static userId(record: Record<string, unknown>, key: string): string | undefined {
    const v = Wire.string(record, key);
    return v?.startsWith('usr_') ? v : undefined;
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/types)
