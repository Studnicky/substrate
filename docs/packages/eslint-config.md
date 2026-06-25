---
title: '@studnicky/eslint-config'
description: Shared ESLint flat config for @studnicky packages.
---

# @studnicky/eslint-config

Shared ESLint flat config factory for TypeScript projects. Ships a single `createEslintConfig()` call that wires up typescript-eslint, stylistic, perfectionist, import ordering, unused-imports, regexp, and two custom rule plugins. The custom rules enforce structural, semantic, and V8-performance constraints specific to the substrate doctrine.

## Install

Packages publish to GitHub Packages. Add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add -D @studnicky/eslint-config
```

Install peer dependencies:

```sh
pnpm add -D eslint@>=10 typescript-eslint@>=8 @typescript-eslint/eslint-plugin@>=8 @typescript-eslint/parser@>=8 @stylistic/eslint-plugin@>=5 eslint-plugin-import-x@>=4 eslint-plugin-perfectionist@>=5 eslint-plugin-regexp@>=3 eslint-plugin-unused-imports@>=4 typescript@>=6
```

## Subpath exports

| Subpath | Exports |
|---------|---------|
| `@studnicky/eslint-config` | `createEslintConfig`, `plugin`, `v8Plugin`, and all individual rule modules |
| `@studnicky/eslint-config/plugin` | `plugin` (the `@studnicky` ESLint plugin object) |
| `@studnicky/eslint-config/v8` | `v8Plugin` (the `@studnicky/v8` ESLint plugin object) |

## Usage

Pass the config factory result directly as your flat config, or spread it to extend:

<!-- inline-ts-ok: eslint rule example -->
```ts
// eslint.config.ts
import { createEslintConfig } from '@studnicky/eslint-config';

export default createEslintConfig({ tsconfigRootDir: import.meta.dirname });
```

The factory registers both plugins (`@studnicky` and `@studnicky/v8`) automatically. To extend with additional rules, spread the result:

<!-- inline-ts-ok: eslint rule example -->
```ts
// eslint.config.ts
import { createEslintConfig } from '@studnicky/eslint-config';

export default [
  ...createEslintConfig({ tsconfigRootDir: import.meta.dirname }),
  { rules: { 'no-console': 'warn' } }
];
```

To use the plugin objects in a custom config without the full factory:

<!-- inline-ts-ok: eslint rule example -->
```ts
// eslint.config.ts
import { plugin, v8Plugin } from '@studnicky/eslint-config';

export default [
  {
    plugins: {
      '@studnicky': plugin,
      '@studnicky/v8': v8Plugin
    },
    rules: {
      '@studnicky/single-export': 'error',
      '@studnicky/v8/delete-property': 'error'
    }
  }
];
```

The full usage example is also available as a transcluded runnable demo:

<<< ../../packages/eslint-config/examples/configUsage.ts#usage

## Configuration rules

The `@studnicky` plugin contains 14 rules. `createEslintConfig()` enables all of them.

| Rule | What it enforces | Fixable |
|------|-----------------|---------|
| `@studnicky/entity-namespace` | Entity files must export a namespace with `Schema as const`, `type Type` derived via `FromSchema`, and a `validate` type guard | No |
| `@studnicky/interface-must-be-contract` | Interfaces must carry at least one method, call, construct, or function-valued property; pure data shapes must be schema-derived `type` aliases | No |
| `@studnicky/no-bind-apply-call` | Disallows `.bind()`, `.call()`, and `.apply()` on callables | No |
| `@studnicky/no-export-alias` | Disallows aliased exports and re-exports outside index files | No |
| `@studnicky/no-freestanding-verb-noun` | Disallows freestanding `verbNoun` functions at module scope | No |
| `@studnicky/no-prefer-existing-type` | Disallows locally declared object types that duplicate or are subsumed by an imported type | No |
| `@studnicky/no-suppression-comments` | Disallows `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, and `@ts-nocheck` comments | Yes (removes the comment line) |
| `@studnicky/no-this-alias` | Disallows assigning `this` to a variable or binding it via assignment | No |
| `@studnicky/no-trivial-shim` | Disallows wrapper functions that only forward or delegate a value without adding logic | Yes (inlines the expression) |
| `@studnicky/no-type-aliasing` | Disallows naked type re-aliases, generic forwarding shims, and import aliases that hide canonical names | No |
| `@studnicky/prefer-collection-types` | Prefers `Set`/`Map` over arrays and POJOs for membership tests and keyed lookups | No |
| `@studnicky/require-options-object` | Requires functions with two or more optional parameters to collect them into a trailing options object | No |
| `@studnicky/single-export` | Requires each non-index file to export exactly one named symbol, with the export name matching the filename | No |
| `@studnicky/type-alias-must-end-type` | Requires exported `type` aliases to end in `Type` | No |

