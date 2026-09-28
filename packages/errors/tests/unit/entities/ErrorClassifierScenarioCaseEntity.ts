import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SCENARIO_SHAPES = ['classifications', 'message-contains-hit', 'message-contains-miss'] as const;

/** The scenario case shape `error-classifier.loop.spec.ts` exercises: `classifications` and `message-contains-*`. */
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
          'message': { 'type': 'string' },
          'patterns': { 'items': { 'type': 'string' }, 'type': 'array' }
        },
        'required': ['message'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SCENARIO_SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'nonRetryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'value': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'message': SchemaNode.defineString({ 'type': 'string' } as const),
          'patterns': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
        }, ['message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, SCENARIO_SHAPES)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
