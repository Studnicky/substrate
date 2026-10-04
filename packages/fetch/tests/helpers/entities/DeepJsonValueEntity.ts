import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { BoundedJsonValueEntity } from './BoundedJsonValueEntity.js';

/**
 * A plain JSON value whose objects nest six levels deep, for fixtures that build deeply nested request
 * bodies. Each rung adds one object level on top of `BoundedJsonValueEntity`; arrays at every rung hold
 * `BoundedJsonValueEntity` items. The finite unrolling keeps `Schema` and `Node` provably in agreement,
 * which an unbounded `$ref` recursion cannot, and `oneOf` never sees two branches of the same JSON `type`.
 */
export namespace DeepJsonValueEntity {
  const scalarSchema = { 'oneOf': [{ 'type': 'null' }, { 'type': 'boolean' }, { 'type': 'number' }, { 'type': 'string' }] } as const;
  const ScalarNode = SchemaNode.defineOneOf({}, [
    SchemaNode.defineNull({ 'type': 'null' } as const),
    SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    SchemaNode.defineNumber({ 'type': 'number' } as const),
    SchemaNode.defineString({ 'type': 'string' } as const)
  ] as const);

  const rung1Schema = {
    'oneOf': [
      ...scalarSchema.oneOf,
      { 'items': BoundedJsonValueEntity.Schema, 'type': 'array' },
      { 'additionalProperties': BoundedJsonValueEntity.Schema, 'properties': {}, 'required': [], 'type': 'object' }
    ]
  } as const;
  const Rung1Node = SchemaNode.defineOneOf({}, [
    ...ScalarNode.schema.oneOf,
    SchemaNode.defineArray({ 'type': 'array' } as const, BoundedJsonValueEntity.Node, undefined),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': BoundedJsonValueEntity.Node, 'patternProperties': {} })
  ] as const);

  const rung2Schema = {
    'oneOf': [
      ...scalarSchema.oneOf,
      { 'items': BoundedJsonValueEntity.Schema, 'type': 'array' },
      { 'additionalProperties': rung1Schema, 'properties': {}, 'required': [], 'type': 'object' }
    ]
  } as const;
  const Rung2Node = SchemaNode.defineOneOf({}, [
    ...ScalarNode.schema.oneOf,
    SchemaNode.defineArray({ 'type': 'array' } as const, BoundedJsonValueEntity.Node, undefined),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': Rung1Node, 'patternProperties': {} })
  ] as const);

  const rung3Schema = {
    'oneOf': [
      ...scalarSchema.oneOf,
      { 'items': BoundedJsonValueEntity.Schema, 'type': 'array' },
      { 'additionalProperties': rung2Schema, 'properties': {}, 'required': [], 'type': 'object' }
    ]
  } as const;
  const Rung3Node = SchemaNode.defineOneOf({}, [
    ...ScalarNode.schema.oneOf,
    SchemaNode.defineArray({ 'type': 'array' } as const, BoundedJsonValueEntity.Node, undefined),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': Rung2Node, 'patternProperties': {} })
  ] as const);

  export const Schema = {
    'oneOf': [
      ...scalarSchema.oneOf,
      { 'items': BoundedJsonValueEntity.Schema, 'type': 'array' },
      { 'additionalProperties': rung3Schema, 'properties': {}, 'required': [], 'type': 'object' }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    ...ScalarNode.schema.oneOf,
    SchemaNode.defineArray({ 'type': 'array' } as const, BoundedJsonValueEntity.Node, undefined),
    SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': Rung3Node, 'patternProperties': {} })
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
