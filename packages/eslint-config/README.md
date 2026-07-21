# @studnicky/eslint-config

> Custom ESLint rule plugin for @studnicky packages

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/eslint-config)

Custom ESLint rule plugin that ships two namespaced rule sets for TypeScript projects — 22 core rules (`plugin`) and 27 V8-optimization rules (`v8Plugin`) — plus domain-grouped suite presets for one-import consumption. Register `plugin` and `v8Plugin` in your flat config and enable the rules you want, or spread a suite in directly.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add -D @studnicky/eslint-config
```

The package declares `@studnicky/types` (`workspace:*`) and `json-schema-to-ts` as runtime dependencies. Its entity schemas import `FromSchema` and `JSONSchema` directly from `json-schema-to-ts`; schema types are not imported through dependency proxy exports. Also install peer dependencies:

```sh
pnpm add -D eslint@>=10 typescript-eslint@>=8 @typescript-eslint/eslint-plugin@>=8 @typescript-eslint/parser@>=8 @stylistic/eslint-plugin@>=5 eslint-plugin-import-x@>=4 eslint-plugin-perfectionist@>=5 eslint-plugin-regexp@>=3 eslint-plugin-unused-imports@>=4 typescript@>=6
```

## Usage

```js
// eslint.config.mjs
import { plugin, v8Plugin } from '@studnicky/eslint-config';

export default [
  {
    plugins: {
      '@studnicky': plugin,
      '@studnicky/v8': v8Plugin
    },
    rules: {
      '@studnicky/type-alias-invariants': 'error',
      '@studnicky/single-export': 'error',
      '@studnicky/inline-trivial-logic': 'error',
      '@studnicky/v8/array-spread-outside-loops': 'error'
    }
  }
];
```

The package root is the sole code entrypoint. Individual rule modules are available through `plugin.rules` and `v8Plugin.rules`; the package does not expose parallel named rule-object imports.

## Suites

Wiring all 46 rules individually is tedious, so the package also exports domain-grouped presets. Each suite is a plain `Linter.Config` object — spread it into a flat-config array alongside your other config entries.

| Suite | Domain |
|-------|--------|
| `entitySuite` | Type/interface/entity-namespace shape, naming, and location |
| `hygieneSuite` | General-purpose export, function, class, and comment conventions |
| `v8Suite` | V8 hidden-class stability and hot-path allocation rules |
| `HexagonalSuite.create(...)` | Hexagonal-architecture layer boundaries (factory, not a static object) |

```js
// eslint.config.mjs
import { entitySuite, hygieneSuite, v8Suite, HexagonalSuite } from '@studnicky/eslint-config';

export default [
  entitySuite,
  hygieneSuite,
  v8Suite,
  HexagonalSuite.create({
    layers: ['domain', 'application', 'adapters'],
    sourceRoot: 'src',
    domainPurity: { forbiddenImports: ['fs', 'axios'] }
  })
];
```

`layer-import-boundary`, `domain-purity`, `adapter-only-import`, and `known-types-outside-adapters` all share the same layers/sourceRoot configuration but take distinct extra options, so `HexagonalSuite` is a factory rather than a static suite — call `.create(...)` once with the shared layer config plus each rule's own extras to enable all four consistently.

## Entity declaration contract

`entitySuite` enables the coordinated type/interface rules:

- canonical pure data uses the exact exported `*Entity.Type = FromSchema<typeof Schema>` form;
- callable, constructor, runtime, brand, non-schema, and readonly access contracts are interfaces;
- contract interfaces reference named entity types for inline pure-data portions; and
- canonical aliases have no path, package, test-file, namespace, or comment bypass.

The suite also disables `@typescript-eslint/prefer-function-type`. Minimal callable contracts are intentionally interfaces under this declaration model, so enabling that upstream preference after `entitySuite` would produce contradictory advice for a valid callable interface.

Import `FromSchema` and `JSONSchema` directly from `json-schema-to-ts` and declare that package as a direct dependency:

```ts
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

