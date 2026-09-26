import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SHAPES = [
  'composed-instances', 'default-serialize-same-key', 'different-keys-do-not-block',
  'plain-config-single-flight', 'same-key-serialized-exclusion', 'single-flight-holds-mutex-against-serialized',
  'single-flight-parses-result', 'single-flight-reruns-after-settle', 'single-flight-shares-result'
] as const;

/**
 * The scenario case shape `keyed-work-gate.loop.spec.ts` exercises. `result` stays `unknown`:
 * shapes disagree on its runtime type (a number tuple vs. a string), so it cannot be schema-constrained here.
 */
export namespace KeyedWorkGateScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'calls': { 'minimum': 0, 'type': 'number' },
          'coalesceIsInflight': { 'type': 'boolean' },
          'completionOrder': { 'items': { 'type': 'number' }, 'type': 'array' },
          'first': { 'type': 'number' },
          'maxActive': { 'minimum': 0, 'type': 'number' },
          'mutexIsLocked': { 'type': 'boolean' },
          'order': { 'items': { 'type': 'string' }, 'type': 'array' },
          'rejectedName': { 'minLength': 1, 'type': 'string' },
          'resolved': { 'type': 'number' },
          'result': {},
          'results': { 'items': { 'type': 'number' }, 'type': 'array' },
          'runs': { 'minimum': 0, 'type': 'number' },
          'second': { 'type': 'number' },
          'values': { 'items': { 'type': 'number' }, 'type': 'array' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'config': {
            'additionalProperties': false,
            'properties': {
              'coalesce': {
                'additionalProperties': false,
                'properties': { 'timeout': { 'type': 'number' } },
                'required': ['timeout'],
                'type': 'object'
              },
              'mutex': {
                'additionalProperties': false,
                'properties': { 'timeout': { 'type': 'number' } },
                'required': ['timeout'],
                'type': 'object'
              }
            },
            'required': ['coalesce', 'mutex'],
            'type': 'object'
          },
          'delayMs': { 'minimum': 0, 'type': 'number' },
          'key': { 'minLength': 1, 'type': 'string' },
          'key1': { 'minLength': 1, 'type': 'string' },
          'key1DelayMs': { 'minimum': 0, 'type': 'number' },
          'key2': { 'minLength': 1, 'type': 'string' },
          'key2DelayMs': { 'minimum': 0, 'type': 'number' },
          'leaderDelayMs': { 'minimum': 0, 'type': 'number' },
          'serializedDelayMs': { 'minimum': 0, 'type': 'number' },
          'waitBeforeSerializedMs': { 'minimum': 0, 'type': 'number' }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': SHAPES }
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
          'calls': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'coalesceIsInflight': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'completionOrder': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
          'first': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'maxActive': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'mutexIsLocked': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'order': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'rejectedName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'resolved': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'result': SchemaNode.defineUnknown({} as const),
          'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
          'runs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'second': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'config': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            {
              'coalesce': SchemaNode.defineObject(
                { 'type': 'object' } as const,
                { 'timeout': SchemaNode.defineNumber({ 'type': 'number' } as const) },
                ['timeout'] as const,
                { 'additionalProperties': false }
              ),
              'mutex': SchemaNode.defineObject(
                { 'type': 'object' } as const,
                { 'timeout': SchemaNode.defineNumber({ 'type': 'number' } as const) },
                ['timeout'] as const,
                { 'additionalProperties': false }
              )
            },
            ['coalesce', 'mutex'] as const,
            { 'additionalProperties': false }
          ),
          'delayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'key1': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'key1DelayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'key2': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'key2DelayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'leaderDelayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'serializedDelayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'waitBeforeSerializedMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(SHAPES)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );

  export type Type = NodeStaticType<typeof Node>;
}
