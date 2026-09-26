import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/**
 * The scenario case shape `error-classifier.loop.spec.ts` exercises.
 *
 * `error-classifier.scenarios.json` carries eight `has-property-*` cases the
 * test file's own runner map never wires up (`ErrorClassifier` has no
 * `hasProperty`/matcher method to test) — this schema still validates them so
 * the fixture file loads honestly, but the test only runs `classifications`
 * and `message-contains-*`.
 */
export namespace ErrorClassifierScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'nonRetryable': { 'type': 'boolean' },
          'retryable': { 'type': 'boolean' },
          'value': { 'type': 'boolean' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'matcher': {
            'additionalProperties': false,
            'properties': {
              'min': { 'type': 'number' },
              'shape': { 'type': 'string' },
              'value': { 'type': 'number' },
              'values': { 'items': { 'type': 'number' }, 'type': 'array' }
            },
            'required': ['shape'],
            'type': 'object'
          },
          'message': { 'type': 'string' },
          'patterns': { 'items': { 'type': 'string' }, 'type': 'array' },
          'propertyName': { 'type': 'string' },
          'status': { 'type': 'number' }
        },
        'required': ['message'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'type': 'string' }
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
          'nonRetryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'value': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'matcher': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            {
              'min': SchemaNode.defineNumber({ 'type': 'number' } as const),
              'shape': SchemaNode.defineString({ 'type': 'string' } as const),
              'value': SchemaNode.defineNumber({ 'type': 'number' } as const),
              'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
            },
            ['shape'] as const,
            { 'additionalProperties': false }
          ),
          'message': SchemaNode.defineString({ 'type': 'string' } as const),
          'patterns': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'propertyName': SchemaNode.defineString({ 'type': 'string' } as const),
          'status': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        ['message'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
