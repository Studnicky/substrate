import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

import { JsonValueNode } from '../schema/JsonValueNode.js';
import { JsonValueSchema } from '../schema/JsonValueSchema.js';

/** Canonical finite, acyclic JSON data from an external boundary. */
export namespace JsonValueEntity {
  export const Schema = {
    ...JsonValueSchema,
    '$ref': '#/$defs/JsonValue',
    'title': 'JsonValue'
  } as const;

  export const Node = SchemaNode.defineReference('#/$defs/JsonValue', JsonValueNode, 'JsonValue');
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
