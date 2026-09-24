import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace FlagDefinitionEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'defaultValue': { 'type': 'boolean' },
      'enabled': { 'type': 'boolean' },
      'rolloutPercent': { 'maximum': 100, 'minimum': 0, 'type': 'number' }
    },
    'required': ['defaultValue', 'enabled'],
    'type': 'object'
  } as const;

  /** The shape registered under a flag name via `FlagEvaluator#register()`. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'defaultValue': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'rolloutPercent': SchemaNode.defineNumber({ 'maximum': 100, 'minimum': 0, 'type': 'number' } as const) }, ['defaultValue', 'enabled'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
