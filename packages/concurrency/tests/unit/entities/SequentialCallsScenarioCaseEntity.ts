import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `sequential-calls` scenario case shape `Coalesce.loop.spec.ts` exercises. */
export namespace SequentialCallsScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'callCount': { 'type': 'number' } },
        'required': ['callCount'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'key': { 'minLength': 1, 'type': 'string' },
          'result1': { 'type': 'number' },
          'result2': { 'type': 'number' }
        },
        'required': ['key', 'result1', 'result2'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'sequential-calls' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'callCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['callCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'result1': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'result2': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['key', 'result1', 'result2'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'sequential-calls' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
