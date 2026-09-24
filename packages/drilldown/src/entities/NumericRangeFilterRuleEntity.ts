import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Filter rule matching records by numeric range. */
export namespace NumericRangeFilterRuleEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maximum': { 'type': 'number' },
      'minimum': { 'type': 'number' },
      'property': { 'type': 'string' },
      'type': { 'const': 'numeric' }
    },
    'required': ['property', 'type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'property': SchemaNode.defineString({ 'type': 'string' } as const), 'type': SchemaNode.defineConst('numeric' as const) }, ['property', 'type'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
