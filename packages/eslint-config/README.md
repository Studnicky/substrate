# @studnicky/eslint-config

> Custom ESLint rule plugin for @studnicky packages

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/eslint-config)

Custom ESLint rule plugin that ships two namespaced rule sets for TypeScript projects — 32 core rules (`plugin`) and 27 V8-optimization rules (`v8Plugin`) — plus domain-grouped suite presets for one-import consumption. Register `plugin` and `v8Plugin` in your flat config and enable the rules you want, or spread a suite in directly.

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
import { plugin, v8Plugin } from "@studnicky/eslint-config/node";

export default [
  {
    plugins: {
      "@studnicky": plugin,
      "@studnicky/v8": v8Plugin,
    },
    rules: {
      "@studnicky/type-alias-invariants": "error",
      "@studnicky/export-shape": "error",
      "@studnicky/inline-trivial-logic": "error",
      "@studnicky/v8/array-spread-outside-loops": "error",
    },
  },
];
```

Use `@studnicky/eslint-config/node` for the ESLint plugins and flat-config suites. `@studnicky/eslint-config/browser` exports `PlatformCallDefaults`, the browser-safe platform-call policy data. The browser entry does not export ESLint plugins or suites because those rules execute the TypeScript compiler API.

## Browser surface

Import `PlatformCallDefaults` from `@studnicky/eslint-config/browser` when a browser application needs the published platform-call policy data. Configure ESLint plugins and suites through the Node entrypoint.

## Suites

Wiring all 59 rules individually is tedious, so the package also exports domain-grouped presets. A static suite is a plain `Linter.Config` object — spread it into a flat-config array. A factory suite needs project-specific options its member rules cannot default — call `.create(...)` to get the config entry.

| Suite                            | Domain                                                                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `entityModelSuite`               | Type/interface/entity-namespace shape, naming, location, and keyed-collection typing                                                    |
| `moduleDesignSuite`              | Export shape, return-binding, function-registry safety, options-object calls, and non-trivial method bodies                             |
| `diagnosticsSuite`               | Rejects inline lint configuration and diagnostic suppression                                                                            |
| `VocabularySuite.create(...)`    | Identifier and static-method wording plus closed-vocabulary threading (factory — `no-threaded-vocabulary` needs a project `sourceRoot`) |
| `classMechanicsSuite`            | Lexical `this` binding, private-field encapsulation, and direct method invocation                                                       |
| `LayerBoundarySuite.create(...)` | Hexagonal-architecture layer boundaries and the entity intake boundary (factory, not a static object)                                   |
| `v8ObjectShapeSuite`             | Constructs that destabilize V8 hidden-class/inline-cache assumptions                                                                    |
| `v8CollectionTraversalSuite`     | How a collection is walked, not how often                                                                                               |
| `v8RepeatedWorkSuite`            | Cost that compounds per hot-loop iteration                                                                                              |

```js
// eslint.config.mjs
import {
  classMechanicsSuite,
  diagnosticsSuite,
  entityModelSuite,
  LayerBoundarySuite,
  moduleDesignSuite,
  v8CollectionTraversalSuite,
  v8ObjectShapeSuite,
  v8RepeatedWorkSuite,
  VocabularySuite,
} from "@studnicky/eslint-config/node";

export default [
  entityModelSuite,
  moduleDesignSuite,
  diagnosticsSuite,
  classMechanicsSuite,
  v8ObjectShapeSuite,
  v8CollectionTraversalSuite,
  v8RepeatedWorkSuite,
  VocabularySuite.create({ sourceRoot: "src" }),
  LayerBoundarySuite.create({
    layers: ["domain", "application", "adapters"],
    sourceRoot: "src",
    domainPurity: { forbiddenImports: ["fs", "axios"] },
  }),
];
```

`layer-import-boundary`, `domain-purity`, `adapter-only-import`, and `known-types-outside-adapters` all share the same layers/sourceRoot configuration but take distinct extra options, `intake-parse-only` takes its own unrelated options, and `no-circular-imports` takes none, so `LayerBoundarySuite` is a factory rather than a static suite — call `.create(...)` once with the shared layer config plus each rule's own extras to enable all six consistently.

## Entity declaration contract

`entityModelSuite` enables the coordinated type/interface rules:

- canonical pure data uses the exact exported `*Entity.Type = FromSchema<typeof Schema>` form;
- callable, constructor, runtime, brand, non-schema, and readonly access contracts are interfaces;
- contract interfaces reference named entity types for inline pure-data portions; and
- canonical aliases have no path, package, test-file, namespace, or comment bypass.

Import `FromSchema` and `JSONSchema` directly from `json-schema-to-ts` and declare that package as a direct dependency:

```ts
import type { FromSchema, JSONSchema } from "json-schema-to-ts";

