---
title: "@studnicky/entity"
description: Schema-backed entity validation and cloning for application values.
---

# @studnicky/entity

> Schema-backed entity validation and cloning for application values.

## What it is

`@studnicky/entity` is a composable schema-backed value-boundary primitive. It compiles validation, strict intake, creation, and safe cloning from a schema; it does not define catalogue or checkout entities for an application.

## What it is for

Use it when Northstar Books accepts a title, customer, or checkout command from an untrusted boundary and needs one canonical typed value before downstream code runs. Consumers define schemas and business invariants at that boundary.

## Northstar Books examples

- **Entity compilation and cycle detection** maps a submitted catalogue-title value to strict schema compilation and intake. It proves accepted values are cloned and validated while cyclic or invalid payloads fail before catalogue logic receives them.

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
  EntityValidateFunctionInterface,
} from "@studnicky/entity/interfaces";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";

export namespace UserEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      name: { default: "Anonymous", type: "string" },
    },
    required: ["id"],
    type: "object",
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> =
    EntityCompiler.compileCreate<Type>(Schema);
}

const user = UserEntity.intake({ id: "user-1" });
const fixture = UserEntity.create({ id: "fixture-1" });
```

`validate` narrows an unknown value in place. `intake` is the boundary for untrusted input: it rejects cycles and non-JSON values, clones before applying schema defaults, and throws `SchemaIntakeError` on invalid input. `create` produces validated object entities from local partial data. Import `SchemaIntakeError` from the same entity runtime entry point when a boundary needs to handle that error.

`EntityClone.clone(value, onCycle)` produces a deep independent copy and lets the caller define the cycle error.

## Northstar Books boundary

Northstar intakes a browser or partner request to create a catalogue title, customer profile, or checkout command. Compile each JSON schema once at that admission boundary, then pass the derived entity through the server without repeating raw-field checks. `intake` guarantees that accepted input is JSON-safe, cloned before defaults apply, and structurally valid; invalid input fails as `SchemaIntakeError` before it reaches catalogue or checkout logic.

## Try it

Run this to see the three operations `EntityCompiler` derives from one schema actually enforce its contract: `intake` accepts a valid Northstar Books order and the derived `validate` confirms it, then two deliberately bad calls — one with an extra undeclared field, one missing a required field — both fail fast as `SchemaIntakeError` before any order logic ever sees them.

<RunnableExample src="packages/entity/examples/entityCompiler" title="Entity compilation and cycle detection" />

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/entity)

## Public entrypoints

| Import path                    | Use it when                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| `@studnicky/entity/node`       | A Northstar Books server or worker needs runtime entity compilation and boundary errors.  |
| `@studnicky/entity/browser`    | A browser bundle needs the same entity primitive; it is a runtime alternative to `/node`. |
| `@studnicky/entity/interfaces` | A consumer needs entity compiler, intake, validation, and registry ports as contracts.    |
| `@studnicky/entity/types`      | A consumer needs exported entity type contracts without a separate runtime product.       |

## Exports

| Symbol                             | Purpose                                                                                                                                       | Import path                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `EntityCompiler`                   | Compiles JSON Schema into validation, intake, and creation functions.                                                                         | `@studnicky/entity/node`       |
| `EntityCompiler`                   | Compiles JSON Schema into validation, intake, and creation functions.                                                                         | `@studnicky/entity/browser`    |
| `EntityClone`                      | Deeply clones a boundary value and rejects cycles through its callback.                                                                       | `@studnicky/entity/node`       |
| `EntityClone`                      | Deeply clones a boundary value and rejects cycles through its callback.                                                                       | `@studnicky/entity/browser`    |
| `EntityCompilerInterface`          | The schema-compilation API every entity module derives its `validate`/`intake`/`create` from.                                                 | `@studnicky/entity/interfaces` |
| `EntityCreateFunctionInterface`    | Contract for a compiled `create` function.                                                                                                    | `@studnicky/entity/interfaces` |
| `EntityIntakeFunctionInterface`    | Contract for a compiled `intake` function.                                                                                                    | `@studnicky/entity/interfaces` |
| `EntityReferenceRegistryInterface` | Consumer-augmentable registry mapping a schema `$id` to its derived type for `$ref` resolution.                                               | `@studnicky/entity/interfaces` |
| `EntityValidateFunctionInterface`  | Contract for a compiled `validate` function.                                                                                                  | `@studnicky/entity/interfaces` |
| `EntityValidationErrorInterface`   | Contract for validation diagnostics.                                                                                                          | `@studnicky/entity/interfaces` |
| `InvariantFunctionInterface`       | A caller-supplied cross-field invariant check, returning an error message or `undefined`.                                                     | `@studnicky/entity/interfaces` |
| `ObjectSchemaShapeInterface`       | The runtime shape every JSON Schema object node carries, regardless of its branded schema type.                                               | `@studnicky/entity/interfaces` |
| `SchemaCompilerInterface`          | One schema-keyed compilation backend that compiles a schema once and caches it by `$id`.                                                      | `@studnicky/entity/interfaces` |
| `SchemaNodeInterface`              | Pairs a schema literal with its own precomputed derived type.                                                                                 | `@studnicky/entity/interfaces` |
| `SchemaRegistrySetInterface`       | The three isolated compilation backends `EntityCompiler` dispatches to.                                                                       | `@studnicky/entity/interfaces` |
| `SchemaIntakeError`                | A `BaseError` subclass (`entity.schemaIntakeFailed`) thrown on a schema intake failure.                                                       | `@studnicky/entity/node`       |
| `CodePointError`                   | Thrown when a value is not a convertible Unicode code point; the platform error is the `cause`. (`entity.codePointInvalid`)                   | `@studnicky/entity/node`       |
| `EntityCloneError`                 | Thrown when an input value cannot be structured-cloned at an entity boundary; the platform error is the `cause` (`entity.inputNotCloneable`). | `@studnicky/entity/node`       |
| `EntityCompilerConfigurationError` | Thrown when `EntityCompiler` is used without a runtime-specific registries accessor. (`entity.compilerConfigurationInvalid`)                  | `@studnicky/entity/node`       |
| `SchemaDefaultError`               | Thrown when a schema default cannot be structured-cloned onto an entity. (`entity.schemaDefaultNotCloneable`)                                 | `@studnicky/entity/node`       |
| `SchemaNodeDefinitionError`        | Thrown when a recursive schema node is read before its definition resolves. (`entity.schemaNodeDefinitionInvalid`)                            | `@studnicky/entity/node`       |
| `SchemaPatternError`               | Thrown when a schema pattern is not a valid regular expression; the platform error is the `cause`. (`entity.schemaPatternInvalid`)            | `@studnicky/entity/node`       |
| `SchemaReferenceError`             | Thrown when a schema reference addresses no locatable target. (`entity.schemaReferenceUnresolvable`)                                          | `@studnicky/entity/node`       |
| `SchemaIntakeError`                | A `BaseError` subclass (`entity.schemaIntakeFailed`) thrown on a schema intake failure.                                                       | `@studnicky/entity/browser`    |
| `CodePointError`                   | Thrown when a value is not a convertible Unicode code point; the platform error is the `cause`. (`entity.codePointInvalid`)                   | `@studnicky/entity/browser`    |
| `EntityCloneError`                 | Thrown when an input value cannot be structured-cloned at an entity boundary; the platform error is the `cause` (`entity.inputNotCloneable`). | `@studnicky/entity/browser`    |
| `EntityCompilerConfigurationError` | Thrown when `EntityCompiler` is used without a runtime-specific registries accessor. (`entity.compilerConfigurationInvalid`)                  | `@studnicky/entity/browser`    |
| `SchemaDefaultError`               | Thrown when a schema default cannot be structured-cloned onto an entity. (`entity.schemaDefaultNotCloneable`)                                 | `@studnicky/entity/browser`    |
| `SchemaNodeDefinitionError`        | Thrown when a recursive schema node is read before its definition resolves. (`entity.schemaNodeDefinitionInvalid`)                            | `@studnicky/entity/browser`    |
| `SchemaPatternError`               | Thrown when a schema pattern is not a valid regular expression; the platform error is the `cause`. (`entity.schemaPatternInvalid`)            | `@studnicky/entity/browser`    |
| `SchemaReferenceError`             | Thrown when a schema reference addresses no locatable target. (`entity.schemaReferenceUnresolvable`)                                          | `@studnicky/entity/browser`    |
