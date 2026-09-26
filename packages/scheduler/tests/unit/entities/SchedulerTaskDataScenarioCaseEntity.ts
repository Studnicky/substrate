import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `SchedulerTaskDataEntity.loop.spec.ts` scenario case shape: a task-data fixture and its expected validity. */
export namespace SchedulerTaskDataScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'valid': { 'type': 'boolean' } },
        'required': ['valid'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'taskData': {
            'additionalProperties': false,
            'properties': {
              'atMs': { 'type': 'number' },
              'intervalMs': { 'type': 'number' },
              'variant': { 'const': 'interval' }
            },
            'required': ['atMs', 'intervalMs', 'variant'],
            'type': 'object'
          }
        },
        'required': ['taskData'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': ['valid-task-data', 'invalid-interval'] }
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
        { 'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
        ['valid'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'taskData': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            {
              'atMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
              'intervalMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
              'variant': SchemaNode.defineConst('interval' as const)
            },
            ['atMs', 'intervalMs', 'variant'] as const,
            { 'additionalProperties': false }
          )
        },
        ['taskData'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(['valid-task-data', 'invalid-interval'] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
