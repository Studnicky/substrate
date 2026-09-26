import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * Telemetry event emitted when a request completes successfully.
 */
export namespace ResponseEventEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ResponseEvent',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Telemetry event emitted when a request completes successfully.',
    'properties': {
      'durationMs': { 'description': 'Request duration in milliseconds.', 'minimum': 0, 'type': 'number' },
      'method': { 'description': 'HTTP method.', 'type': 'string' },
      'requestId': { 'description': 'Unique identifier for this request.', 'type': 'string' },
      'statusCode': { 'description': 'HTTP response status code.', 'minimum': 100, 'type': 'integer' }
    },
    'required': ['durationMs', 'method', 'requestId', 'statusCode'],
    'title': 'ResponseEvent',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ResponseEvent', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Telemetry event emitted when a request completes successfully.', 'title': 'ResponseEvent', 'type': 'object' } as const, { 'durationMs': SchemaNode.defineNumber({ 'description': 'Request duration in milliseconds.', 'minimum': 0, 'type': 'number' } as const), 'method': SchemaNode.defineString({ 'description': 'HTTP method.', 'type': 'string' } as const), 'requestId': SchemaNode.defineString({ 'description': 'Unique identifier for this request.', 'type': 'string' } as const), 'statusCode': SchemaNode.defineNumber({ 'description': 'HTTP response status code.', 'minimum': 100, 'type': 'integer' } as const) }, ['durationMs', 'method', 'requestId', 'statusCode'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
