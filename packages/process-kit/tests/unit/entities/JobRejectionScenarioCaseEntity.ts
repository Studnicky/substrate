import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { JobEventEntity } from '../../fixtures/entities/JobEventEntity.js';
import { JobStateEntity } from '../../fixtures/entities/JobStateEntity.js';

/** One branch of the ProcessKit case union, keyed by `shape: 'rejection'`. */
export namespace JobRejectionScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'afterRecovery': JobStateEntity.Schema,
          'rejectedEvent': JobEventEntity.Schema,
          'rejectionName': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['afterRecovery', 'rejectedEvent', 'rejectionName'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'events': {
            'additionalProperties': false,
            'properties': { 'recovery': JobEventEntity.Schema, 'rejected': JobEventEntity.Schema },
            'required': ['recovery', 'rejected'],
            'type': 'object'
          }
        },
        'required': ['events'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'rejection' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'afterRecovery': JobStateEntity.Node,
          'rejectedEvent': JobEventEntity.Node,
          'rejectionName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        }, ['afterRecovery', 'rejectedEvent', 'rejectionName'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'events': SchemaNode.defineObject({ 'type': 'object' } as const, { 'recovery': JobEventEntity.Node, 'rejected': JobEventEntity.Node }, ['recovery', 'rejected'] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, ['events'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'rejection' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
}
