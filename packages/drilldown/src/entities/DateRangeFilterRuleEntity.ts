import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Filter rule matching records by date range. */
export namespace DateRangeFilterRuleEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maximum': { 'type': 'integer' },
      'minimum': { 'type': 'integer' },
      'property': { 'type': 'string' },
      'type': { 'const': 'date' }
    },
    'required': ['property', 'type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximum': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'minimum': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'property': SchemaNode.defineString({ 'type': 'string' } as const), 'type': SchemaNode.defineConst({}, 'date' as const) }, ['property', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
