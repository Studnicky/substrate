# @studnicky/entity

> Compile strict entity input boundaries and detect cyclic value graphs

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/entity)

`@studnicky/entity` compiles a parser into strict `intake` and `create` functions, and provides cycle detection for values your parser needs to clone or process.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/entity
```

## Runtime imports

Use `@studnicky/entity/node` in Node.js and `@studnicky/entity/browser` in browser bundles. Both runtime entry points expose the same API. Types remain available from `@studnicky/entity/interfaces`.

## Usage

`EntityCompiler.compile` takes a parser — `(candidate, options) => TEntity | undefined` — and an injected `BoundaryConfigInterface` (a clone strategy and a failure path). It returns `{create, intake}` functions that clone input before parsing and require the parser to reject undeclared properties through `options.rejectUnknownProperties`. The compiler never coerces values or removes properties.

```typescript
import { EntityCompiler } from '@studnicky/entity/node';

const parser: EntityCompiler.ParserInterface<MyEntity> = (candidate, options) => {
  // validate `candidate` per `options.rejectUnknownProperties`,
  // returning the parsed entity or `undefined` to reject it
};

const { create, intake } = EntityCompiler.compile(parser, 'MyEntity', {
  clone: (value, entityName) => myCloneStrategy(value, entityName),
  onInvalidCandidate: (entityName, reason) => { throw new MyDomainError(entityName, reason); }
});
```

Provide a clone strategy and failure path that match your application's error model.

`BoundaryCycleGuard.hasCycle(value)` walks arrays, `Map` entries, `Set` members, and plain-object properties with a `WeakSet` ancestor check, returning `true` the instant a value is revisited. Use it as a clone strategy's cycle pre-check before a deep clone.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/entity)

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `BoundaryCycleGuard` | Detects cycles in an arbitrary value graph. | `@studnicky/entity/node` or `@studnicky/entity/browser` |
| `EntityCompiler` | Compiles a parser into a `{create, intake}` pair. | `@studnicky/entity/node` or `@studnicky/entity/browser` |
| `EntityCreateFunctionInterface` | Contract for a compiled `create` function. | `@studnicky/entity/interfaces` |
| `EntityIntakeFunctionInterface` | Contract for a compiled `intake` function. | `@studnicky/entity/interfaces` |
