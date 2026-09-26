import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SHAPES = [
  'async-hooks-safe', 'clear-recomputes-all', 'coalesce-shared-call', 'coalesced-failure-recomputes',
  'coalesced-hooks', 'config-error', 'create-rejects-foreign-construction', 'different-keys', 'entities',
  'failure-recomputes-after-rejection', 'hit-and-miss-hooks', 'hit-cache', 'invalidate-preserves-other-keys',
  'invalidate-recomputes', 'isolated-hook-ownership', 'miss-before-fn', 'per-key-hook-args',
  'rejecting-coalesced-hook', 'rejecting-miss-hook', 'sync-fn', 'throwing-coalesced-hook', 'throwing-hit-hook',
  'throwing-miss-hook', 'ttl-stale-options', 'undefined-result-cache'
] as const;

const KEY_FN_SHAPES = ['compound', 'identity', 'number-string'] as const;

/** The scenario case shape `memoize.loop.spec.ts` exercises. */
export namespace MemoizeScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'afterExpiry': { 'type': 'string' },
          'cachedResult': { 'type': 'string' },
          'calls': { 'minimum': 0, 'type': 'number' },
          'callsAfterExpiry': { 'minimum': 0, 'type': 'number' },
          'coalescedArgs': {},
          'events': { 'items': { 'type': 'string' }, 'type': 'array' },
          'first': { 'type': 'string' },
          'firstErrorMessage': { 'type': 'string' },
          'followerErrorMessage': { 'type': 'string' },
          'followerResult': { 'type': 'string' },
          'foundFalse': { 'type': 'boolean' },
          'foundTrue': { 'type': 'boolean' },
          'leaderResult': { 'type': 'string' },
          'memoAEvents': { 'items': { 'type': 'string' }, 'type': 'array' },
          'memoBEvents': { 'items': { 'type': 'string' }, 'type': 'array' },
          'missArgs': {},
          'missingFalse': { 'type': 'boolean' },
          'rejectionEvents': { 'minimum': 0, 'type': 'number' },
          'resultType': { 'type': 'string' },
          'results': {},
          'second': { 'type': 'string' },
          'third': { 'type': 'string' },
          'value': { 'type': 'string' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'batch': {
            'additionalProperties': false,
            'properties': { 'callCount': { 'minimum': 1, 'type': 'number' } },
            'required': [],
            'type': 'object'
          },
          'failureMessage': { 'minLength': 1, 'type': 'string' },
          'failuresBeforeSuccess': { 'minimum': 0, 'type': 'number' },
          'key': { 'minLength': 1, 'type': 'string' },
          'memoize': {
            'additionalProperties': false,
            'properties': {
              'capacity': { 'minimum': 1, 'type': 'integer' },
              'keyFnShape': { 'enum': KEY_FN_SHAPES },
              'staleMs': { 'minimum': 0, 'type': 'number' },
              'ttlMs': { 'minimum': 0, 'type': 'number' }
            },
            'required': [],
            'type': 'object'
          },
          'successValue': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['memoize'],
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
          'afterExpiry': SchemaNode.defineString({ 'type': 'string' } as const),
          'cachedResult': SchemaNode.defineString({ 'type': 'string' } as const),
          'calls': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'callsAfterExpiry': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          // A dynamic string-keyed map of fixture-chosen cache keys to [string, number] tuples; narrowed per call site via readTupleRecord.
          'coalescedArgs': SchemaNode.defineUnknown({} as const),
          'events': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'first': SchemaNode.defineString({ 'type': 'string' } as const),
          'firstErrorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'followerErrorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'followerResult': SchemaNode.defineString({ 'type': 'string' } as const),
          'foundFalse': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'foundTrue': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'leaderResult': SchemaNode.defineString({ 'type': 'string' } as const),
          'memoAEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'memoBEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          // A dynamic string-keyed map of fixture-chosen cache keys to [string, number] tuples; narrowed per call site via readTupleRecord.
          'missArgs': SchemaNode.defineUnknown({} as const),
          'missingFalse': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'rejectionEvents': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'resultType': SchemaNode.defineString({ 'type': 'string' } as const),
          // string[] for most shapes, number[] for sync-fn; narrowed per call site via readStringArray or a direct assertion.
          'results': SchemaNode.defineUnknown({} as const),
          'second': SchemaNode.defineString({ 'type': 'string' } as const),
          'third': SchemaNode.defineString({ 'type': 'string' } as const),
          'value': SchemaNode.defineString({ 'type': 'string' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'batch': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            { 'callCount': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'number' } as const) },
            [] as const,
            { 'additionalProperties': false }
          ),
          'failureMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'failuresBeforeSuccess': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'memoize': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            {
              'capacity': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const),
              'keyFnShape': SchemaNode.defineEnum(KEY_FN_SHAPES),
              'staleMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
              'ttlMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
            },
            [] as const,
            { 'additionalProperties': false }
          ),
          'successValue': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['memoize'] as const,
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
