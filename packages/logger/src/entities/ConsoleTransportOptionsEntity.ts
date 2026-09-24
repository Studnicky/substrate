import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * Configuration options for ConsoleTransport.
 */
export namespace ConsoleTransportOptionsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ConsoleTransportOptions',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Configuration options for ConsoleTransport.',
    'properties': {
      'level': {
        'description': 'Minimum log level this transport accepts. Records below this level are silently ignored. Defaults to the Logger global floor (TRACE).',
        'oneOf': [
          { 'enum': ['trace', 'debug', 'info', 'warn', 'error', 'silent'], 'type': 'string' },
          { 'enum': [0, 1, 2, 3, 4, 5], 'type': 'integer' }
        ]
      }
    },
    'title': 'ConsoleTransportOptions',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ConsoleTransportOptions', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Configuration options for ConsoleTransport.', 'title': 'ConsoleTransportOptions', 'type': 'object' } as const, { 'level': SchemaNode.defineOneOf([SchemaNode.defineEnum(['trace', 'debug', 'info', 'warn', 'error', 'silent'] as const), SchemaNode.defineEnum([0, 1, 2, 3, 4, 5] as const)]) }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
