import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { BoundaryKitConfigRequiredEntity } from './common/BoundaryKitConfigRequiredEntity.js';

/** The `prebuilt-instances` scenario case shape `boundary-kit.loop.spec.ts` exercises. */
export namespace PrebuiltInstancesScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'acquireCount': { 'type': 'number' },
          'attemptCount': { 'type': 'number' },
          'successCount': { 'type': 'number' }
        },
        'required': ['acquireCount', 'attemptCount', 'successCount'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'boundaryKit': {
            'additionalProperties': false,
            'properties': { 'prebuiltConfig': BoundaryKitConfigRequiredEntity.Schema },
            'required': ['prebuiltConfig'],
            'type': 'object'
          }
        },
        'required': ['boundaryKit'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'prebuilt-instances' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'acquireCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'attemptCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'successCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['acquireCount', 'attemptCount', 'successCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'boundaryKit': SchemaNode.defineObject({ 'type': 'object' } as const, { 'prebuiltConfig': BoundaryKitConfigRequiredEntity.Node }, ['prebuiltConfig'] as const, { 'additionalProperties': false, 'patternProperties': {} })
    }, ['boundaryKit'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'prebuilt-instances' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
