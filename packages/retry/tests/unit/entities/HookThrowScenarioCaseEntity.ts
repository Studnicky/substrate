import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SHAPES = [
  'enter-call', 'on-attempt', 'on-give-up-exhausted', 'on-give-up-non-retryable',
  'on-retry-scheduled', 'on-retry-scheduled-async', 'on-retryable-error', 'on-success'
] as const;

/** The scenario case shape `hook-throw.loop.spec.ts` exercises across every `Retry` lifecycle hook that can throw. */
export namespace HookThrowScenarioCaseEntity {
  const retrySchema = {
    'additionalProperties': false,
    'properties': { 'maximumRetries': { 'minimum': 0, 'type': 'number' } },
    'required': ['maximumRetries'],
    'type': 'object'
  };

  const retryNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, ['maximumRetries'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'attempts': { 'minimum': 0, 'type': 'number' },
          'errorShape': { 'minLength': 1, 'type': 'string' },
          'result': { 'type': 'string' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'batch': {
            'additionalProperties': false,
            'properties': { 'failureCountBeforeSuccess': { 'minimum': 0, 'type': 'number' } },
            'required': [],
            'type': 'object'
          },
          'errorMessage': { 'minLength': 1, 'type': 'string' },
          'firstErrorMessage': { 'minLength': 1, 'type': 'string' },
          'hookErrorMessage': { 'minLength': 1, 'type': 'string' },
          'result': { 'type': 'string' },
          'retry': retrySchema
        },
        'required': ['retry'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SHAPES }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'attempts': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'errorShape': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'result': SchemaNode.defineString({ 'type': 'string' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'failureCountBeforeSuccess': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'firstErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'hookErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'result': SchemaNode.defineString({ 'type': 'string' } as const),
          'retry': retryNode
        }, ['retry'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, SHAPES)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export type Type = NodeStaticType<typeof Node>;
}
