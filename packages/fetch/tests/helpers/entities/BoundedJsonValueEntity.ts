import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * A plain JSON value bounded to 3 levels of nesting — every `*.scenarios.json` fixture in this
 * package that materializes an arbitrary config value nests at most 3 deep (verified against the
 * fixtures). `NodeSchemaAgreement` only flattens `oneOf`/`properties`/`additionalProperties`/`items`,
 * so unbounded `$ref` recursion (as in `@studnicky/json`'s `JsonValueEntity`) cannot be proven to
 * agree with a hand-written literal `Schema`; a finite unrolling avoids that entirely.
 *
 * Each rung's `array`/`object` branch nests the *next* rung down exactly once — never both a
 * shallow and a deep array/object branch side by side, which would give `oneOf` two branches of
 * the same JSON `type` and make every array/object value ambiguous.
 */
export namespace BoundedJsonValueEntity {
  const scalarSchema = { 'oneOf': [{ 'type': 'null' }, { 'type': 'boolean' }, { 'type': 'number' }, { 'type': 'string' }] } as const;
  const ScalarNode = SchemaNode.defineOneOf({}, [
    SchemaNode.defineNull({ 'type': 'null' } as const),
    SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineString({ 'type': 'string' } as const)
  ] as const);

  const oneNestedSchema = {
    'oneOf': [
      ...scalarSchema.oneOf,
      { 'items': scalarSchema, 'type': 'array' },
      { 'additionalProperties': scalarSchema, 'properties': {}, 'required': [], 'type': 'object' }
    ]
  } as const;
  const OneNestedNode = SchemaNode.defineOneOf({}, [
    ...ScalarNode.schema.oneOf,
    SchemaNode.defineArray({ 'type': 'array' } as const, ScalarNode, undefined),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': ScalarNode, 'patternProperties': {} })
  ] as const);

  export const Schema = {
    'oneOf': [
      ...scalarSchema.oneOf,
      { 'items': oneNestedSchema, 'type': 'array' },
      { 'additionalProperties': oneNestedSchema, 'properties': {}, 'required': [], 'type': 'object' }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    ...ScalarNode.schema.oneOf,
    SchemaNode.defineArray({ 'type': 'array' } as const, OneNestedNode, undefined),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': OneNestedNode, 'patternProperties': {} })
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
