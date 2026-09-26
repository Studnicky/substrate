import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const mutexOptionsSchema = {
  'additionalProperties': false,
  'properties': { 'enableCoalescing': { 'type': 'boolean' } },
  'required': [],
  'type': 'object'
} as const;

const mutexOptionsNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'enableCoalescing': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
  [] as const,
  { 'additionalProperties': false }
);

const batchSchema = {
  'additionalProperties': false,
  'properties': { 'callerCount': { 'type': 'number' }, 'perKeyCount': { 'type': 'number' } },
  'required': [],
  'type': 'object'
} as const;

const batchNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'callerCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'perKeyCount': SchemaNode.defineNumber({ 'type': 'number' } as const) },
  [] as const,
  { 'additionalProperties': false }
);

/** The discriminated scenario case shapes `coalescing.loop.spec.ts` exercises. */
export namespace CoalescingScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'executionCount': { 'const': 1 }, 'results': { 'items': { 'type': 'string' }, 'maxItems': 3, 'minItems': 3, 'type': 'array' } },
            'required': ['executionCount', 'results'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'batch': batchSchema, 'delayMs': { 'type': 'number' }, 'key': { 'minLength': 1, 'type': 'string' }, 'mutex': mutexOptionsSchema, 'result': { 'type': 'string' } },
            'required': ['batch', 'delayMs', 'key', 'result'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'shares-result' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'numberResult': { 'type': 'number' }, 'rejectedType': { 'type': 'string' } },
            'required': ['numberResult'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'delayMs': { 'type': 'number' }, 'key': { 'minLength': 1, 'type': 'string' }, 'mutex': mutexOptionsSchema, 'numberResult': { 'type': 'number' }, 'stringResult': { 'type': 'string' } },
            'required': ['delayMs', 'key', 'numberResult', 'stringResult'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'validates-each-caller-result' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'executionCount': { 'const': 3 }, 'results': { 'items': { 'type': 'string' }, 'maxItems': 3, 'minItems': 3, 'type': 'array' } },
            'required': ['executionCount', 'results'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'batch': batchSchema, 'delayMs': { 'type': 'number' }, 'key': { 'minLength': 1, 'type': 'string' }, 'mutex': mutexOptionsSchema },
            'required': ['batch', 'delayMs', 'key'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'no-share-by-default' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': {
              'executionCounts': {
                'additionalProperties': false,
                'properties': { 'key1': { 'const': 1 }, 'key2': { 'const': 1 } },
                'required': ['key1', 'key2'],
                'type': 'object'
              },
              'results': { 'items': { 'type': 'string' }, 'maxItems': 4, 'minItems': 4, 'type': 'array' }
            },
            'required': ['executionCounts', 'results'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': {
              'batch': batchSchema,
              'delayMs': { 'type': 'number' },
              'keys': { 'items': { 'enum': ['key1', 'key2'] }, 'maxItems': 2, 'minItems': 2, 'type': 'array' },
              'mutex': mutexOptionsSchema
            },
            'required': ['batch', 'delayMs', 'keys'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'coalesces-per-key' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'executionCount': { 'const': 2 }, 'results': { 'items': { 'type': 'number' }, 'maxItems': 2, 'minItems': 2, 'type': 'array' } },
            'required': ['executionCount', 'results'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'key': { 'minLength': 1, 'type': 'string' }, 'mutex': mutexOptionsSchema },
            'required': ['key'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'allows-new-execution-after-complete' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'executionCount': { 'const': 1 }, 'rejectionMessage': { 'minLength': 1, 'type': 'string' } },
            'required': ['executionCount', 'rejectionMessage'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'batch': batchSchema, 'delayMs': { 'type': 'number' }, 'errorMessage': { 'minLength': 1, 'type': 'string' }, 'key': { 'minLength': 1, 'type': 'string' }, 'mutex': mutexOptionsSchema },
            'required': ['batch', 'delayMs', 'errorMessage', 'key'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'propagates-errors' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'callCount': { 'const': 2 }, 'result': { 'type': 'string' } },
            'required': ['callCount', 'result'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'firstErrorMessage': { 'minLength': 1, 'type': 'string' }, 'key': { 'minLength': 1, 'type': 'string' }, 'mutex': mutexOptionsSchema, 'successResult': { 'type': 'string' } },
            'required': ['firstErrorMessage', 'key', 'successResult'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'allows-retry-after-error' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'coalescedCount': { 'type': 'number' }, 'totalExecuted': { 'type': 'number' } },
            'required': ['coalescedCount', 'totalExecuted'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'batch': batchSchema, 'delayMs': { 'type': 'number' }, 'key': { 'minLength': 1, 'type': 'string' }, 'mutex': mutexOptionsSchema },
            'required': ['batch', 'delayMs', 'key'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'stats-coalescedCount-enabled' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'coalescedCount': { 'type': 'number' }, 'totalExecuted': { 'type': 'number' } },
            'required': ['coalescedCount', 'totalExecuted'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'batch': batchSchema, 'delayMs': { 'type': 'number' }, 'key': { 'minLength': 1, 'type': 'string' }, 'mutex': mutexOptionsSchema },
            'required': ['batch', 'delayMs', 'key'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'stats-coalescedCount-disabled' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'coalescedCount': { 'const': 2 } },
            'required': ['coalescedCount'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'batch': batchSchema, 'delayMs': { 'type': 'number' }, 'key': { 'minLength': 1, 'type': 'string' }, 'mutex': mutexOptionsSchema },
            'required': ['batch', 'delayMs', 'key'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'stats-coalescedCount-joined' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'firstResult': { 'type': 'string' }, 'secondResult': { 'type': 'string' } },
            'required': ['firstResult', 'secondResult'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'delayMs': { 'type': 'number' }, 'key': { 'minLength': 1, 'type': 'string' }, 'mutex': mutexOptionsSchema },
            'required': ['delayMs', 'key'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'clear-allows-new-operations' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': {
            'additionalProperties': false,
            'properties': { 'calls': { 'const': 2 }, 'results': { 'items': { 'type': 'string' }, 'maxItems': 2, 'minItems': 2, 'type': 'array' } },
            'required': ['calls', 'results'],
            'type': 'object'
          },
          'input': {
            'additionalProperties': false,
            'properties': { 'key': { 'minLength': 1, 'type': 'string' }, 'mutex': mutexOptionsSchema },
            'required': ['key'],
            'type': 'object'
          },
          'name': { 'minLength': 1, 'type': 'string' },
          'shape': { 'const': 'clear-resets-coalescing-state' }
        },
        'required': ['description', 'expected', 'input', 'name', 'shape'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'executionCount': SchemaNode.defineConst(1 as const), 'results': SchemaNode.defineArray({ 'maxItems': 3, 'minItems': 3, 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)) },
          ['executionCount', 'results'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'batch': batchNode, 'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'mutex': mutexOptionsNode, 'result': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['batch', 'delayMs', 'key', 'result'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('shares-result' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'numberResult': SchemaNode.defineNumber({ 'type': 'number' } as const), 'rejectedType': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['numberResult'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'mutex': mutexOptionsNode,
            'numberResult': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'stringResult': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          ['delayMs', 'key', 'numberResult', 'stringResult'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('validates-each-caller-result' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'executionCount': SchemaNode.defineConst(3 as const), 'results': SchemaNode.defineArray({ 'maxItems': 3, 'minItems': 3, 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)) },
          ['executionCount', 'results'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'batch': batchNode, 'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'mutex': mutexOptionsNode },
          ['batch', 'delayMs', 'key'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('no-share-by-default' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'executionCounts': SchemaNode.defineObject(
              { 'type': 'object' } as const,
              { 'key1': SchemaNode.defineConst(1 as const), 'key2': SchemaNode.defineConst(1 as const) },
              ['key1', 'key2'] as const,
              { 'additionalProperties': false }
            ),
            'results': SchemaNode.defineArray({ 'maxItems': 4, 'minItems': 4, 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const))
          },
          ['executionCounts', 'results'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'batch': batchNode,
            'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'keys': SchemaNode.defineArray({ 'maxItems': 2, 'minItems': 2, 'type': 'array' } as const, SchemaNode.defineEnum(['key1', 'key2'] as const)),
            'mutex': mutexOptionsNode
          },
          ['batch', 'delayMs', 'keys'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('coalesces-per-key' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'executionCount': SchemaNode.defineConst(2 as const), 'results': SchemaNode.defineArray({ 'maxItems': 2, 'minItems': 2, 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)) },
          ['executionCount', 'results'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'mutex': mutexOptionsNode },
          ['key'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('allows-new-execution-after-complete' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'executionCount': SchemaNode.defineConst(1 as const), 'rejectionMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
          ['executionCount', 'rejectionMessage'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'batch': batchNode,
            'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'mutex': mutexOptionsNode
          },
          ['batch', 'delayMs', 'errorMessage', 'key'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('propagates-errors' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'callCount': SchemaNode.defineConst(2 as const), 'result': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['callCount', 'result'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'firstErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
            'mutex': mutexOptionsNode,
            'successResult': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          ['firstErrorMessage', 'key', 'successResult'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('allows-retry-after-error' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'coalescedCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'totalExecuted': SchemaNode.defineNumber({ 'type': 'number' } as const) },
          ['coalescedCount', 'totalExecuted'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'batch': batchNode, 'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'mutex': mutexOptionsNode },
          ['batch', 'delayMs', 'key'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('stats-coalescedCount-enabled' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'coalescedCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'totalExecuted': SchemaNode.defineNumber({ 'type': 'number' } as const) },
          ['coalescedCount', 'totalExecuted'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'batch': batchNode, 'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'mutex': mutexOptionsNode },
          ['batch', 'delayMs', 'key'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('stats-coalescedCount-disabled' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'coalescedCount': SchemaNode.defineConst(2 as const) },
          ['coalescedCount'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'batch': batchNode, 'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'mutex': mutexOptionsNode },
          ['batch', 'delayMs', 'key'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('stats-coalescedCount-joined' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'firstResult': SchemaNode.defineString({ 'type': 'string' } as const), 'secondResult': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['firstResult', 'secondResult'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const), 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'mutex': mutexOptionsNode },
          ['delayMs', 'key'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('clear-allows-new-operations' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    ),
    SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'calls': SchemaNode.defineConst(2 as const), 'results': SchemaNode.defineArray({ 'maxItems': 2, 'minItems': 2, 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)) },
          ['calls', 'results'] as const,
          { 'additionalProperties': false }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'mutex': mutexOptionsNode },
          ['key'] as const,
          { 'additionalProperties': false }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst('clear-resets-coalescing-state' as const)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false }
    )
  ]);
  export type Type = NodeStaticType<typeof Node>;
}
