import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace LoggerOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'level': {
        'description': 'Global minimum log level. Records below this floor are discarded.',
        'oneOf': [
          { 'enum': ['trace', 'debug', 'info', 'warn', 'error', 'silent'], 'type': 'string' },
          { 'enum': [0, 1, 2, 3, 4, 5], 'type': 'integer' }
        ]
      },
      'metadata': {
        'additionalProperties': {},
        'description': 'Base metadata attached to every record.',
        'type': 'object'
      }
    },
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'level': SchemaNode.defineOneOf([SchemaNode.defineEnum(['trace', 'debug', 'info', 'warn', 'error', 'silent'] as const), SchemaNode.defineEnum([0, 1, 2, 3, 4, 5] as const)]), 'metadata': SchemaNode.defineObject({ 'description': 'Base metadata attached to every record.', 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': SchemaNode.defineUnknown({} as const) }) }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
