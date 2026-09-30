import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { JobEventEntity } from '../../fixtures/entities/JobEventEntity.js';
import { JobStateEntity } from '../../fixtures/entities/JobStateEntity.js';

/** One branch of the ProcessKit case union, keyed by `shape: 'drive'`. */
export namespace JobDriveScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'afterFinish': JobStateEntity.Schema, 'afterStart': JobStateEntity.Schema },
        'required': ['afterFinish', 'afterStart'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'events': {
            'additionalProperties': false,
            'properties': { 'finish': JobEventEntity.Schema, 'start': JobEventEntity.Schema },
            'required': ['finish', 'start'],
            'type': 'object'
          }
        },
        'required': ['events'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'drive' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'afterFinish': JobStateEntity.Node, 'afterStart': JobStateEntity.Node }, ['afterFinish', 'afterStart'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'events': SchemaNode.defineObject({ 'type': 'object' } as const, { 'finish': JobEventEntity.Node, 'start': JobEventEntity.Node }, ['finish', 'start'] as const, { 'additionalProperties': false, 'patternProperties': {} })
    }, ['events'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'drive' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
}
