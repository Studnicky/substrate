import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The scenario case shape `backoff-strategies.loop.spec.ts` exercises, covering every `BackoffStrategy` variant. */
export namespace BackoffStrategiesScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'maxResult': { 'type': 'number' },
          'minDistinct': { 'minimum': 1, 'type': 'number' },
          'minResult': { 'type': 'number' },
          'result': {}
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'attempt': { 'minimum': 0, 'type': 'number' },
          'baseDelay': { 'minimum': 0, 'type': 'number' },
          'batch': {
            'additionalProperties': false,
            'properties': { 'sampleCount': { 'minimum': 1, 'type': 'number' } },
            'required': [],
            'type': 'object'
          },
          'ceiling': { 'type': 'number' },
          'maxMultiplier': { 'type': 'number' },
          'minMultiplier': { 'type': 'number' },
          'strategy': { 'enum': ['constant', 'exponential', 'linear'] }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': ['ceiling', 'constant', 'decorrelated-range', 'decorrelated-zero', 'exponential', 'jitter-range', 'jitter-varying', 'linear']
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'maxResult': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'minDistinct': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'number' } as const),
          'minResult': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'result': SchemaNode.defineUnknown({} as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'attempt': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'baseDelay': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'sampleCount': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          'ceiling': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'maxMultiplier': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'minMultiplier': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'strategy': SchemaNode.defineEnum({}, ['constant', 'exponential', 'linear'] as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum({}, ['ceiling', 'constant', 'decorrelated-range', 'decorrelated-zero', 'exponential', 'jitter-range', 'jitter-varying', 'linear'] as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  export type Type = NodeStaticType<typeof Node>;
}
