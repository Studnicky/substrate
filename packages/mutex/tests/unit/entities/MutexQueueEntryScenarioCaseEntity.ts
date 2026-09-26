import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `entities.loop.spec.ts` exercises against `MutexQueueEntryEntity`. */
export namespace MutexQueueEntryScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
        'required': ['validationResults'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'validations': {
            'items': {
              'additionalProperties': false,
              'properties': {
                'expected': { 'type': 'boolean' },
                'value': {
                  'additionalProperties': false,
                  'properties': { 'queuedAt': { 'type': 'number' } },
                  'required': ['queuedAt'],
                  'type': 'object'
                }
              },
              'required': ['expected', 'value'],
              'type': 'object'
            },
            'type': 'array'
          }
        },
        'required': ['validations'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': ['negative', 'non-negative'] }
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
        { 'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const)) },
        ['validationResults'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'validations': SchemaNode.defineArray(
            { 'type': 'array' } as const,
            SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
                'value': SchemaNode.defineObject(
                  { 'type': 'object' } as const,
                  { 'queuedAt': SchemaNode.defineNumber({ 'type': 'number' } as const) },
                  ['queuedAt'] as const,
                  { 'additionalProperties': false }
                )
              },
              ['expected', 'value'] as const,
              { 'additionalProperties': false }
            )
          )
        },
        ['validations'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(['negative', 'non-negative'] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
