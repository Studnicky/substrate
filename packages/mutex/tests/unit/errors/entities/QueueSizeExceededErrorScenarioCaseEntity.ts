import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `QueueSizeExceededError.loop.spec.ts` exercises. */
export namespace QueueSizeExceededErrorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'expected': {
        'additionalProperties': false,
        'properties': {
          'code': { 'minLength': 1, 'type': 'string' },
          'key': { 'minLength': 1, 'type': 'string' },
          'maximumQueueSize': { 'type': 'number' },
          'message': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['code', 'key', 'maximumQueueSize', 'message'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'key': { 'minLength': 1, 'type': 'string' },
          'maximumQueueSize': { 'type': 'number' }
        },
        'required': ['key', 'maximumQueueSize'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'captures-key-and-queue-size' }
    },
    'required': ['expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'maximumQueueSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['code', 'key', 'maximumQueueSize', 'message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'maximumQueueSize': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['key', 'maximumQueueSize'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'captures-key-and-queue-size' as const)
  }, ['expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
