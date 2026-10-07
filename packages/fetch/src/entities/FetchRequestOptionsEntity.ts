import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace FetchRequestOptionsEntity {
  export const Schema = {
    'additionalProperties': true,
    'properties': {
      'cache': { 'enum': ['default', 'force-cache', 'no-cache', 'no-store', 'only-if-cached', 'reload'] },
      'credentials': { 'enum': ['include', 'omit', 'same-origin'] },
      'duplex': { 'enum': ['half'] },
      'headers': {
        'additionalProperties': false,
        'patternProperties': { '^.*$': { 'type': 'string' } },
        'type': 'object'
      },
      'integrity': { 'type': 'string' },
      'keepalive': { 'type': 'boolean' },
      'metadata': { 'additionalProperties': {}, 'type': 'object' },
      'method': { 'type': 'string' },
      'mode': { 'enum': ['cors', 'navigate', 'no-cors', 'same-origin'] },
      'redirect': { 'enum': ['error', 'follow', 'manual'] },
      'referrer': { 'type': 'string' },
      'referrerPolicy': {
        'enum': ['', 'no-referrer', 'no-referrer-when-downgrade', 'origin', 'origin-when-cross-origin', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url']
      },
      'requestId': { 'type': 'string' },
      'timeout': { 'exclusiveMinimum': 0, 'multipleOf': 1, 'type': 'number' },
      'window': { 'type': 'null' }
    },
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cache': SchemaNode.defineEnum({}, ['default', 'force-cache', 'no-cache', 'no-store', 'only-if-cached', 'reload'] as const), 'credentials': SchemaNode.defineEnum({}, ['include', 'omit', 'same-origin'] as const), 'duplex': SchemaNode.defineEnum({}, ['half'] as const), 'headers': SchemaNode.defineObject({ 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': false, 'patternProperties': { '^.*$': SchemaNode.defineString({ 'type': 'string' } as const) } }), 'integrity': SchemaNode.defineString({ 'type': 'string' } as const), 'keepalive': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'metadata': SchemaNode.defineObject({ 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': SchemaNode.defineUnknown({} as const), 'patternProperties': {} }), 'method': SchemaNode.defineString({ 'type': 'string' } as const), 'mode': SchemaNode.defineEnum({}, ['cors', 'navigate', 'no-cors', 'same-origin'] as const), 'redirect': SchemaNode.defineEnum({}, ['error', 'follow', 'manual'] as const), 'referrer': SchemaNode.defineString({ 'type': 'string' } as const), 'referrerPolicy': SchemaNode.defineEnum({}, ['', 'no-referrer', 'no-referrer-when-downgrade', 'origin', 'origin-when-cross-origin', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url'] as const), 'requestId': SchemaNode.defineString({ 'type': 'string' } as const), 'timeout': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'multipleOf': 1, 'type': 'number' } as const), 'window': SchemaNode.defineNull({ 'type': 'null' } as const) }, [] as const, { 'additionalProperties': true, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
