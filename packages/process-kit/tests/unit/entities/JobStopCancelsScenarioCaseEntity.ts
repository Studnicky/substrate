import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { JobEventEntity } from '../../fixtures/entities/JobEventEntity.js';
import { JobStateEntity } from '../../fixtures/entities/JobStateEntity.js';

/** One branch of the ProcessKit case union, keyed by `shape: 'stop-cancels'`. */
export namespace JobStopCancelsScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'afterAdvance': JobStateEntity.Schema,
          'afterStop': JobStateEntity.Schema,
          'scheduledAtMs': { 'type': 'number' }
        },
        'required': ['afterAdvance', 'afterStop', 'scheduledAtMs'],
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
          },
          'scheduler': {
            'additionalProperties': false,
            'properties': {
              'counter': {
                'additionalProperties': false,
                'properties': { 'startMs': { 'type': 'number' } },
                'required': ['startMs'],
                'type': 'object'
              }
            },
            'required': ['counter'],
            'type': 'object'
          },
          'timing': {
            'additionalProperties': false,
            'properties': { 'scheduleDelayMs': { 'type': 'number' }, 'stepMs': { 'type': 'number' } },
            'required': ['scheduleDelayMs', 'stepMs'],
            'type': 'object'
          }
        },
        'required': ['events', 'scheduler', 'timing'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'stop-cancels' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'afterAdvance': JobStateEntity.Node,
          'afterStop': JobStateEntity.Node,
          'scheduledAtMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        ['afterAdvance', 'afterStop', 'scheduledAtMs'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'events': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            { 'finish': JobEventEntity.Node, 'start': JobEventEntity.Node },
            ['finish', 'start'] as const,
            { 'additionalProperties': false }
          ),
          'scheduler': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            {
              'counter': SchemaNode.defineObject(
                { 'type': 'object' } as const,
                { 'startMs': SchemaNode.defineNumber({ 'type': 'number' } as const) },
                ['startMs'] as const,
                { 'additionalProperties': false }
              )
            },
            ['counter'] as const,
            { 'additionalProperties': false }
          ),
          'timing': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            {
              'scheduleDelayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
              'stepMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
            },
            ['scheduleDelayMs', 'stepMs'] as const,
            { 'additionalProperties': false }
          )
        },
        ['events', 'scheduler', 'timing'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('stop-cancels' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
}
