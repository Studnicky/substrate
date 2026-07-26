---
"@studnicky/signal": patch
"@studnicky/eslint-config": patch
"@studnicky/timing": patch
"@studnicky/process-kit": patch
"@studnicky/boundary-kit": patch
"@studnicky/scheduler": patch
"@studnicky/file-lock": patch
"@studnicky/event-bus": patch
"@studnicky/sliding-window-limiter": patch
"@studnicky/batch": patch
"@studnicky/flag-evaluator": patch
"@studnicky/resilience": patch
"@studnicky/retry": patch
"@studnicky/clock": patch
"@studnicky/json": patch
"@studnicky/predicates": patch
"@studnicky/config": patch
"@studnicky/memoize": patch
"@studnicky/bounded-dispatcher": patch
"@studnicky/cache": patch
"@studnicky/entity-store": patch
"@studnicky/keyed-rate-limiter": patch
"@studnicky/virtual-fs": patch
---

### Fixed

- Test-suite type errors across these packages' `tests/**` and `examples/**` are eliminated, gated on `tsc -p tsconfig.eslint.json`. Three patterns account for most of them:
  - **Un-narrowed scenario unions**: a runner map typed `Record<ScenarioCase['shape'], (c: ScenarioCase) => void>` gives every runner the full union instead of its own variant, so per-shape property access reports `TS2339`. Each runner map now types its entries `(c: Extract<ScenarioCase, { shape: K }>) => ...` via a generic `ScenarioRunner<K>`, and the dispatching `runCase`/`runnerMap[shape]` call sites are generic over the same `K`. Where one scenario variant legitimately shared its shape across multiple literal names (`Extract` distributes per union member, not per literal, so a shared-shape variant collapses to `never`), the variant is split into one member per literal instead.
  - **`this`-polymorphic factory explicit-type-argument pitfall**: `Subclass.create<T>(...)` on a `static create<T, TInstance extends Shape = Base<T>>(this: ..., ...)` factory blocks `TInstance` inference from `this`, silently returning the base type instead of the subclass and breaking every subclass-only member access. Dropping the explicit type argument (`Subclass.create(...)`) lets both parameters infer correctly. Constructors that already declared `public constructor() { super(); }` are unaffected by this and untouched.
  - **JSON-import scenario casts**: `scenarioGroups.cases` types as a JSON-literal-inferred union (widened `string` discriminants) that doesn't structurally satisfy the hand-written `ScenarioCase[]`/`Record<Shape, ...>` type without an explicit cast at the JSON→TS boundary — the same idiom already used at ~200 other call sites in this test suite.
- A handful of one-off fixes ride along: `assert.equal(typeof x, 'y')`/`assert.ok(cond)` calls that don't narrow (replaced with explicit `if (typeof x !== 'y') throw` guards or reordered before use); array/object destructuring under strict indexed-access that needed a defined-check; a self-referential `typeof signal.addEventListener` type annotation in `resilience`; two `readonly T[]` getters typed as mutable `T[]` in `file-lock` and `cache`'s example files; a redundant no-op `.events.length = 0` on a freshly-constructed instance in `cache`'s example; and `exactOptionalPropertyTypes` mismatches where an object literal explicitly carried `| undefined` into a stricter target (`bounded-dispatcher`, `retry`).
- `packages/mutex/tests/fixtures/constants.ts` imported `MutexConfigInterface` from a path that no longer exists; it now imports `MutexConfigEntity.Type` from its current location.
- `packages/mutex/examples/keyedWorkGateComposition.ts`'s `mutex.runExclusive(key, fn)` call (no `acceptsResult` predicate) always types its result `unknown` by design; the example now supplies the `(value): value is string => ...` predicate the source's own JSDoc documents for this case.

### Left as-is (verified, not a defect)

- `ErrorClassifier` is `abstract` with no static factory at all; subclasses are constructed directly.
