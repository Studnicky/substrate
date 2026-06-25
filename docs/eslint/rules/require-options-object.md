---
title: '@studnicky/require-options-object'
description: 'Requires functions with two or more optional parameters to collect them into a trailing options object.'
---

# @studnicky/require-options-object

When a function or method has two or more optional parameters, they must be collected into a single trailing options object. The threshold defaults to `minOptionals: 2` and is configurable. Applies to function declarations, function expressions, arrow functions, and TypeScript call, construct, and method signatures.

**Fixable:** No · **Options:** `minOptionals` · **When enabled by `createEslintConfig()`:** `error`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
// Two optional parameters — collect into options object
function fetch(url: string, timeout?: number, retries?: number): Promise<Response> {
  /* ... */
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Three optional parameters on a method
class HttpClient {
  request(url: string, method?: string, body?: string, signal?: AbortSignal): Promise<Response> {
    /* ... */
  }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
// Collected into a trailing options object
function fetch(url: string, opts?: { timeout?: number; retries?: number }): Promise<Response> {
  /* ... */
}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
// Method with options object
class HttpClient {
  request(url: string, opts?: { method?: string; body?: string; signal?: AbortSignal }): Promise<Response> {
    /* ... */
  }
}
```

## Options

```json
{
  "@studnicky/require-options-object": ["error", { "minOptionals": 2 }]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minOptionals` | `integer` | `2` | Minimum number of optional parameters before an options object is required. Minimum value is `2`. |
