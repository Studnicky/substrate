# @studnicky/intake-kit

> Generic boundary-crossing primitives shared by every schema-backed entity engine

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/intake-kit)

`@studnicky/intake-kit` factors out the two pieces of logic every entity-intake engine in this repository needs and none of them should hand-roll separately: a cycle-safe value-graph walk (`BoundaryCycleGuard`), and the generic `{create, intake}` compile orchestration a schema-backed parser gets wrapped in (`IntakeCompiler`). It depends on nothing else in the workspace, which is the point — `@studnicky/errors` and `@studnicky/json` both depend on it instead of on each other, breaking the circular dependency that previously forced `errors` to hand-roll its own copy of this machinery from scratch.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/intake-kit
```

## Usage

`IntakeCompiler.compile` takes a parser — `(candidate, options) => TEntity | undefined` — and an injected `BoundaryConfigInterface` (a clone strategy and a failure path), and returns a `{create, intake}` pair with the standard semantics: `intake` clones then coerces and strips unknown properties; `create` clones then fills defaults without coercing or stripping.

```typescript
import { IntakeCompiler } from '@studnicky/intake-kit';

const parser: IntakeCompiler.ParserInterface<MyEntity> = (candidate, options) => {
  // validate/coerce `candidate` per `options.coerce` / `options.rejectUnknownProperties`,
  // returning the parsed entity or `undefined` to reject it
};

const { create, intake } = IntakeCompiler.compile(parser, 'MyEntity', {
  clone: (value, entityName) => myCloneStrategy(value, entityName),
  onInvalidCandidate: (entityName, reason) => { throw new MyDomainError(entityName, reason); }
});
```

Every failure path and clone strategy is injected, so `IntakeCompiler` never throws a domain-specific error type and never depends on `@studnicky/errors` or `@studnicky/json` — each consumer supplies its own.

`BoundaryCycleGuard.hasCycle(value)` walks arrays, `Map` entries, `Set` members, and plain-object properties with a `WeakSet` ancestor check, returning `true` the instant a value is revisited. Use it as a clone strategy's cycle pre-check before a deep clone.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/intake-kit)

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `BoundaryCycleGuard` | Detects cycles in an arbitrary value graph. | `@studnicky/intake-kit` |
| `IntakeCompiler` | Compiles a parser into a `{create, intake}` pair. | `@studnicky/intake-kit` |
| `EntityCreateFunctionInterface` | Contract for a compiled `create` function. | `@studnicky/intake-kit` |
| `EntityIntakeFunctionInterface` | Contract for a compiled `intake` function. | `@studnicky/intake-kit` |