### `@studnicky/entity-namespace`

Entity files (named `*Entity.ts` or inside an `entities/` directory) must export a single namespace whose members satisfy the schema-as-source-of-truth pattern: a `Schema` declared `as const`, a `type Type` derived via `FromSchema<typeof Schema>`, and a `validate` function that is either `SchemaValidator.compile<Type>(Schema)` or a hand-written `(candidate: unknown): candidate is Type` predicate.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗ missing members
export namespace UserEntity {}

// ✓ complete entity namespace
export namespace UserEntity {
  export const Schema = { type: 'object', properties: { id: { type: 'string' } } } as const;
  export type Type = FromSchema<typeof Schema>;
  export const validate = SchemaValidator.compile<Type>(Schema);
}
```

### `@studnicky/interface-must-be-contract`

An `interface` must carry at least one contract signal: a method signature, call signature, construct signature, function-typed property, or named-type reference (such as a class instance). Interfaces that contain only JSON-serializable property or index signatures are data shapes and must be declared as schema-derived `type XxxType` in an entity file.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗ pure data shape - use a schema-derived type instead
interface UserRecord {
  id: string;
  name: string;
}

// ✓ contract - carries a method and a named-type reference
interface UserRepositoryInterface {
  find(id: string): Promise<UserRecord>;
  clock: Clock;
}
```

### `@studnicky/no-bind-apply-call`

Disallows `.bind()`, `.call()`, and `.apply()` on callable receivers. When type services are available the rule confirms the receiver is a `Function` via the TypeScript type checker before reporting. Refactor to use arrow functions or pass arguments directly.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗
fn.call(thisArg, arg1);
fn.apply(thisArg, args);
const bound = fn.bind(thisArg);

// ✓
fn(arg1);
```

### `@studnicky/no-export-alias`

Disallows renaming symbols at the export site (`export { foo as bar }`) and disallows re-export statements outside index files. Re-exports that forward the same name unchanged are only permitted in index files (`index.ts`, `index.mts`, etc.). The rule also forbids `export *` outside index files.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗ - renaming at export site
export { MyClass as TheClass };

// ✗ - re-export outside an index file
export { MyClass } from './myClass.js';

// ✓ - in index.ts, forwarding the canonical name unchanged
export { MyClass } from './MyClass.js';
```

### `@studnicky/no-freestanding-verb-noun`

Disallows module-scope function declarations and `const` arrow functions whose names start with a known verb prefix followed by an uppercase letter (e.g. `parseUser`, `createToken`, `getConfig`). Move the logic into a static method of a class named after the noun being produced.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗
function parseUser(raw: unknown): User { ... }
const createToken = (payload: Payload): string => { ... };

// ✓
class User {
  static parse(raw: unknown): User { ... }
}
class Token {
  static create(payload: Payload): string { ... }
}
```

The default verb set covers `get`, `set`, `create`, `parse`, `build`, `fetch`, `format`, `validate`, `serialize`, `deserialize`, and others. The rule accepts an options object with `additionalPrefixes` and `ignorePrefixes` arrays.

### `@studnicky/no-prefer-existing-type`

Detects locally declared object-literal `type` aliases whose shape is already provided by a type exported from an imported package. The rule classifies matches as:

- `exactMatch` (error by default) - the local type is structurally identical to the imported type.
- `nearMatch` (warn by default) - the local type satisfies all required fields of the imported type but differs in optional fields.
- `subsumedMatch` (warn by default) - the imported type fully covers the local type, which is a strict subset.

The rule requires TypeScript type services. The default `minFields` threshold is 2 to avoid false positives on small shapes.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗ - duplicates an imported type
import type { FetchOptions } from './fetch.js';
type Options = { url: string; timeout: number }; // duplicates FetchOptions

// ✓ - import the canonical type directly
import type { FetchOptions } from './fetch.js';
```

### `@studnicky/no-suppression-comments`

Disallows all lint and type suppression comments: `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line`, `eslint-enable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `tslint:disable`, `tslint:disable-line`, and `tslint:disable-next-line`. The fix removes the entire comment line when the line is otherwise whitespace-only.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗
// eslint-disable-next-line no-console
console.log(x);

// ✗
// @ts-ignore
const y = badlyTyped as string;

// ✓ fix the underlying type or lint issue
```

### `@studnicky/no-this-alias`

Disallows capturing `this` into a local variable (`const self = this`) or via assignment expression. Use arrow functions to preserve lexical `this` instead.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗
const self = this;
setTimeout(function() { self.run(); }, 100);

