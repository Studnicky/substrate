import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { LogDataEntity } from './LogDataEntity.js';

/**
 * Immutable log record assembled at emit time and passed to each transport.
 */
export namespace LogRecordEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/LogRecord',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Immutable log record assembled at emit time and passed to each transport.',
    'properties': {
      'data': LogDataEntity.Schema,
      'level': {
        'description': 'Log level numeric value (0 TRACE through 5 SILENT).',
        'enum': [0, 1, 2, 3, 4, 5],
        'type': 'integer'
      },
      'metadata': {
        'additionalProperties': true,
        'description': 'Metadata object attached to log entries.',
        'type': 'object'
      },
      'time': {
        'description': 'Epoch milliseconds timestamp at emit time.',
        'minimum': 0,
        'type': 'number'
      }
    },
    'required': ['data', 'level', 'metadata', 'time'],
    'title': 'LogRecord',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/LogRecord', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Immutable log record assembled at emit time and passed to each transport.', 'title': 'LogRecord', 'type': 'object' } as const, { 'data': LogDataEntity.Node, 'level': SchemaNode.defineEnum([0, 1, 2, 3, 4, 5] as const), 'metadata': SchemaNode.defineObject({ 'description': 'Metadata object attached to log entries.', 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': true }), 'time': SchemaNode.defineNumber({
    'description': 'Epoch milliseconds timestamp at emit time.',
    'minimum': 0,
    'type': 'number'
  } as const) }, ['data', 'level', 'metadata', 'time'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
