---
title: '@studnicky/no-prefer-existing-type'
description: 'Disallows locally declared object types that duplicate or are subsumed by an imported type.'
---

# @studnicky/no-prefer-existing-type

Detects locally declared object-literal `type` aliases whose shape is already provided by a type exported from an imported package. The rule classifies matches as:

- **`exactMatch`** (`error` by default) — the local type is structurally identical to the imported type.
- **`nearMatch`** (`warn` by default) — the local type satisfies all required fields of the imported type but differs in optional fields.
- **`subsumedMatch`** (`warn` by default) — the imported type fully covers the local type, which is a strict subset.

The rule requires TypeScript type services. The default `minFields` threshold is `2` to avoid false positives on small shapes.

**Fixable:** No · **Options:** `exactMatch`, `nearMatch`, `subsumedMatch`, `minFields`, `excludePrefixes` · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
import type { FetchOptions } from './fetch.js';

// Local type is structurally identical to FetchOptions
type Options = { url: string; timeout: number };
```

<!-- inline-ts-ok: eslint rule example -->
```ts
import type { RequestConfig } from './http.js';

// Local type is a subset of RequestConfig
type Config = { method: string; headers: Record<string, string> };
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Import the canonical type directly
import type { FetchOptions } from './fetch.js';

function fetch(opts: FetchOptions): Promise<Response> { /* ... */ }
```

## Options

```json
{
  "@studnicky/no-prefer-existing-type": ["error", {
    "exactMatch": "error",
    "nearMatch": "warn",
    "subsumedMatch": "warn",
    "minFields": 2,
    "excludePrefixes": ["Internal", "Private"]
  }]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `exactMatch` | `'error' \| 'warn' \| 'off'` | `'error'` | Severity when the local type is structurally identical to an imported type. |
| `nearMatch` | `'error' \| 'warn' \| 'off'` | `'warn'` | Severity when the local type satisfies all required fields of an imported type. |
| `subsumedMatch` | `'error' \| 'warn' \| 'off'` | `'warn'` | Severity when an imported type fully covers the local type. |
| `minFields` | `integer` | `2` | Minimum number of fields before a type is considered for matching. |
| `excludePrefixes` | `string[]` | `[]` | Type name prefixes to exclude from checking. |
