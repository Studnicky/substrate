---
title: '@studnicky/intake-kit'
description: Parser-backed entity intake APIs and cycle checks for application values.
---

# @studnicky/intake-kit

> Parser-backed entity intake APIs and cycle checks for application values.

## Install

```bash
pnpm add @studnicky/intake-kit
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

Use `IntakeCompiler` to expose two entity entry points from one record parser:

- `intake(input)` accepts values crossing into your application.
- `create(partial)` builds a value your application owns.

Both functions clone their input before parsing, so parser-side normalization cannot mutate the caller's value. The compiler asks the parser to use `rejectUnknownProperties: false` for `intake` and `true` for `create`; the parser defines how each mode handles defaults and unknown properties.

### Compile an entity intake API

Provide a parser that returns the entity or `undefined`, an entity name for diagnostics, and a clone/error configuration that fits your application:

<!-- inline-ts-ok: illustrates the generic parser/config shape, not a runnable example against a concrete entity. -->
```typescript
import { IntakeCompiler } from '@studnicky/intake-kit';

const parser: IntakeCompiler.ParserInterface<MyEntity> = (candidate, options) => {
  // Return an entity when `candidate` is valid for the selected parser mode.
  // Return undefined when it is not.
};

const { create, intake } = IntakeCompiler.compile(parser, 'MyEntity', {
  clone: (value, entityName) => myCloneStrategy(value, entityName),
  onInvalidCandidate: (entityName, reason) => { throw new MyDomainError(entityName, reason); }
});
```

Call `intake` at an input boundary and `create` when producing an entity in your own code. Your `clone` function controls how values are copied, and `onInvalidCandidate` defines the error your application receives for a non-object or parser rejection.

### Reject cyclic values

Use `BoundaryCycleGuard.hasCycle(value)` before cloning, serializing, or otherwise processing a value that must be acyclic. It traverses arrays, `Map` entries, `Set` members, and object properties.

<!-- inline-ts-ok: conceptual cycle-detection example; no package example fixture exists. -->
```typescript
import { BoundaryCycleGuard } from '@studnicky/intake-kit';

const payload: { parent?: unknown } = {};
payload.parent = payload;

if (BoundaryCycleGuard.hasCycle(payload)) {
  throw new TypeError('payload must not contain a cycle');
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/intake-kit)

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `BoundaryCycleGuard` | Detects cycles in an arbitrary value graph. | `@studnicky/intake-kit` |
| `IntakeCompiler` | Compiles a parser into a `{create, intake}` pair. | `@studnicky/intake-kit` |
| `EntityCreateFunctionInterface` | Contract for a compiled `create` function. | `@studnicky/intake-kit` |
| `EntityIntakeFunctionInterface` | Contract for a compiled `intake` function. | `@studnicky/intake-kit` |
