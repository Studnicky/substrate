import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `high-water-mark` scenario case shape `Channel.loop.spec.ts` exercises. */
export namespace HighWaterMarkScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'items': { 'items': { 'type': 'number' }, 'type': 'array' },
          'overflowDepths': { 'items': { 'type': 'number' }, 'type': 'array' }
        },
        'required': ['items', 'overflowDepths'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'channel': {
            'additionalProperties': false,
            'properties': { 'highWaterMark': { 'type': 'number' } },
            'required': ['highWaterMark'],
            'type': 'object'
          },
          'items': { 'items': { 'type': 'number' }, 'type': 'array' },
          'key': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['channel', 'items', 'key'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'high-water-mark' }
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
          'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
          'overflowDepths': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
        },
        ['items', 'overflowDepths'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'channel': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            { 'highWaterMark': SchemaNode.defineNumber({ 'type': 'number' } as const) },
            ['highWaterMark'] as const,
            { 'additionalProperties': false }
          ),
          'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
          'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['channel', 'items', 'key'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('high-water-mark' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
