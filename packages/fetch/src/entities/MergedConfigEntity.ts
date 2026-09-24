import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * Dispatcher configuration merged with defaults, ready to translate into
 * undici Agent options.
 */
export namespace MergedConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/MergedConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Dispatcher configuration merged with defaults',
    'properties': {
      'allowH2': { 'type': 'boolean' },
      'autoSelectFamily': { 'type': 'boolean' },
      'autoSelectFamilyAttemptTimeout': { 'minimum': 0, 'type': 'number' },
      'bodyTimeout': { 'minimum': 0, 'type': 'number' },
      'clientTtl': { 'minimum': 0, 'type': 'number' },
      'connections': { 'type': ['integer', 'null'] },
      'connectTimeout': { 'minimum': 0, 'type': 'number' },
      'enabled': { 'type': 'boolean' },
      'headersTimeout': { 'minimum': 0, 'type': 'number' },
      'keepAliveMaximumTimeout': { 'minimum': 0, 'type': 'number' },
      'keepAliveTimeout': { 'minimum': 0, 'type': 'number' },
      'keepAliveTimeoutThreshold': { 'minimum': 0, 'type': 'number' },
      'localAddress': { 'minLength': 1, 'type': 'string' },
      'maximumConcurrentStreams': { 'minimum': 1, 'type': 'integer' },
      'maximumHeaderSize': { 'minimum': 1, 'type': 'integer' },
      'maximumOrigins': { 'minimum': 1, 'type': 'integer' },
      'maximumRequestsPerClient': { 'minimum': 1, 'type': 'integer' },
      'maximumResponseSize': { 'minimum': -1, 'type': 'integer' },
      'pipelining': { 'minimum': 0, 'type': 'integer' },
      'strictContentLength': { 'type': 'boolean' }
    },
    'required': [
      'allowH2',
      'autoSelectFamily',
      'autoSelectFamilyAttemptTimeout',
      'bodyTimeout',
      'connections',
      'connectTimeout',
      'headersTimeout',
      'keepAliveMaximumTimeout',
      'keepAliveTimeout',
      'keepAliveTimeoutThreshold',
      'maximumConcurrentStreams',
      'maximumHeaderSize',
      'maximumResponseSize',
      'pipelining',
      'strictContentLength'
    ],
    'title': 'MergedConfig',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/MergedConfig', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Dispatcher configuration merged with defaults', 'title': 'MergedConfig', 'type': 'object' } as const, { 'allowH2': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'autoSelectFamily': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'autoSelectFamilyAttemptTimeout': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'bodyTimeout': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'clientTtl': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'connections': SchemaNode.defineAnyOf([SchemaNode.defineNumber({ 'type': 'integer' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)]), 'connectTimeout': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'headersTimeout': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'keepAliveMaximumTimeout': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'keepAliveTimeout': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'keepAliveTimeoutThreshold': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'localAddress': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'maximumConcurrentStreams': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'maximumHeaderSize': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'maximumOrigins': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'maximumRequestsPerClient': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'maximumResponseSize': SchemaNode.defineNumber({ 'minimum': -1, 'type': 'integer' } as const), 'pipelining': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'strictContentLength': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, [
    'allowH2',
    'autoSelectFamily',
    'autoSelectFamilyAttemptTimeout',
    'bodyTimeout',
    'connections',
    'connectTimeout',
    'headersTimeout',
    'keepAliveMaximumTimeout',
    'keepAliveTimeout',
    'keepAliveTimeoutThreshold',
    'maximumConcurrentStreams',
    'maximumHeaderSize',
    'maximumResponseSize',
    'pipelining',
    'strictContentLength'
  ] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
