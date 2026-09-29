---
title: '@studnicky/no-native-error'
description: 'Requires every emitted error to be a named BaseError subclass, never a native error constructor or a reasonless abort.'
---

# @studnicky/no-native-error

Disallows constructing or extending the native error constructors — `Error`, `TypeError`, `RangeError`, `SyntaxError`, `ReferenceError`, `EvalError`, `URIError`, `AggregateError`, and `DOMException` — and calling `abort()` on an `AbortController` without a reason. Every error a library emits is a named `BaseError` subclass that carries a stable code and name, so a consumer branches on the error's identity instead of parsing a message. A native error carries neither, and a bare `controller.abort()` rejects with a generic `DOMException` that names nothing about why the work stopped.

The rule reports the constructors with and without `new`, and a class declaration or expression whose `extends` clause is one of them directly. Names resolve through scope analysis: a local class, parameter, or import that shadows one of these names is not reported. The abort check reads the receiver's type through the TypeScript checker and fires only when the receiver is an `AbortController`; it requires typed linting, and other `.abort()` methods are untouched. `Promise.reject(new Error(...))` is reported once, at the construction. A native error name in a type-only position is not a construction and is not reported.

An `abstract` class declaration whose name is listed in `baseClassNames` (default `BaseError`) may extend a native error constructor: it is the root every other error descends from. A non-abstract class with that name, a class expression, and any other name remain reported.

This rule is opt-in and is not part of any exported suite.

**Fixable:** No · **Options:** `baseClassNames`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->
```ts
export const failure = new TypeError('expected a string');
```

<!-- inline-ts-ok: eslint rule example -->
```ts
export class NotFoundError extends Error {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
const controller = new AbortController();
controller.abort();
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->
```ts
declare class BaseError {
  public constructor(message: string);
}
export class NotFoundError extends BaseError {}
export const failure = new NotFoundError('missing');
```

<!-- inline-ts-ok: eslint rule example -->
```ts
declare class BaseError {
  public constructor(message: string);
}
class AbortedError extends BaseError {}
const controller = new AbortController();
controller.abort(new AbortedError('cancelled'));
```

<!-- inline-ts-ok: eslint rule example -->
```ts
export abstract class BaseError extends Error {}
```

<!-- inline-ts-ok: eslint rule example -->
```ts
export function isFailure(value: unknown): value is Error {
  return value instanceof Error;
}
```

## Options

```json
{
  "@studnicky/no-native-error": ["error", { "baseClassNames": ["BaseError"] }]
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseClassNames` | `string[]` | `["BaseError"]` | Names of `abstract` class declarations permitted to extend a native error constructor. |

## Rationale

A consumer cannot branch on a native `Error`: its `name` is one of nine generic strings and its `message` is prose. A named `BaseError` subclass gives every failure a code and a class a caller can match with `instanceof` or a discriminant. The abort reason is the same contract on the cancellation path — `controller.abort(reason)` makes `signal.reason` a named error instead of a `DOMException` with an `AbortError` name shared by every cancellation in the process.
