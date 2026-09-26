import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const SHAPES = [
  'adaptive-adjust-hook-throws', 'adaptive-no-change', 'adaptive-scales-down', 'adaptive-scales-up',
  'default-max-concurrency', 'default-min-concurrency', 'reject-adaptive-empty', 'reject-adaptive-step-size-string',
  'reject-adjustment-interval-less-than-100', 'reject-concurrency-above-max', 'reject-concurrency-below-min',
  'reject-min-concurrency-less-than-one', 'reject-min-greater-than-max', 'reject-missing-enabled',
  'reject-missing-target-latency', 'reject-non-boolean-enabled', 'reject-non-integer-adjustment-interval',
  'reject-non-integer-min-concurrency', 'reject-non-integer-sample-window', 'reject-non-integer-step-size',
  'reject-non-object-adaptive', 'reject-non-positive-scale-up', 'reject-non-positive-target-latency',
  'reject-sample-window-less-than-10', 'reject-scale-up-not-less-than-scale-down', 'reject-step-size-less-than-one',
  'reject-unknown-key', 'valid-all-fields', 'valid-disabled-defaulted-config', 'valid-disabled-no-extra-fields',
  'valid-required-fields'
] as const;

const openBagSchema = { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' } as const;
const openBagNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true });

const batchSchema = {
  'additionalProperties': false,
  'properties': { 'itemCount': { 'type': 'number' }, 'maxConcurrent': { 'type': 'number' } },
  'required': ['itemCount', 'maxConcurrent'],
  'type': 'object'
} as const;

const batchNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'itemCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'maxConcurrent': SchemaNode.defineNumber({ 'type': 'number' } as const) },
  ['itemCount', 'maxConcurrent'] as const,
  { 'additionalProperties': false }
);

const clockSchema = {
  'additionalProperties': false,
  'properties': { 'operationDurationMs': { 'type': 'number' }, 'operationSpacingMs': { 'type': 'number' }, 'startMs': { 'type': 'number' } },
  'required': ['operationDurationMs', 'operationSpacingMs', 'startMs'],
  'type': 'object'
} as const;

const clockNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'operationDurationMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'operationSpacingMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'startMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
  },
  ['operationDurationMs', 'operationSpacingMs', 'startMs'] as const,
  { 'additionalProperties': false }
);

/**
 * `adaptive-config.loop.spec.ts` exercises a single flat case shape across thirty scenario names:
 * `input.throttle`/`input.disabledConfig` stay open bags because several shapes deliberately supply
 * malformed raw config (a string where an object belongs, an unknown key, a wrong-typed field) to
 * prove `Throttle.create`/entity intake rejects it — the schema for a would-be-invalid payload is the
 * "any JSON value" schema, not a narrower one.
 */
export namespace AdaptiveConfigScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'adaptive': {
            'additionalProperties': false,
            'properties': {
              'enabled': { 'type': 'boolean' },
              'maximumConcurrency': { 'type': 'number' },
              'minimumConcurrency': { 'type': 'number' },
              'targetLatencyMs': { 'type': 'number' }
            },
            'required': [],
            'type': 'object'
          },
          'adjustmentDirection': { 'enum': ['down', 'none', 'up'] },
          'concurrencyLimit': { 'type': 'number' },
          'enabled': { 'type': 'boolean' },
          'error': { 'minLength': 1, 'type': 'string' },
          'hookErrorMessage': { 'minLength': 1, 'type': 'string' },
          'maximumConcurrency': { 'type': 'number' },
          'minimumConcurrency': { 'type': 'number' },
          'rejectEnabledTrue': { 'type': 'boolean' },
          'throttleValidated': { 'type': 'boolean' },
          'validated': { 'type': 'boolean' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'batch': batchSchema,
          'clock': clockSchema,
          'disabledConfig': openBagSchema,
          'hookErrorMessage': { 'minLength': 1, 'type': 'string' },
          'throttle': openBagSchema,
          'value': { 'type': 'number' }
        },
        'required': [],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'scaleDownThreshold': { 'type': 'number' },
      'scaleUpThreshold': { 'type': 'number' },
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
          'adaptive': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            {
              'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
              'maximumConcurrency': SchemaNode.defineNumber({ 'type': 'number' } as const),
              'minimumConcurrency': SchemaNode.defineNumber({ 'type': 'number' } as const),
              'targetLatencyMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
            },
            [] as const,
            { 'additionalProperties': false }
          ),
          'adjustmentDirection': SchemaNode.defineEnum(['down', 'none', 'up'] as const),
          'concurrencyLimit': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'error': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'hookErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'maximumConcurrency': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'minimumConcurrency': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'rejectEnabledTrue': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'throttleValidated': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'validated': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'batch': batchNode,
          'clock': clockNode,
          'disabledConfig': openBagNode,
          'hookErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'throttle': openBagNode,
          'value': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'scaleDownThreshold': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'scaleUpThreshold': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'shape': SchemaNode.defineEnum(SHAPES)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
