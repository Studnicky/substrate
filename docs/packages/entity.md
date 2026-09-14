---
title: '@studnicky/entity'
description: Schema-backed entity validation and cloning for application values.
---

# @studnicky/entity

> Schema-backed entity validation and cloning for application values.

## Install

```bash
pnpm add @studnicky/entity
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Runtime imports

Use `@studnicky/entity/node` in Node.js and `@studnicky/entity/browser` in browser bundles. Both runtime entry points expose the same API. Types remain available from `@studnicky/entity/interfaces`.

## Usage

`EntityCompiler` is the one boundary compiler for JSON entities. Define the schema once, then compile its validation, intake, and creation operations. Use `@studnicky/entity/node` in Node.js or `@studnicky/entity/browser` in browser bundles.

### Schema entities

Define the schema once, derive its Type, and compile the three entity operations at module load:

<!-- inline-ts-ok: conceptual schema entity; import paths are verified by check-docs-exports. -->
```ts
import { EntityCompiler } from "@studnicky/entity/node";
import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from "@studnicky/entity/interfaces";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";

export namespace UserEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      name: { default: "Anonymous", type: "string" }
    },
    required: ["id"],
    type: "object"
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}

const user = UserEntity.intake({ id: "user-1" });
const fixture = UserEntity.create({ id: "fixture-1" });
```

`validate` narrows an unknown value in place. `intake` is the boundary for untrusted input: it rejects cycles and non-JSON values, clones before applying schema defaults, and throws `SchemaIntakeError` on invalid input. `create` produces validated object entities from local partial data. Import `SchemaIntakeError` from the same entity runtime entry point when a boundary needs to handle that error.

`EntityClone.clone(value, onCycle)` produces a deep independent copy and lets the caller define the cycle error.

## Try it

Run strict entity intake and creation, then check an acyclic and cyclic value graph.

<RunnableExample src="packages/entity/examples/entityCompiler" title="Entity compilation and cycle detection" />

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/entity)

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `EntityCompiler` | Compiles JSON Schema into validation, intake, and creation functions. | `@studnicky/entity/node` |
| `EntityCompiler` | Compiles JSON Schema into validation, intake, and creation functions. | `@studnicky/entity/browser` |
| `EntityClone` | Deeply clones a boundary value and rejects cycles through its callback. | `@studnicky/entity/node` |
| `EntityClone` | Deeply clones a boundary value and rejects cycles through its callback. | `@studnicky/entity/browser` |
| `EntityCreateFunctionInterface` | Contract for a compiled `create` function. | `@studnicky/entity/interfaces` |
| `EntityIntakeFunctionInterface` | Contract for a compiled `intake` function. | `@studnicky/entity/interfaces` |
| `EntityValidateFunctionInterface` | Contract for a compiled `validate` function. | `@studnicky/entity/interfaces` |
| `EntityValidationErrorInterface` | Contract for validation diagnostics. | `@studnicky/entity/interfaces` |
| `SchemaIntakeError` | Represents a schema intake failure. | `@studnicky/entity/node` |
| `SchemaIntakeError` | Represents a schema intake failure. | `@studnicky/entity/browser` |
