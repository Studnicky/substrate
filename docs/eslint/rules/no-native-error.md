---
title: "@studnicky/no-native-error"
description: "Requires every emitted error to be a named BaseError subclass, never a native error constructor, a reasonless abort, a thrown, rejected, or aborted value that is not a BaseError, or an unguarded call to a platform API that throws a native error."
---

# @studnicky/no-native-error

Disallows constructing or extending the native error constructors — `Error`, `TypeError`, `RangeError`, `SyntaxError`, `ReferenceError`, `EvalError`, `URIError`, `AggregateError`, and `DOMException` — and calling `abort()` on an `AbortController` without a reason. It also requires every thrown, rejected, or abort-reason value to be a `BaseError`. Every error a library emits is a named `BaseError` subclass that carries a stable code and name, so a consumer branches on the error's identity instead of parsing a message. A native error carries neither, and a bare `controller.abort()` rejects with a generic `DOMException` that names nothing about why the work stopped.

The rule reports the constructors with and without `new`, and a class declaration or expression whose `extends` clause is one of them directly. Names resolve through scope analysis: a local class, parameter, or import that shadows one of these names is not reported. The abort check reads the receiver's type through the TypeScript checker and fires only when the receiver is an `AbortController`; it requires typed linting, and other `.abort()` methods are untouched. `Promise.reject(new Error(...))` is reported once, at the construction. A native error name in a type-only position is not a construction and is not reported.

The value checks read types through the TypeScript checker and report nothing without typed linting. A value passes when its type is assignable to a class descending from a `baseClassNames` root, found by walking base types by declaration name; `unknown`, `any`, `Error`, and any union with a non-`BaseError` member are reported, while a value narrowed by `instanceof BaseError` passes.

- `throw <expr>` is checked. A throw inside a `catch` clause additionally says to narrow the `try` block so only the platform call or only the caller-supplied callback sits inside it.
- `reject(<expr>)` is checked for the second parameter of an inline `new Promise((resolve, reject) => …)` executor, followed through aliases, object-property and field stores, and parameters of callees declared in the same file. A `reject` handed to a library callee such as `.catch(reject)` is checked against the reason type the callee supplies. `Promise.reject(<expr>)` is checked directly. The `reject` member of a `PromiseWithResolvers` is identified by the checker, so `resolvers.reject(<expr>)`, `this.#field.reject(<expr>)`, `waiter?.reject(<expr>)`, and a destructured `const { reject } = Promise.withResolvers()` are all checked wherever they are called, and `resolvers.reject` handed to a callee is checked like an executor `reject`.
- `controller.abort(<reason>)` on an `AbortController` is checked; a bare `abort()` is reported as above.
- A throw inside the `BaseError` root's own file follows the same check.
- Every checked emission form — `throw`, executor `reject`, `PromiseWithResolvers` `reject`, and `Promise.reject` — is exempt lexically inside a method listed in `passThroughMethods` (default `CallerFault.propagate` and `CallerFault.rejection` from `@studnicky/types`): an error raised by caller-supplied code passes through those methods unchanged. Library-originated and platform errors never use them. An abort reason is not exempt.

A native construction passed as the value is reported once, at the construction.

**Platform calls.** A call, construction, or property read of a platform API that throws or rejects with a native error is reported unless it is lexically inside the `try` block of a try statement that has a `catch` clause, or is the receiver of a promise chain that ends in `.catch(...)` or `.then(_, onRejected)` within the same expression. A `try`/`finally` without `catch`, the `catch` block, and the `finally` block do not guard. The rule resolves the callee, constructed class, or property symbol through the checker and requires its declaration to come from the TypeScript default lib or `@types/node`; a local function or object with the same name is never reported. Globals declared inside `declare global` blocks of `@types/node` (such as `structuredClone` in a project without the DOM lib) count as global declarations. The message names the API and says to catch the native error and rethrow a named `BaseError` subclass with the original as `cause`, or to handle it as an absence value.

