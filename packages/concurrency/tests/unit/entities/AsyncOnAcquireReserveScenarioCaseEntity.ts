import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `async-onAcquire-reserve` scenario case shape `Semaphore.loop.spec.ts` exercises. */
export namespace AsyncOnAcquireReserveScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'availableAfterFirstFailure': { 'type': 'number' }, 'availableAfterSecondRelease': { 'type': 'number' } },
        'required': ['availableAfterFirstFailure', 'availableAfterSecondRelease'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'firstMessage': { 'minLength': 1, 'type': 'string' },
          'secondMessage': { 'minLength': 1, 'type': 'string' },
          'semaphore': {
            'additionalProperties': false,
            'properties': { 'permits': { 'type': 'number' } },
            'required': ['permits'],
            'type': 'object'
          }
        },
        'required': ['firstMessage', 'secondMessage', 'semaphore'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'async-onAcquire-reserve' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'availableAfterFirstFailure': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'availableAfterSecondRelease': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['availableAfterFirstFailure', 'availableAfterSecondRelease'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'firstMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'secondMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'semaphore': SchemaNode.defineObject({ 'type': 'object' } as const, { 'permits': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['permits'] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, ['firstMessage', 'secondMessage', 'semaphore'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'async-onAcquire-reserve' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
