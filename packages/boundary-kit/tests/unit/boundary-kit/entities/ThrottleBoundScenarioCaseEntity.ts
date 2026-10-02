import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ThrottleOnlyConfigEntity } from './common/ThrottleOnlyConfigEntity.js';

/** The `throttle-bound` scenario case shape `boundary-kit.loop.spec.ts` exercises. */
export namespace ThrottleBoundScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'maximumObservedActive': { 'type': 'number' } },
        'required': ['maximumObservedActive'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'batch': {
            'additionalProperties': false,
            'properties': { 'callCount': { 'type': 'number' } },
            'required': ['callCount'],
            'type': 'object'
          },
          'boundaryKit': {
            'additionalProperties': false,
            'properties': { 'config': ThrottleOnlyConfigEntity.Schema, 'workDelayMs': { 'type': 'number' } },
            'required': ['config', 'workDelayMs'],
            'type': 'object'
          }
        },
        'required': ['batch', 'boundaryKit'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'throttle-bound' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumObservedActive': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['maximumObservedActive'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'callCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['callCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'boundaryKit': SchemaNode.defineObject({ 'type': 'object' } as const, { 'config': ThrottleOnlyConfigEntity.Node, 'workDelayMs': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['config', 'workDelayMs'] as const, { 'additionalProperties': false, 'patternProperties': {} })
    }, ['batch', 'boundaryKit'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'throttle-bound' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
