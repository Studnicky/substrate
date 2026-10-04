---
title: '@studnicky/require-options-object'
description: 'Requires functions with two or more optional parameters to collect them into a trailing options object.'
---

# @studnicky/require-options-object

When a function or method has two or more caller-omittable parameter slots, they must be collected into a single trailing options object. The threshold defaults to `minimumOptionals: 2` and is configurable. The rule counts `?` parameters, defaulted parameters, parameters typed `T | undefined`, and optional members of a rest tuple. It applies to function declarations, function expressions, arrow functions, and TypeScript call, construct, function, and method signatures.

**Fixable:** No · **Options:** `minimumOptionals` · **Suggested severity:** `error`

## Detection

A parameter whose own type annotation is a union that includes `undefined` (`value: T | undefined`) counts as one optional slot even without a `?` or a default value, since a caller may pass `undefined` explicitly at any call site. A rest parameter typed as a tuple (`...args: [name?: string, age?: number]`) is not a single non-optional unit: each optional tuple member contributes its own optional slot to the count — a named tuple member marks itself via `optional: true`, and an unnamed member wraps its element type in `TSOptionalType`.

A trailing parameter satisfies the options-object requirement only when its type literal declares at least one named member (a property or method signature). An empty `{}` or a pure index-signature literal (`{ [key: string]: unknown }`) carries none of a real options object's type safety, so neither is accepted as the collecting parameter.

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
  "@studnicky/require-options-object": ["error", { "minimumOptionals": 2 }]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minimumOptionals` | `integer` | `2` | Minimum number of caller-omittable parameter slots before an options object is required. Minimum value is `2`. |