// ✓
setTimeout(() => { this.run(); }, 100);
```

### `@studnicky/no-trivial-shim`

Disallows functions whose entire body is a single return (or expression body) of a trivially forwarded value: an identifier, a call expression, an awaited expression, or a chain. Functions that construct new objects (`new`, `{}`, `[]`), access `this` members, or return literals are not trivial and are allowed. The auto-fix wraps the return value in a `const result` binding.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗ - trivial call-through
function getUser(id: string): Promise<User> {
  return repository.findById(id);
}

// ✗ - trivial identifier forward
const wrapValue = (v: string) => v;

// ✓ - adds logic
function getUser(id: string): Promise<User> {
  validateId(id);
  return repository.findById(id);
}
```

The rule accepts `allowLiterals` and `allowMemberExpressions` boolean options (both default `false`).

### `@studnicky/no-type-aliasing`

Disallows three aliasing patterns:

- Primitive re-aliases: `type Id = string` (use `string` directly).
- Naked type re-aliases: `type User = UserRecord` with no transformation (use `UserRecord` directly).
- Generic forwarding shims: `type List<T> = Array<T>` where the type parameters are forwarded unchanged.
- Import aliases: `import { Foo as Bar } from '...'` (use the canonical name `Foo`).

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗
type Id = string;
type User = UserRecord;
type List<T> = Array<T>;
import { UserRecord as User } from './user.js';

// ✓
// use the canonical names directly at each site
```

### `@studnicky/prefer-collection-types`

Flags four patterns where arrays or plain objects perform worse than `Set` or `Map`:

- Inline array literal `.includes()`: `['a', 'b'].includes(x)` - use `new Set(['a', 'b']).has(x)`.
- `Object.fromEntries()` accessed via computed bracket: `Object.fromEntries(pairs)[key]` - use `new Map(pairs).get(key)`.
- Module-scope `const` arrays used exclusively for `.includes()` membership tests - declare as `new Set(...)`.
- Array literal `.includes()` inside `.filter()`, `.some()`, `.every()`, `.find()`, or `.findIndex()` callbacks - convert the array to a `Set`.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗
const VALID = ['a', 'b', 'c'];
if (VALID.includes(value)) { ... }

// ✓
const VALID = new Set(['a', 'b', 'c']);
if (VALID.has(value)) { ... }
```

### `@studnicky/require-options-object`

When a function or method has two or more optional parameters, they must be collected into a single trailing options object. The threshold defaults to `minOptionals: 2` and is configurable. Applies to function declarations, function expressions, arrow functions, and TypeScript call, construct, and method signatures.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗
function fetch(url: string, timeout?: number, retries?: number): Promise<Response> { ... }

// ✓
function fetch(url: string, opts?: { timeout?: number; retries?: number }): Promise<Response> { ... }
```

### `@studnicky/single-export`

Each non-index source file must export exactly one named symbol, and the export name must match the filename base (case-insensitively, supporting camelCase, PascalCase, and SCREAMING_SNAKE_CASE for files under `constants/`). Default exports are forbidden in all files. `export *` is forbidden outside index files.

Index files (`index.ts`, `index.mts`, `index.cts`, `index.tsx`) are exempt from the single-symbol limit but still forbid default exports.

Exempt categories (files containing only these may export multiple symbols): type-only exports, const-value exports, enum exports, or error-class exports.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗ userService.ts - multiple exports
export class UserService { ... }
export class AdminService { ... }

// ✗ userService.ts - default export
export default class UserService { ... }

// ✓ UserService.ts - single named export matching filename
export class UserService { ... }
```

### `@studnicky/type-alias-must-end-type`

Exported `type` aliases must end in `Type`. This applies only to exported declarations; unexported type aliases are unrestricted.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗
export type UserOptions = { id: string };

