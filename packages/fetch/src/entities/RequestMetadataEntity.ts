import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * Request metadata that flows through the request/response lifecycle
 * Contains tracking information, timing data, and user-provided metadata
 * All properties are always present for V8 optimization (consistent hidden class)
 */
export namespace RequestMetadataEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RequestMetadata',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Request metadata that flows through the request/response lifecycle',
    'properties': {
      'metadata': {
        'description': 'User-provided metadata for logging and tracking. Key-value pairs that flow through lifecycle hooks.',
        'type': 'object'
      },
      'method': {
        'description': 'HTTP method (GET, POST, etc.)',
        'type': 'string'
      },
      'path': {
        'description': 'Original path before URL building',
        'type': 'string'
      },
      'requestId': {
        'description': 'Unique identifier for this request. Auto-generated or provided by user.',
        'type': 'string'
      }
    },
    'required': ['metadata', 'method', 'path', 'requestId'],
    'title': 'RequestMetadata',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/RequestMetadata', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Request metadata that flows through the request/response lifecycle', 'title': 'RequestMetadata', 'type': 'object' } as const, { 'metadata': SchemaNode.defineObject({ 'description': 'User-provided metadata for logging and tracking. Key-value pairs that flow through lifecycle hooks.', 'type': 'object' } as const, {  }, [] as const), 'method': SchemaNode.defineString({
    'description': 'HTTP method (GET, POST, etc.)',
    'type': 'string'
  } as const), 'path': SchemaNode.defineString({
    'description': 'Original path before URL building',
    'type': 'string'
  } as const), 'requestId': SchemaNode.defineString({
    'description': 'Unique identifier for this request. Auto-generated or provided by user.',
    'type': 'string'
  } as const) }, ['metadata', 'method', 'path', 'requestId'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
