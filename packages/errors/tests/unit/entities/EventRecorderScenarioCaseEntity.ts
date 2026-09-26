import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `event-recorder.loop.spec.ts` exercises. */
export namespace EventRecorderScenarioCaseEntity {
  const recordedEventSchema = {
    'additionalProperties': false,
    'properties': {
      'nested': {
        'additionalProperties': false,
        'properties': { 'value': { 'type': 'number' } },
        'required': ['value'],
        'type': 'object'
      },
      'shape': { 'type': 'string' }
    },
    'required': ['nested', 'shape'],
    'type': 'object'
  } as const;

  const recordedEventNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'nested': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) },
        ['value'] as const,
        { 'additionalProperties': false }
      ),
      'shape': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['nested', 'shape'] as const,
    { 'additionalProperties': false }
  );

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'detachedProjection': recordedEventSchema, 'firstProjection': recordedEventSchema },
        'required': ['detachedProjection', 'firstProjection'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'recorder': {
            'additionalProperties': false,
            'properties': { 'event': recordedEventSchema },
            'required': ['event'],
            'type': 'object'
          }
        },
        'required': ['recorder'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'detaches-recorded-events' }
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
        { 'detachedProjection': recordedEventNode, 'firstProjection': recordedEventNode },
        ['detachedProjection', 'firstProjection'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'recorder': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            { 'event': recordedEventNode },
            ['event'] as const,
            { 'additionalProperties': false }
          )
        },
        ['recorder'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('detaches-recorded-events' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
