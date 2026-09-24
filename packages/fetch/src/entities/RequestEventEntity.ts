import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * Telemetry event emitted when a request starts.
 */
export namespace RequestEventEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RequestEvent',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Telemetry event emitted when a request starts.',
    'properties': {
      'method': { 'description': 'HTTP method.', 'type': 'string' },
      'requestId': { 'description': 'Unique identifier for this request.', 'type': 'string' },
      'url': { 'description': 'Request URL.', 'type': 'string' }
    },
    'required': ['method', 'requestId', 'url'],
    'title': 'RequestEvent',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/RequestEvent', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Telemetry event emitted when a request starts.', 'title': 'RequestEvent', 'type': 'object' } as const, { 'method': SchemaNode.defineString({ 'description': 'HTTP method.', 'type': 'string' } as const), 'requestId': SchemaNode.defineString({ 'description': 'Unique identifier for this request.', 'type': 'string' } as const), 'url': SchemaNode.defineString({ 'description': 'Request URL.', 'type': 'string' } as const) }, ['method', 'requestId', 'url'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
