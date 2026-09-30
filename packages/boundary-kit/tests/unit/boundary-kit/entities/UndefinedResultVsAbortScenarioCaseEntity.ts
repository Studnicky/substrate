import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ThrottleOnlyConfigEntity } from './common/ThrottleOnlyConfigEntity.js';

/** The `undefined-result-vs-abort` scenario case shape `boundary-kit.loop.spec.ts` exercises. */
export namespace UndefinedResultVsAbortScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'abortedRan': { 'const': false }, 'resultIsUndefined': { 'const': true } },
        'required': ['abortedRan', 'resultIsUndefined'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'boundaryKit': {
            'additionalProperties': false,
            'properties': {
              'abortConfig': ThrottleOnlyConfigEntity.Schema,
              'abortDelayMs': { 'type': 'number' }
            },
            'required': ['abortConfig', 'abortDelayMs'],
            'type': 'object'
          }
        },
        'required': ['boundaryKit'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'undefined-result-vs-abort' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'abortedRan': SchemaNode.defineConst({}, false as const),
      'resultIsUndefined': SchemaNode.defineConst({}, true as const)
    }, ['abortedRan', 'resultIsUndefined'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'boundaryKit': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'abortConfig': ThrottleOnlyConfigEntity.Node,
        'abortDelayMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, ['abortConfig', 'abortDelayMs'] as const, { 'additionalProperties': false, 'patternProperties': {} })
    }, ['boundaryKit'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'undefined-result-vs-abort' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
