import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** Deliberately unconstrained: this branch's fixtures carry out-of-range values on purpose, to exercise `LruCacheNodeTimingEntity.validate()`'s own rejection. */
const partialTimingSchema = {
  'additionalProperties': false,
  'properties': {
    'expiresAt': { 'type': 'number' },
    'staleAt': { 'type': 'number' }
  },
  'required': [],
  'type': 'object'
} as const;

const partialTimingNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'expiresAt': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'staleAt': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const validTimestampsSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { 'valid': { 'type': 'boolean' } },
      'required': ['valid'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': {
        'timing': {
          'additionalProperties': false,
          'properties': { 'expiresAt': { 'minimum': 0, 'type': 'number' }, 'staleAt': { 'minimum': 0, 'type': 'number' } },
          'required': ['expiresAt', 'staleAt'],
          'type': 'object'
        }
      },
      'required': ['timing'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'valid-timestamps' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const validTimestampsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['valid'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'timing': SchemaNode.defineObject({ 'type': 'object' } as const, {
            'expiresAt': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
            'staleAt': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
          }, ['expiresAt', 'staleAt'] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['timing'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'valid-timestamps' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const invalidTimestampsSchema = {
  'additionalProperties': false,
  'properties': {
    'description': { 'minLength': 1, 'type': 'string' },
    'expected': {
      'additionalProperties': false,
      'properties': { 'invalidChecks': { 'items': { 'type': 'boolean' }, 'type': 'array' }, 'valid': { 'type': 'boolean' } },
      'required': ['invalidChecks', 'valid'],
      'type': 'object'
    },
    'input': {
      'additionalProperties': false,
      'properties': { 'timing': { 'items': partialTimingSchema, 'type': 'array' } },
      'required': ['timing'],
      'type': 'object'
    },
    'name': { 'minLength': 1, 'type': 'string' },
    'shape': { 'const': 'invalid-timestamps' }
  },
  'required': ['description', 'expected', 'input', 'name', 'shape'],
  'type': 'object'
} as const;

const invalidTimestampsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'invalidChecks': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined),
        'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, ['invalidChecks', 'valid'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timing': SchemaNode.defineArray({ 'type': 'array' } as const, partialTimingNode, undefined) }, ['timing'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'invalid-timestamps' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The two scenario case shapes `LruCacheNodeTimingEntity.loop.spec.ts` exercises. Mutually exclusive by `shape`, so `oneOf` (flattened by `NodeSchemaAgreement`) rather than `anyOf` (not). */
export namespace LruCacheNodeTimingEntityScenarioCaseEntity {
  export const Schema = {
    'oneOf': [validTimestampsSchema, invalidTimestampsSchema]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [validTimestampsNode, invalidTimestampsNode] as const);
  export type Type = NodeStaticType<typeof Node>;
}
