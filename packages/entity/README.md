# @studnicky/entity

> Validate JSON entities at intake and creation boundaries

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/entity)

`@studnicky/entity` compiles JSON Schema into reusable validation, intake, and creation functions. Define an entity schema once and use it wherever that entity enters or is assembled by your application.

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

Declare the complete JSON Schema for the entity, including `required` fields and `additionalProperties: false` when its object shape is closed. Compile the schema once at module scope.

```typescript
import { EntityCompiler } from '@studnicky/entity/node';

interface SubscriberInterface {
  readonly 'email': string;
  readonly 'name': string;
}

const SubscriberSchema = {
  'additionalProperties': false,
  'properties': {
    'email': { 'format': 'email', 'type': 'string' },
    'name': { 'type': 'string' }
  },
  'required': ['email', 'name'],
  'type': 'object'
};

const validate = EntityCompiler.compile<SubscriberInterface>(SubscriberSchema);
const intake = EntityCompiler.compileIntake<SubscriberInterface>(SubscriberSchema);
const create = EntityCompiler.compileCreate<SubscriberInterface>(SubscriberSchema);

const candidate: unknown = { 'email': 'ada@example.test', 'name': 'Ada' };
if (validate(candidate)) {
  console.log(candidate.email);
}

const input = intake(candidate);
const owned = create({ 'email': 'ada@example.test', 'name': 'Ada' });
console.log(input, owned);
```

`compile` returns a type guard. `compileIntake` accepts unknown external data, rejects cyclic or non-JSON input, clones it, applies schema defaults, and throws `SchemaIntakeError` when validation fails. `compileCreate` validates trusted partial object data and applies schema defaults. Neither method coerces values or removes fields that the schema does not declare.

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `EntityClone` | Clones an acyclic value graph. | `@studnicky/entity/node` or `@studnicky/entity/browser` |
| `EntityCompiler` | Compiles JSON Schema into validation, intake, and creation functions. | `@studnicky/entity/node` or `@studnicky/entity/browser` |
| `SchemaIntakeError` | Reports failed entity intake or creation. | `@studnicky/entity/node` or `@studnicky/entity/browser` |
| `EntityCreateFunctionInterface` | Contract for a compiled creation function. | `@studnicky/entity/interfaces` |
| `EntityIntakeFunctionInterface` | Contract for a compiled intake function. | `@studnicky/entity/interfaces` |
| `EntityValidateFunctionInterface` | Contract for a compiled validation function. | `@studnicky/entity/interfaces` |
| `EntityValidationErrorInterface` | Contract for a schema validation diagnostic. | `@studnicky/entity/interfaces` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/entity)
