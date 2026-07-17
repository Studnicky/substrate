# @studnicky/eslint-config

> Custom ESLint rule plugin for @studnicky packages

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/eslint-config)

Custom ESLint rule plugin that ships two namespaced rule sets for TypeScript projects — 22 core rules (`plugin`) and 24 V8-optimization rules (`v8Plugin`) — plus domain-grouped suite presets for one-import consumption. Register `plugin` and `v8Plugin` in your flat config and enable the rules you want, or spread a suite in directly.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add -D @studnicky/eslint-config
```

The package has one runtime dependency, `@studnicky/types` (`workspace:*`), used by `type-alias-invariants` to derive its options type. Also install peer dependencies:

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

Import plugins from the dedicated subpath entries if you only need one namespace:

```js
// eslint.config.mjs
import { plugin } from '@studnicky/eslint-config/plugin';
import { v8Plugin } from '@studnicky/eslint-config/v8';
```

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

## Custom rules

**`@studnicky` namespace** (22 rules via `plugin` from `@studnicky/eslint-config/plugin`):

| Rule | Purpose |
|------|---------|
| `@studnicky/adapter-only-import` | Disallow importing adapter-only third-party dependencies (HTTP frameworks, database drivers, external API clients) outside the adapters layer |
| `@studnicky/all-types-are-entities` | Disallow free-standing type aliases outside entity namespaces |
| `@studnicky/canonical-export-names` | Disallow aliased exports and any non-index re-export path |
| `@studnicky/clean-diagnostics` | Disallow lint and type suppression comments |
| `@studnicky/descriptive-identifiers` | Bans internal shorthand identifiers (`cb`, `dlq`, `cfg`, `opts`, `ctx`, `idx`, etc.) in favor of descriptive names |
| `@studnicky/direct-invocation-only` | Disallow `Function.prototype.bind`/`call`/`apply` usage |
| `@studnicky/domain-purity` | Disallow impure runtime dependencies (I/O imports, non-deterministic calls) inside hexagonal-architecture domain-layer files |
| `@studnicky/folder-content-shape` | Enforce that `interfaces/`, `types/`, and `constants/`/`fixtures/` folders hold only the declaration shape their name promises |
| `@studnicky/hash-private-fields` | Disallow underscore-prefixed class members; use real `#private` fields/methods instead |
| `@studnicky/inline-trivial-logic` | Flags thin wrapper functions that only forward/delegate a value without adding logic |
| `@studnicky/interface-must-be-contract` | Interfaces express runtime contracts (functions, constructors, class references); pure JSON-serializable data shapes must be a schema-derived `type XxxType`, not an `interface` |
| `@studnicky/interface-suffix` | Every interface declaration's name must end with `Interface` |
| `@studnicky/interfaces-compose-named-types` | Interfaces must reference named types — inline object literals inside interface bodies are forbidden |
| `@studnicky/known-types-outside-adapters` | Disallow `any`/`unknown` types outside the adapters layer of a hexagonal architecture |
| `@studnicky/layer-import-boundary` | Disallow imports that cross hexagonal-architecture layer boundaries not permitted by the configured allow-matrix |
| `@studnicky/lexical-this-only` | Disallow aliasing `this` to another variable or assignment |
| `@studnicky/prefer-collection-types` | Prefer `Set`/`Map` over arrays/POJOs for membership and lookup operations |
| `@studnicky/require-options-object` | Require 2+ optional parameters to be collected into a single trailing options object |
| `@studnicky/single-export` | Enforce one named export per regular file, with restricted-topology exemptions and SCREAMING_SNAKE_CASE constant modules |
| `@studnicky/static-method-verbs` | Disallow freestanding functions at module scope; convert to static class methods |
| `@studnicky/type-alias-invariants` | Merged type-alias invariants: exported aliases must end in `Type`, must not bake in `readonly`, must not be naked re-aliases, must derive data shapes from JSON Schema, and must not duplicate an imported package shape |
| `@studnicky/whole-canonical-types` | Disallow deriving `Partial`/`Pick`/`Omit` subset views from canonical, codebase-owned named types/interfaces — define an explicit type instead |

**`@studnicky/v8` namespace** (27 rules via `v8Plugin` from `@studnicky/eslint-config/v8`):

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
