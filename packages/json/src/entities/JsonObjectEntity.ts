import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { JsonValueNode } from '../schema/JsonValueNode.js';
import { JsonValueSchema } from '../schema/JsonValueSchema.js';

/** Canonical plain JSON object produced within the package or parsed at a boundary. */
export namespace JsonObjectEntity {
  export const Schema = {
    ...JsonValueSchema,
    'additionalProperties': { '$ref': '#/$defs/JsonValue' },
    'title': 'JsonObject',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'title': 'JsonObject', 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': SchemaNode.defineReference('#/$defs/JsonValue', JsonValueNode), 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
