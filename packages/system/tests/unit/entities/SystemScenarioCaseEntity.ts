import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `System.loop.spec.ts` exercises, one branch per `shape`. */
export namespace SystemScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'cached': { 'type': 'boolean' },
          'callCount': { 'type': 'number' },
          'formula': { 'type': 'string' },
          'maximum': { 'type': 'string' },
          'minimum': { 'type': 'number' },
          'nonEmpty': { 'type': 'boolean' },
          'relation': { 'type': 'string' },
          'source': { 'type': 'string' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'system': {
            'additionalProperties': false,
            'properties': {
              'detectedGpu': {
                'additionalProperties': false,
                'properties': {
                  'computeApi': { 'enum': ['cuda', 'metal', 'opencl', 'software'] },
                  'name': { 'type': 'string' },
                  'vramMb': { 'oneOf': [{ 'type': 'number' }, { 'type': 'null' }] }
                },
                'required': ['computeApi', 'name', 'vramMb'],
                'type': 'object'
              }
            },
            'required': [],
            'type': 'object'
          }
        },
        'required': ['system'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'cpu-arch-non-empty',
          'cpu-getter-calls-os-cpus-once',
          'cpu-logical-count-matches-os',
          'cpu-logical-count-positive',
          'cpu-model-non-empty',
          'cpu-physical-count-equals-logical-count',
          'cpu-physical-count-range',
          'gpu-caches-detection',
          'memory-free-range',
          'memory-total-positive',
          'optimal-worker-count-at-least-1',
          'optimal-worker-count-clamped',
          'platform-is-apple-silicon',
          'platform-node-version',
          'platform-os-non-empty'
        ]
      }
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
          'cached': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'callCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'formula': SchemaNode.defineString({ 'type': 'string' } as const),
          'maximum': SchemaNode.defineString({ 'type': 'string' } as const),
          'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'nonEmpty': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'relation': SchemaNode.defineString({ 'type': 'string' } as const),
          'source': SchemaNode.defineString({ 'type': 'string' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'system': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            {
              'detectedGpu': SchemaNode.defineObject(
                { 'type': 'object' } as const,
                {
                  'computeApi': SchemaNode.defineEnum(['cuda', 'metal', 'opencl', 'software'] as const),
                  'name': SchemaNode.defineString({ 'type': 'string' } as const),
                  'vramMb': SchemaNode.defineOneOf([SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)])
                },
                ['computeApi', 'name', 'vramMb'] as const,
                { 'additionalProperties': false }
              )
            },
            [] as const,
            { 'additionalProperties': false }
          )
        },
        ['system'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum([
        'cpu-arch-non-empty',
        'cpu-getter-calls-os-cpus-once',
        'cpu-logical-count-matches-os',
        'cpu-logical-count-positive',
        'cpu-model-non-empty',
        'cpu-physical-count-equals-logical-count',
        'cpu-physical-count-range',
        'gpu-caches-detection',
        'memory-free-range',
        'memory-total-positive',
        'optimal-worker-count-at-least-1',
        'optimal-worker-count-clamped',
        'platform-is-apple-silicon',
        'platform-node-version',
        'platform-os-non-empty'
      ] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
