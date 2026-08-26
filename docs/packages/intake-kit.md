---
title: '@studnicky/intake-kit'
description: Generic boundary-crossing primitives shared by every schema-backed entity engine.
---

# @studnicky/intake-kit

> Generic boundary-crossing primitives shared by every schema-backed entity engine.

## Install

```bash
pnpm add @studnicky/intake-kit
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

`@studnicky/intake-kit` factors out the two pieces of logic every entity-intake engine needs and
none of them should hand-roll separately: a cycle-safe value-graph walk (`BoundaryCycleGuard`), and
the generic `{create, intake}` compile orchestration a schema-backed parser gets wrapped in
(`IntakeCompiler`). It has zero dependency on anything else in the workspace — `@studnicky/errors`
and `@studnicky/json` both depend on it instead of on each other, which is what breaks the circular
dependency that used to force `errors` to hand-roll its own copy of this machinery from scratch (see
[Why this exists](#why-this-exists)).

`IntakeCompiler.compile` takes a parser — `(candidate, options) => TEntity | undefined` — and an
injected `BoundaryConfigInterface` (a clone strategy and a failure path), and returns a
`{create, intake}` pair with the standard semantics: `intake` clones then strips unknown
properties; `create` clones then fills defaults without stripping. Neither coerces a value's type —
a wrong-typed field is rejected, not silently converted.

<!-- inline-ts-ok: illustrates the generic parser/config shape, not a runnable example against a concrete entity. -->
```typescript
import { IntakeCompiler } from '@studnicky/intake-kit';

const parser: IntakeCompiler.ParserInterface<MyEntity> = (candidate, options) => {
  // validate `candidate` per `options.rejectUnknownProperties`,
  // returning the parsed entity or `undefined` to reject it
};

const { create, intake } = IntakeCompiler.compile(parser, 'MyEntity', {
  clone: (value, entityName) => myCloneStrategy(value, entityName),
  onInvalidCandidate: (entityName, reason) => { throw new MyDomainError(entityName, reason); }
});
```

Every failure path and clone strategy is injected, so `IntakeCompiler` never throws a
domain-specific error type and never depends on `@studnicky/errors` or `@studnicky/json` — each
consumer supplies its own.

`BoundaryCycleGuard.hasCycle(value)` walks arrays, `Map` entries, `Set` members, and plain-object
properties with a `WeakSet` ancestor check, returning `true` the instant a value is revisited. Use it
as a clone strategy's cycle pre-check before a deep clone.

## Why this exists

`@studnicky/json`'s `SchemaValidator` depends on `@studnicky/errors` (for `BaseError`). That means
`@studnicky/errors` cannot depend back on `@studnicky/json` — the reverse edge would be a circular
workspace reference. Every schema-backed error entity used to work around that by hand-rolling its
own clone/validate wrapping instead of reusing `SchemaValidator`'s. That duplicated the one
piece of logic that doesn't actually vary between an Ajv-schema-driven parser and a hand-written
one: given a candidate value and a parser capable of turning it into `TEntity` or rejecting it,
produce a `{create, intake}` pair with the right clone-before-parse and reject-unknown
semantics, and fail through a caller-supplied error path. Neither coerces a value's type.

`@studnicky/intake-kit` has no dependency on `@studnicky/errors` or `@studnicky/json` — every
failure path and clone strategy is injected — so both packages depend downward on it instead of on
each other. `@studnicky/errors`' `EntityIntake` and `@studnicky/json`'s `SchemaValidator` both build
on it now, and the circular-dependency constraint that used to force `errors` to hand-roll its own
copy no longer applies.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/intake-kit)

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `BoundaryCycleGuard` | Detects cycles in an arbitrary value graph. | `@studnicky/intake-kit` |
| `IntakeCompiler` | Compiles a parser into a `{create, intake}` pair. | `@studnicky/intake-kit` |
| `EntityCreateFunctionInterface` | Contract for a compiled `create` function. | `@studnicky/intake-kit` |
| `EntityIntakeFunctionInterface` | Contract for a compiled `intake` function. | `@studnicky/intake-kit` |