// ✓
export type UserOptionsType = { id: string };
```

## V8 optimization rules

The `@studnicky/v8` plugin contains 16 rules. All are set to `error` by `createEslintConfig()`. They target patterns that prevent V8 from using optimized code paths: hidden-class transitions, deoptimizations, per-iteration allocations, and scope-pollution.

| Rule | What it disallows | Why it matters for V8 |
|------|------------------|----------------------|
| `@studnicky/v8/arguments-object` | The `arguments` object | Prevents V8 from optimizing the function; use rest parameters instead |
| `@studnicky/v8/array-from-iterators` | `Array.from(iterable)` when the argument is not already an array | Materializes a full array from an iterator; iterate directly or use `[...iter]` only when the array is needed |
| `@studnicky/v8/computed-class-properties` | Computed property keys in class bodies (`class Foo { [key]() {} }`) | Forces a hidden-class transition on every instantiation |
| `@studnicky/v8/computed-object-properties` | Computed property keys in object literals (`{ [key]: value }`) | Produces a dictionary-mode object, bypassing hidden-class fast paths |
| `@studnicky/v8/define-property` | `Object.defineProperty(...)` | Alters property descriptors after object creation, invalidating the hidden class |
| `@studnicky/v8/delete-property` | `delete obj.prop` | Transitions the object to dictionary (slow) mode permanently |
| `@studnicky/v8/eval-function` | `eval(...)` | Prevents V8 from optimizing the surrounding function and is a security risk |
| `@studnicky/v8/for-in-loops` | `for...in` loops | Enumerates inherited keys and triggers deopt on objects with non-enumerable properties; use `Object.keys()` or `Object.entries()` |
| `@studnicky/v8/for-of-arrays` | `for...of` over arrays or tuples | Use a counted `for` loop over arrays; `for...of` on arrays is slower than index access on typed arrays |
| `@studnicky/v8/no-concat-in-loops` | `.concat()` calls inside `for` loops | Creates a new array on every iteration; use `.push()` or pre-allocate |
| `@studnicky/v8/no-spread-in-loops` | Array spread (`[...arr, item]`) in assignment inside `for` loops | Creates O(n^2) work; accumulate with `.push()` instead |
| `@studnicky/v8/prototype-modification` | Assigning to `.prototype` (e.g. `Foo.prototype.bar = ...`) | Invalidates all existing instances' hidden classes |
| `@studnicky/v8/regexp-in-loops` | `new RegExp(...)` or `RegExp(...)` inside any loop body | Allocates a new RegExp object on every iteration; hoist to the outer scope |
| `@studnicky/v8/switch-statements` | `switch` cases with a `BlockStatement` body (`case X: { ... }`) | V8 switch dispatch expects simple calls or returns; block bodies inhibit the fast dispatch table |
| `@studnicky/v8/try-catch-in-loops` | `try-catch` blocks inside loops | V8 cannot optimize functions containing try-catch in hot paths; extract the try-catch to a wrapper function called from the loop |
| `@studnicky/v8/with-statement` | `with` statements | Prevents all optimizations in the enclosing function by making scope resolution dynamic |

### `@studnicky/v8/delete-property`

`delete obj.prop` permanently transitions the object from fast (hidden-class) mode to dictionary mode. Once in dictionary mode, all subsequent property accesses on that object are slower, including accesses to properties that were never deleted.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗
delete cache[key];

// ✓ - set to undefined or use a Map with .delete()
cache[key] = undefined;
// or
map.delete(key);
```

### `@studnicky/v8/define-property`

`Object.defineProperty` changes descriptor flags after the object is created, which forces V8 to transition to a new hidden class or fall back to dictionary mode.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗
Object.defineProperty(obj, 'id', { value: 1, writable: false });

// ✓ - declare non-writable shapes at construction time via class fields
class Entity {
  readonly id: number;
  constructor(id: number) { this.id = id; }
}
```

### `@studnicky/v8/prototype-modification`

Assigning to `.prototype` after construction invalidates every existing instance's hidden class and prevents inline-cache hits for any code that has already seen the type.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗
MyClass.prototype.newMethod = function() { ... };

// ✓ - declare all methods in the class body
class MyClass {
  newMethod() { ... }
}
```

### `@studnicky/v8/for-in-loops`

`for...in` enumerates string keys including inherited ones, triggers deoptimization on objects with non-enumerable or accessor properties, and produces string keys even when integer indexing is expected. Use `Object.keys()`, `Object.values()`, or `Object.entries()` instead.

<!-- inline-ts-ok: eslint rule example -->
```ts
// ✗
for (const key in obj) { process(key, obj[key]); }

// ✓
for (const [key, value] of Object.entries(obj)) { process(key, value); }
```

## Doctrine mapping

The `@studnicky` rules map directly to the substrate codebase doctrine:

- `single-export` and `no-export-alias` enforce one public symbol per file with its canonical name, which is the structural prerequisite for a readable import graph.
- `no-suppression-comments` keeps the full lint and type-check surface active. No rule may be silenced inline.
- `require-options-object` prevents positional-parameter ambiguity when functions grow optional parameters over time.
- `prefer-collection-types` enforces `Set` and `Map` as the default for membership and keyed lookup, in alignment with the V8 optimization rules in the sibling plugin.
- `entity-namespace` and `interface-must-be-contract` express the schema-first data model: data shapes derive from JSON Schema, interfaces express runtime contracts only.
- `no-trivial-shim`, `no-type-aliasing`, `no-freestanding-verb-noun`, and `no-prefer-existing-type` enforce the minimalism principle: no wrapper layers, no synonym types, no freestanding verb functions, no local redeclarations of canonical types.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/eslint-config)
