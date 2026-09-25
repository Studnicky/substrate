import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

export namespace JobEffectEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'delayMs': { 'type': 'number' },
          'variant': { 'const': 'scheduleAdvance', 'type': 'string' }
        },
        'required': ['delayMs', 'variant'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'variant': { 'const': 'requestAck', 'type': 'string' }
        },
        'required': ['variant'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([SchemaNode.defineObject({ 'type': 'object' } as const, { 'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'variant': SchemaNode.defineConst('scheduleAdvance' as const) }, ['delayMs', 'variant'] as const, { 'additionalProperties': false }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'variant': SchemaNode.defineConst('requestAck' as const) }, ['variant'] as const, { 'additionalProperties': false })]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