The default `platformCalls` cover `JSON.parse` with a non-literal argument, `JSON.stringify`, `structuredClone`, `new URL`, `new RegExp` and `RegExp()` with a non-literal pattern, `BigInt()` with a non-literal argument, `String.fromCodePoint` with any non-literal argument, `Array.from({ length })`, `new Array(n)` and `Array(n)` with a non-literal length, `String#repeat`, `padStart`, and `padEnd` with a non-literal count, `decodeURI`, `decodeURIComponent`, `encodeURI`, `encodeURIComponent`, `atob`, `btoa`, `TextDecoder#decode`, `fetch`, the body readers of `Response`, the IndexedDB factory, database, transaction, and object-store methods, the `Storage` methods, reads of `localStorage` and `sessionStorage` on `globalThis` and `window`, the `Worker` and `SharedWorker` constructors, `Worker#postMessage`, `Worker#terminate`, `MessagePort#postMessage`, every `crypto.subtle` method, the File System Access methods (`FileSystemDirectoryHandle` `getDirectoryHandle`, `getFileHandle`, `removeEntry`, `resolve`, `entries`, `keys`, `values`, and `for await` over the handle; `FileSystemFileHandle` `getFile`, `createWritable`, `createSyncAccessHandle`; `FileSystemWritableFileStream` `write`, `seek`, `truncate`, `close`; `FileSystemSyncAccessHandle` `read`, `write`, `flush`, `truncate`, `getSize`, `close`; `StorageManager#getDirectory`), and every function exported by `node:assert`, `node:assert/strict`, `node:fs`, `node:fs/promises`, `node:child_process`, `node:worker_threads`, `node:net`, `node:http`, `node:https`, and `node:zlib` except `fs.existsSync` and `net.isIP`, `isIPv4`, `isIPv6`, which never throw. `URL.parse` does not throw and is not listed. The option replaces the default list; `PlatformCallDefaults.build()` from `@studnicky/eslint-config/node` returns the defaults, so a consumer extends or filters that array instead of restating it. Each entry names the `kind` of use (`call`, `construct`, `read`, or `iterate` for a `for await` loop over a value of the named type), the `owner` that declares the member (an interface or class name, a module name without `node:`, `''` for a global, or `*` for any owner), the `member` (`*` for every member), and an optional `safeWhenLiteral` policy that exempts literal arguments. An argument is literal when it is a string, number, or template literal without substitutions, or when the checker types it as a string, number, or bigint literal (or a union of them): a `const` identifier, an `as const` member, or a readonly literal-typed property. A `let` variable and a widened `string` parameter are not literal; the policy `always` exempts the member entirely and shadows later entries.

An `abstract` class declaration whose name is listed in `baseClassNames` (default `BaseError`) may extend a native error constructor: it is the root every other error descends from. A non-abstract class with that name, a class expression, and any other name remain reported.

This rule is opt-in and is not part of any exported suite.

**Fixable:** No · **Options:** `baseClassNames`, `passThroughMethods`, `platformCalls`

## ✗ Incorrect

<!-- inline-ts-ok: eslint rule example -->

```ts
export const failure = new TypeError("expected a string");
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

<!-- inline-ts-ok: eslint rule example -->

```ts
export function rethrow(error: unknown): never {
  throw error;
}
```

<!-- inline-ts-ok: eslint rule example -->

```ts
export const pending = new Promise<void>((resolve, reject) => {
  const fail = (error: unknown): void => {
    reject(error);
  };
  fail(new Error("x"));
});
```

<!-- inline-ts-ok: eslint rule example -->

```ts
declare const reason: unknown;
new AbortController().abort(reason);
```

<!-- inline-ts-ok: eslint rule example -->

```ts
declare const raw: string;
export const value: unknown = JSON.parse(raw);
```

<!-- inline-ts-ok: eslint rule example -->

```ts
export function read(): void {
  try {
    return;
  } finally {
    localStorage.clear();
  }
}
```

## ✓ Correct

<!-- inline-ts-ok: eslint rule example -->

```ts
declare class BaseError {
  public constructor(message: string);
}
export class NotFoundError extends BaseError {}
export const failure = new NotFoundError("missing");
```

<!-- inline-ts-ok: eslint rule example -->

```ts
declare class BaseError {
  public constructor(message: string);
}
class AbortedError extends BaseError {}
const controller = new AbortController();
controller.abort(new AbortedError("cancelled"));
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

