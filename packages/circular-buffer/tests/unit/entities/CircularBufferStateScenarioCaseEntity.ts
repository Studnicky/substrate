import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The scenario case shape `CircularBufferStateEntity.loop.spec.ts` exercises. */
export namespace CircularBufferStateScenarioCaseEntity {
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
              'properties': { 'expected': { 'type': 'boolean' }, 'value': {} },
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
      'shape': { 'enum': ['invalid-lengths', 'valid-length'] }
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
              { 'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'value': SchemaNode.defineUnknown({} as const) },
              ['expected', 'value'] as const,
              { 'additionalProperties': false }
            )
          )
        },
        ['validations'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(['invalid-lengths', 'valid-length'] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  export type Type = NodeStaticType<typeof Node>;
}
