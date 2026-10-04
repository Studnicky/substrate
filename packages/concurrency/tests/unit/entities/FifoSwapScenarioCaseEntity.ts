import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `fifo-swap` scenario case shape `Semaphore.loop.spec.ts` exercises. */
export namespace FifoSwapScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'availableAfter': { 'type': 'number' }, 'order': { 'items': { 'type': 'number' }, 'type': 'array' } },
        'required': ['availableAfter', 'order'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'order': { 'items': { 'type': 'number' }, 'type': 'array' },
          'semaphore': {
            'additionalProperties': false,
            'properties': { 'permits': { 'type': 'number' } },
            'required': ['permits'],
            'type': 'object'
          }
        },
        'required': ['order', 'semaphore'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'fifo-swap' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'availableAfter': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'order': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)
    }, ['availableAfter', 'order'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'order': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
      'semaphore': SchemaNode.defineObject({ 'type': 'object' } as const, { 'permits': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['permits'] as const, { 'additionalProperties': false, 'patternProperties': {} })
    }, ['order', 'semaphore'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'fifo-swap' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
