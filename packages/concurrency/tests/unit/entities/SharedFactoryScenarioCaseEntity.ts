import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `shared-factory` scenario case shape `Coalesce.loop.spec.ts` exercises. */
export namespace SharedFactoryScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'callCount': { 'type': 'number' }, 'result': { 'minLength': 1, 'type': 'string' } },
        'required': ['callCount', 'result'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'calls': { 'type': 'number' },
          'delayMs': { 'type': 'number' },
          'key': { 'minLength': 1, 'type': 'string' },
          'result': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['calls', 'delayMs', 'key', 'result'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'shared-factory' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'callCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'result': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['callCount', 'result'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'calls': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'result': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['calls', 'delayMs', 'key', 'result'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'shared-factory' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