export namespace UserEntity {
  export const Schema = {
    properties: { id: { type: 'string' } },
    required: ['id'],
    type: 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}
```

The schema declaration and `FromSchema` derivation may live in separate files. Each file imports the owner symbol it uses directly: `JSONSchema` at the schema site and `FromSchema` at the derivation site. Validator declarations likewise import `ValidateFunction` directly from `ajv`; public JSON value signatures import `JSONSchema7Type` from `json-schema`, whose declarations are supplied by the consuming package's direct `@types/json-schema` dependency. A dependency's functionality and types are never acquired through a substrate package's proxy export.

Readonly on an interface is access policy:

```ts
export interface UserSnapshotInterface {
  readonly value: UserEntity.Type;
  refresh(): Promise<void>;
}
```

Each rule is enabled or disabled as a complete unit in flat configuration. The rules have no declaration-name allow lists, suppression comments, or subcheck options:

```js
export default [
  entitySuite,
  {
    files: ['generated/**/*.ts'],
    rules: {
      '@studnicky/all-types-are-entities': 'off',
      '@studnicky/interface-must-be-contract': 'off',
      '@studnicky/interfaces-compose-named-types': 'off',
      '@studnicky/type-alias-invariants': 'off'
    }
  }
];
```

## Custom rules

**`@studnicky` namespace** (22 rules via root-exported `plugin`):

| Rule | Purpose |
|------|---------|
| `@studnicky/adapter-only-import` | Disallow importing adapter-only third-party dependencies (HTTP frameworks, database drivers, external API clients) outside the adapters layer |
| `@studnicky/all-types-are-entities` | Require every canonical pure-data alias to be the exact schema-derived `Type` member of an `*Entity` namespace |
| `@studnicky/canonical-export-names` | Disallow aliased exports and any non-index re-export path |
| `@studnicky/clean-diagnostics` | Disallow lint and type suppression comments |
| `@studnicky/descriptive-identifiers` | Bans internal shorthand identifiers (`cb`, `dlq`, `cfg`, `opts`, `ctx`, `idx`, etc.) in favor of descriptive names |
| `@studnicky/direct-invocation-only` | Disallow `Function.prototype.bind`/`call`/`apply` usage |
| `@studnicky/domain-purity` | Disallow impure runtime dependencies (I/O imports, non-deterministic calls) inside hexagonal-architecture domain-layer files |
| `@studnicky/folder-content-shape` | Enforce that `interfaces/`, `types/`, and `constants/`/`fixtures/` folders hold only the declaration shape their name promises |
| `@studnicky/hash-private-fields` | Disallow underscore-prefixed class members; use real `#private` fields/methods instead |
| `@studnicky/inline-trivial-logic` | Flags thin wrapper functions that only forward/delegate a value without adding logic |
| `@studnicky/interface-must-be-contract` | Require interfaces to express runtime, callable, nominal, non-schema, or readonly access contracts; pure data, including empty interfaces, is schema-derived |
| `@studnicky/interface-suffix` | Every interface declaration's name must end with `Interface` |
| `@studnicky/interfaces-compose-named-types` | Require named entity references for inline pure-data portions of contract interfaces while permitting inline callable and runtime contract objects |
| `@studnicky/known-types-outside-adapters` | Disallow `any`/`unknown` types outside the adapters layer of a hexagonal architecture |
| `@studnicky/layer-import-boundary` | Disallow imports that cross hexagonal-architecture layer boundaries not permitted by the configured allow-matrix |
| `@studnicky/lexical-this-only` | Disallow aliasing `this` to another variable or assignment |
| `@studnicky/prefer-collection-types` | Prefer `Set`/`Map` over arrays/POJOs for membership and lookup operations |
| `@studnicky/require-options-object` | Require 2+ optional parameters to be collected into a single trailing options object |
| `@studnicky/single-export` | Enforce one named export per regular file, with restricted-topology exemptions and SCREAMING_SNAKE_CASE constant modules |
| `@studnicky/static-method-verbs` | Disallow freestanding functions at module scope; convert to static class methods |
| `@studnicky/type-alias-invariants` | Enforce alias identity, verified schema-derived data provenance, contract declaration kind, naming, and mutable data output in diagnostic-precedence order |
| `@studnicky/whole-canonical-types` | Disallow deriving `Partial`/`Pick`/`Omit` subset views from canonical, codebase-owned named types/interfaces — define an explicit type instead |

**`@studnicky/v8` namespace** (27 rules via root-exported `v8Plugin`):

| Rule | Purpose |
|------|---------|
| `@studnicky/v8/arguments-object` | Forbid the `arguments` object; use rest parameters |
| `@studnicky/v8/array-concat-outside-loops` | Avoid `.concat()` in loops — creates new arrays each iteration |
| `@studnicky/v8/array-from-iterators` | Avoid `Array.from` on iterators in hot paths |
| `@studnicky/v8/array-from-map-callback` | `Array.from(iterable, mapFn)` is measurably slower than a manual index-fill loop; prefer `new Array(n)` with an index-assignment loop |
| `@studnicky/v8/array-scan-outside-loops` | Avoid `find`/`filter`/`indexOf`/`includes`/`some`/`every` in loops — hoist into a Map/Set or compute once |
| `@studnicky/v8/array-splice-outside-loops` | Avoid `.splice()` in loops — each call is O(n), making the loop O(n²) |
| `@studnicky/v8/array-spread-outside-loops` | Never use array spread in loops — creates O(n²) work |
| `@studnicky/v8/chained-array-iteration` | Disallow chaining `.map()`/`.filter()` — allocates an intermediate array and iterates twice; use `.reduce()` |
| `@studnicky/v8/computed-class-properties` | Computed properties in classes break hidden classes |
| `@studnicky/v8/computed-object-properties` | Computed properties in object literals break hidden classes |
| `@studnicky/v8/conditional-property-assignment` | Conditional property assignment in a constructor breaks hidden classes; assign every property unconditionally |
| `@studnicky/v8/define-property` | `Object.defineProperty` breaks hidden classes |
| `@studnicky/v8/delete-property` | `delete` on member expressions is forbidden — it breaks V8 optimizations |
| `@studnicky/v8/dynamic-property-access` | Dynamic (computed) property access inside an object literal breaks hidden classes |
| `@studnicky/v8/eval-function` | `eval()` is forbidden — breaks optimizations and is a security risk |
| `@studnicky/v8/for-in-loops` | `for...in` loops are forbidden; use `Object.keys`/`entries` |
| `@studnicky/v8/for-of-arrays` | Disallow `for...of` over arrays; prefer index loops for V8 optimization |
| `@studnicky/v8/inline-arrow-functions` | Disallow inline multi-statement arrow functions in a dispatch map that is rebuilt on every call |
| `@studnicky/v8/inline-functions` | Disallow inline function expressions in a dispatch map that is rebuilt on every call |
| `@studnicky/v8/max-switch-cases` | Switch statements above the case-count threshold must become a dispatch map instead |
| `@studnicky/v8/memoize-array-length` | Re-reading `array.length` on every loop iteration prevents V8 optimization; memoize it before the loop |
| `@studnicky/v8/object-spread` | Object spread inside a constructor can break hidden classes; assign properties explicitly |
| `@studnicky/v8/prototype-modification` | Modifying `prototype` breaks V8 optimizations |
| `@studnicky/v8/regexp-in-loops` | Disallow `RegExp` construction inside loops — allocates a new object every iteration |
| `@studnicky/v8/switch-statements` | Switch cases must be simple calls/returns only — delegate to a static class method, do not inline multi-statement logic |
| `@studnicky/v8/try-catch-in-loops` | Disallow try-catch blocks inside loops; V8 cannot optimize functions containing try-catch in hot paths |
| `@studnicky/v8/with-statement` | `with` statements are forbidden — they break optimizations |

Full rule reference: https://studnicky.github.io/substrate/packages/eslint-config

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/eslint-config

## License

MIT
