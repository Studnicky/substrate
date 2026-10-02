import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { KeyNumberItemsInputEntity } from './common/KeyNumberItemsInputEntity.js';

/** The `onDequeue-hooks` scenario case shape `Channel.loop.spec.ts` exercises. */
export namespace OnDequeueHooksScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'count': { 'type': 'number' },
          'entries': {
            'items': {
              'additionalProperties': false,
              'properties': { 'item': { 'type': 'number' }, 'key': { 'minLength': 1, 'type': 'string' } },
              'required': ['item', 'key'],
              'type': 'object'
            },
            'type': 'array'
          }
        },
        'required': ['count', 'entries'],
        'type': 'object'
      },
      'input': KeyNumberItemsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'onDequeue-hooks' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'entries': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, {
        'item': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
      }, ['item', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined)
    }, ['count', 'entries'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': KeyNumberItemsInputEntity.Node,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'onDequeue-hooks' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
