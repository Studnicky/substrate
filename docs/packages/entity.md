---
title: '@studnicky/entity'
description: Parser-backed entity intake APIs and cycle checks for application values.
---

# @studnicky/entity

> Parser-backed entity intake APIs and cycle checks for application values.

## Install

```bash
pnpm add @studnicky/entity
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Runtime imports

Use `@studnicky/entity/node` in Node.js and `@studnicky/entity/browser` in browser bundles. Both runtime entry points expose the same API. Types remain available from `@studnicky/entity/interfaces`.

## Usage

Use `EntityCompiler` to expose two entity entry points from one record parser:

- `intake(input)` accepts values crossing into your application.
- `create(partial)` builds a value your application owns.

Both functions clone their input before parsing, so parser-side normalization cannot mutate the caller's value. The compiler sets `rejectUnknownProperties: true` for both entry points. Your parser must reject undeclared keys when that option is set; it may apply its own defaults or normalization to the private clone.

### Compile an entity intake API

Provide a parser that returns the entity or `undefined`, an entity name for diagnostics, and a clone/error configuration that fits your application:

<!-- inline-ts-ok: illustrates the generic parser/config shape, not a runnable example against a concrete entity. -->
```typescript
import { EntityCompiler } from '@studnicky/entity/node';

const parser: EntityCompiler.ParserInterface<MyEntity> = (candidate, options) => {
  // Return an entity when `candidate` is valid and contains only declared keys.
  // Return undefined when it is not.
};

const { create, intake } = EntityCompiler.compile(parser, 'MyEntity', {
  clone: (value, entityName) => myCloneStrategy(value, entityName),
  onInvalidCandidate: (entityName, reason) => { throw new MyDomainError(entityName, reason); }
});
```

Call `intake` at an input boundary and `create` when producing an entity in your own code. Your `clone` function controls how values are copied, and `onInvalidCandidate` defines the error your application receives for a non-object or parser rejection.

### Reject cyclic values

Use `BoundaryCycleGuard.hasCycle(value)` before cloning, serializing, or otherwise processing a value that must be acyclic. It traverses arrays, `Map` entries, `Set` members, and object properties.

<!-- inline-ts-ok: conceptual cycle-detection example; no package example fixture exists. -->
```typescript
import { BoundaryCycleGuard } from '@studnicky/entity/node';

const payload: { parent?: unknown } = {};
payload.parent = payload;

if (BoundaryCycleGuard.hasCycle(payload)) {
  throw new TypeError('payload must not contain a cycle');
}
```


## Try it

Run strict entity intake and creation, then check an acyclic and cyclic value graph.

<RunnableExample src="packages/entity/examples/entityCompiler" title="Entity compilation and cycle detection" />

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/entity)

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `BoundaryCycleGuard` | Detects cycles in an arbitrary value graph. | `@studnicky/entity/node` |
| `BoundaryCycleGuard` | Detects cycles in an arbitrary value graph. | `@studnicky/entity/browser` |
| `EntityCompiler` | Compiles a parser into a `{create, intake}` pair. | `@studnicky/entity/node` |
| `EntityCompiler` | Compiles a parser into a `{create, intake}` pair. | `@studnicky/entity/browser` |
| `EntityCreateFunctionInterface` | Contract for a compiled `create` function. | `@studnicky/entity/interfaces` |
| `EntityIntakeFunctionInterface` | Contract for a compiled `intake` function. | `@studnicky/entity/interfaces` |