export namespace UserEntity {
  export const Schema = {
    properties: { id: { type: "string" } },
    required: ["id"],
    type: "object",
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
  entityModelSuite,
  {
    files: ["generated/**/*.ts"],
    rules: {
      "@studnicky/all-types-are-entities": "off",
      "@studnicky/entity-file-shape": "off",
      "@studnicky/interface-must-be-contract": "off",
      "@studnicky/interfaces-compose-named-types": "off",
      "@studnicky/type-alias-invariants": "off",
    },
  },
];
```

## Custom rules

**`@studnicky` namespace** (32 rules via `plugin`):

| Rule                                              | Purpose                                                                                                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@studnicky/adapter-only-import`                  | Disallow importing adapter-only third-party dependencies (HTTP frameworks, database drivers, external API clients) outside the adapters layer                                                    |
| `@studnicky/all-types-are-entities`               | Require every canonical pure-data alias to be the exact schema-derived `Type` member of an `*Entity` namespace                                                                                   |
| `@studnicky/clean-diagnostics`                    | Disallow lint and type suppression comments                                                                                                                                                      |
| `@studnicky/descriptive-identifiers`              | Bans internal shorthand identifiers (`cb`, `dlq`, `cfg`, `opts`, `ctx`, `idx`, etc.) in favor of descriptive names                                                                               |
| `@studnicky/direct-invocation-only`               | Disallow `Function.prototype.bind`/`call`/`apply` usage                                                                                                                                          |
| `@studnicky/domain-purity`                        | Disallow impure runtime dependencies (I/O imports, non-deterministic calls) inside hexagonal-architecture domain-layer files                                                                     |
| `@studnicky/entity-file-shape`                    | Constrains an `interfaces/`, `types/`, or `constants/`/`fixtures/` file to the declaration shape its owning category promises                                                                    |
| `@studnicky/explicit-return-binding`              | Requires a returned operation to bind its result to a `const` before returning it                                                                                                                |
| `@studnicky/export-shape`                         | Governs a module's export surface: how many symbols it exports, what they're named relative to the filename, and whether an export may be aliased or re-exported outside a package index         |
| `@studnicky/hash-private-fields`                  | Disallow underscore-prefixed class members; use real `#private` fields/methods instead                                                                                                           |
| `@studnicky/inline-trivial-logic`                 | Flags thin wrapper functions that only forward/delegate a value without adding logic                                                                                                             |
| `@studnicky/intake-parse-only`                    | Permits an `unknown`/`any` parameter only on the `intake` member of an `*Entity` namespace                                                                                                       |
| `@studnicky/interface-must-be-contract`           | Require interfaces to express runtime, callable, nominal, non-schema, or readonly access contracts and to carry the `Interface` suffix; pure data, including empty interfaces, is schema-derived |
| `@studnicky/interfaces-compose-named-types`       | Require named entity references for inline pure-data portions of contract interfaces while permitting inline callable and runtime contract objects                                               |
| `@studnicky/known-types-outside-adapters`         | Disallow `any`/`unknown` types outside the adapters layer of a hexagonal architecture                                                                                                            |
| `@studnicky/layer-import-boundary`                | Disallow imports that cross hexagonal-architecture layer boundaries not permitted by the configured allow-matrix                                                                                 |
| `@studnicky/lexical-this-only`                    | Disallow aliasing `this` to another variable or assignment                                                                                                                                       |
| `@studnicky/no-caller-chosen-guard-type`          | Disallow callers from selecting a runtime guard’s target type outside the owning boundary                                                                                                        |
| `@studnicky/no-circular-imports`                  | Disallow circular imports between package source files                                                                                                                                           |
| `@studnicky/no-double-assertion`                  | Disallow chained TypeScript assertions that bypass runtime validation                                                                                                                            |
| `@studnicky/no-function-registries`               | Disallow object literals containing two or more function implementations                                                                                                                         |
| `@studnicky/no-mixed-callable-shapes`             | Forbid a union or intersection type from mixing a callable/constructable constituent with a data constituent                                                                                     |
| `@studnicky/no-native-error`                      | Require package-owned error types instead of native error construction                                                                                                                           |
| `@studnicky/no-redefined-external-types`          | Requires an exported local interface/type alias to reuse a public type a direct dependency already exports instead of rebuilding the same shape                                                  |
| `@studnicky/no-reflect-argument-laundering`       | Disallow reflective calls that bypass direct argument validation                                                                                                                                 |
| `@studnicky/no-threaded-vocabulary`               | Disallow carrying a closed-vocabulary token (boolean/enum/literal union) past the frame that resolved it into a port implementation                                                              |
| `@studnicky/no-unchecked-overload-implementation` | Require overload implementations to validate the selected argument shape                                                                                                                         |
| `@studnicky/no-unparsed-assertion`                | Disallow a TypeScript assertion from `unknown`/`any` to a named type reference; a named assertion bypasses the entity parsing boundary                                                           |
| `@studnicky/prefer-collection-types`              | Prefer `Set`/`Map` over arrays/POJOs for membership and lookup operations                                                                                                                        |
| `@studnicky/require-options-object`               | Require 2+ optional parameters to be collected into a single trailing options object                                                                                                             |
| `@studnicky/static-method-verbs`                  | Disallow freestanding functions at module scope; convert to static class methods                                                                                                                 |
| `@studnicky/type-alias-invariants`                | Enforce alias identity, verified schema-derived data provenance, contract declaration shape, naming, whole-canonical-type consumption, and mutable data output in diagnostic-precedence order    |

**`@studnicky/v8` namespace** (27 rules via `v8Plugin`):

| Rule                                            | Purpose                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `@studnicky/v8/arguments-object`                | Forbid the `arguments` object; use rest parameters                                                                                    |
| `@studnicky/v8/array-concat-outside-loops`      | Avoid `.concat()` in loops — creates new arrays each iteration                                                                        |
| `@studnicky/v8/array-from-iterators`            | Avoid `Array.from` on iterators in hot paths                                                                                          |
| `@studnicky/v8/array-from-map-callback`         | `Array.from(iterable, mapFn)` is measurably slower than a manual index-fill loop; prefer `new Array(n)` with an index-assignment loop |
| `@studnicky/v8/array-scan-outside-loops`        | Avoid `find`/`filter`/`indexOf`/`includes`/`some`/`every` in loops — hoist into a Map/Set or compute once                             |
| `@studnicky/v8/array-splice-outside-loops`      | Avoid `.splice()` in loops — each call is O(n), making the loop O(n²)                                                                 |
| `@studnicky/v8/array-spread-outside-loops`      | Never use array spread in loops — creates O(n²) work                                                                                  |
| `@studnicky/v8/chained-array-iteration`         | Disallow chaining `.map()`/`.filter()` — allocates an intermediate array and iterates twice; use `.reduce()`                          |
| `@studnicky/v8/computed-class-properties`       | Computed properties in classes break hidden classes                                                                                   |
| `@studnicky/v8/computed-object-properties`      | Computed properties in object literals break hidden classes                                                                           |
| `@studnicky/v8/conditional-property-assignment` | Conditional property assignment in a constructor breaks hidden classes; assign every property unconditionally                         |
| `@studnicky/v8/define-property`                 | `Object.defineProperty` breaks hidden classes                                                                                         |
| `@studnicky/v8/delete-property`                 | `delete` on member expressions is forbidden — it breaks V8 optimizations                                                              |
| `@studnicky/v8/dynamic-property-access`         | Dynamic (computed) property access inside an object literal breaks hidden classes                                                     |
| `@studnicky/v8/eval-function`                   | `eval()` is forbidden — breaks optimizations and is a security risk                                                                   |
| `@studnicky/v8/for-in-loops`                    | `for...in` loops are forbidden; use `Object.keys`/`entries`                                                                           |
| `@studnicky/v8/for-of-arrays`                   | Disallow `for...of` over arrays; prefer index loops for V8 optimization                                                               |
| `@studnicky/v8/inline-arrow-functions`          | Disallow inline multi-statement arrow functions in a dispatch map that is rebuilt on every call                                       |
| `@studnicky/v8/inline-functions`                | Disallow inline function expressions in a dispatch map that is rebuilt on every call                                                  |
| `@studnicky/v8/max-switch-cases`                | Switch statements above the case-count threshold must become a dispatch map instead                                                   |
| `@studnicky/v8/memoize-array-length`            | Re-reading `array.length` on every loop iteration prevents V8 optimization; memoize it before the loop                                |
| `@studnicky/v8/object-spread`                   | Object spread inside a constructor can break hidden classes; assign properties explicitly                                             |
| `@studnicky/v8/prototype-modification`          | Modifying `prototype` breaks V8 optimizations                                                                                         |
| `@studnicky/v8/regexp-in-loops`                 | Disallow `RegExp` construction inside loops — allocates a new object every iteration                                                  |
| `@studnicky/v8/switch-statements`               | Switch cases must be simple calls/returns only — delegate to a static class method, do not inline multi-statement logic               |
| `@studnicky/v8/try-catch-in-loops`              | Disallow try-catch blocks inside loops; V8 cannot optimize functions containing try-catch in hot paths                                |
| `@studnicky/v8/with-statement`                  | `with` statements are forbidden — they break optimizations                                                                            |

Full rule reference: https://studnicky.github.io/substrate/packages/eslint-config

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/eslint-config

## License

MIT
