import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SHAPES = [
  'backoff-config-default', 'backoff-config-exponential', 'backoff-config-override',
  'backoff-strategy-bad-delay', 'backoff-strategy-missing-fn', 'backoff-strategy-non-object',
  'config-guard-bad-type', 'config-guard-unknown-key', 'config-guard-valid',
  'decorrelated-jitter-0', 'decorrelated-jitter-lower-bound', 'decorrelated-jitter-upper-bound',
  'decorrelated-jitter-varying', 'entity-backoff-config', 'entity-retry-context'
] as const;

/**
 * The scenario case shape `retry-support.loop.spec.ts` exercises. `retry` and `value` stay
 * `unknown`: several shapes deliberately feed malformed configuration/entity data to prove
 * the runtime guard rejects it, so their content cannot be schema-constrained here.
 */
export namespace RetrySupportScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'classifierCalls': { 'minimum': 0, 'type': 'number' },
          'delay': { 'type': 'number' },
          'distinctResultsGreaterThan': { 'minimum': 0, 'type': 'number' },
          'invalid': { 'type': 'boolean' },
          'maxDelay': { 'type': 'number' },
          'minDelay': { 'type': 'number' },
          'overrideDelays': { 'items': { 'type': 'number' }, 'type': 'array' },
          'recordedDelays': { 'items': { 'type': 'number' }, 'type': 'array' },
          'result': { 'type': 'boolean' },
          'valid': { 'type': 'boolean' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'attempt': { 'minimum': 0, 'type': 'number' },
          'batch': {
            'additionalProperties': false,
            'properties': {
              'failureCountBeforeSuccess': { 'minimum': 0, 'type': 'number' },
              'sampleCount': { 'minimum': 1, 'type': 'number' }
            },
            'required': [],
            'type': 'object'
          },
          'baseDelay': { 'minimum': 0, 'type': 'number' },
          'errorMessage': { 'minLength': 1, 'type': 'string' },
          'result': { 'type': 'string' },
          'retry': {},
          'value': {}
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
          'classifierCalls': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'delay': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'distinctResultsGreaterThan': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'invalid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'maxDelay': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'minDelay': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'overrideDelays': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
          'recordedDelays': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
          'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'attempt': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'batch': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            {
              'failureCountBeforeSuccess': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
              'sampleCount': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'number' } as const)
            },
            [] as const,
            { 'additionalProperties': false }
          ),
          'baseDelay': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
          'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'result': SchemaNode.defineString({ 'type': 'string' } as const),
          'retry': SchemaNode.defineUnknown({} as const),
          'value': SchemaNode.defineUnknown({} as const)
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