<!-- inline-ts-ok: eslint rule example -->

```ts
declare abstract class BaseError extends Error {
  public constructor(message: string);
}
class PlatformFailedError extends BaseError {}
export function rethrow(error: unknown): never {
  if (error instanceof BaseError) {
    throw error;
  }
  throw new PlatformFailedError("platform call failed");
}
```

<!-- inline-ts-ok: eslint rule example -->

```ts
export class CallerFault {
  public static propagate(value: unknown): never {
    throw value;
  }
}
```

<!-- inline-ts-ok: eslint rule example -->

```ts
declare abstract class BaseError extends Error {
  public constructor(message: string);
}
class RejectedError extends BaseError {}
export const pending = new Promise<void>((resolve, reject) => {
  reject(new RejectedError("rejected"));
});
```

<!-- inline-ts-ok: eslint rule example -->

```ts
declare class CallerFault {
  public static propagate(value: unknown): never;
}
declare function work(): void;
export function run(): void {
  try {
    work();
  } catch (error: unknown) {
    CallerFault.propagate(error);
  }
}
```

<!-- inline-ts-ok: eslint rule example -->

```ts
declare abstract class BaseError extends Error {
  public constructor(message: string, options?: { cause?: unknown });
}
class ParseFailedError extends BaseError {}
export function parse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (cause: unknown) {
    throw new ParseFailedError("text is not valid JSON", { cause });
  }
}
```

<!-- inline-ts-ok: eslint rule example -->

```ts
export const pending = fetch("https://example.test").catch(() => undefined);
```

## Options

```json
{
  "@studnicky/no-native-error": [
    "error",
    {
      "baseClassNames": ["BaseError"],
      "passThroughMethods": [
        { "class": "CallerFault", "method": "propagate" },
        { "class": "CallerFault", "method": "rejection" }
      ],
      "platformCalls": [
        { "kind": "call", "owner": "JSON", "member": "parse", "safeWhenLiteral": "never" }
      ]
    }
  ]
}
```

| Option               | Type                                                                                                                                                                                                              | Default                                                                                                  | Description                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseClassNames`     | `string[]`                                                                                                                                                                                                        | `["BaseError"]`                                                                                          | Names of `abstract` class declarations permitted to extend a native error constructor; a value assignable to a class descending from one of them is a `BaseError`.   |
| `passThroughMethods` | `{ class: string; method: string }[]`                                                                                                                                                                             | `[{ "class": "CallerFault", "method": "propagate" }, { "class": "CallerFault", "method": "rejection" }]` | Class and method pairs inside which a throw, executor `reject`, `PromiseWithResolvers` `reject`, or `Promise.reject` of a value that is not a `BaseError` is exempt. |
| `platformCalls`      | `{ kind: 'call' \| 'construct' \| 'read' \| 'iterate'; owner: string; member: string; safeWhenLiteral?: 'never' \| 'firstArgument' \| 'everyArgument' \| 'soleArgument' \| 'firstArgumentLength' \| 'always' }[]` | `PlatformCallDefaults.build()`                                                                           | Platform APIs whose use must sit inside a `try` block with a `catch` clause or a promise chain ending in a rejection handler. Replaces the default list.             |

## Rationale

A consumer cannot branch on a native `Error`: its `name` is one of nine generic strings and its `message` is prose. A named `BaseError` subclass gives every failure a code and a class a caller can match with `instanceof` or a discriminant. The abort reason is the same contract on the cancellation path — `controller.abort(reason)` makes `signal.reason` a named error instead of a `DOMException` with an `AbortError` name shared by every cancellation in the process.
