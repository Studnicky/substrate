import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const openBagSchema = { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' } as const;
const openBagNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': true, 'patternProperties': {} });

const batchSchema = {
  'additionalProperties': false,
  'properties': { 'itemCount': { 'type': 'number' }, 'maximumConcurrent': { 'type': 'number' } },
  'required': ['itemCount', 'maximumConcurrent'],
  'type': 'object'
} as const;

const batchNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'itemCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'maximumConcurrent': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['itemCount', 'maximumConcurrent'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const clockSchema = {
  'additionalProperties': false,
  'properties': { 'operationDurationMs': { 'type': 'number' }, 'operationSpacingMs': { 'type': 'number' }, 'startMs': { 'type': 'number' } },
  'required': ['operationDurationMs', 'operationSpacingMs', 'startMs'],
  'type': 'object'
} as const;

const clockNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'operationDurationMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'operationSpacingMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'startMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
}, ['operationDurationMs', 'operationSpacingMs', 'startMs'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class AdaptiveConfigScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
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
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static node<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'adaptive': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'maximumConcurrency': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'minimumConcurrency': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'targetLatencyMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'adjustmentDirection': SchemaNode.defineEnum({}, ['down', 'none', 'up'] as const),
        'concurrencyLimit': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'error': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'hookErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'maximumConcurrency': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'minimumConcurrency': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'rejectEnabledTrue': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'throttleValidated': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'validated': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'batch': batchNode,
        'clock': clockNode,
        'disabledConfig': openBagNode,
        'hookErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'throttle': openBagNode,
        'value': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'scaleDownThreshold': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'scaleUpThreshold': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/**
 * `adaptive-config.loop.spec.ts` exercises a single flat case shape across thirty scenario names:
 * `input.throttle`/`input.disabledConfig` stay open bags because several shapes deliberately supply
 * malformed raw config (a string where an object belongs, an unknown key, a wrong-typed field) to
 * prove `Throttle.create`/entity intake rejects it — the schema for a would-be-invalid payload is the
 * "any JSON value" schema, not a narrower one.
 */
export namespace AdaptiveConfigScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      AdaptiveConfigScenarioBranches.schema('adaptive-adjust-hook-throws'),
      AdaptiveConfigScenarioBranches.schema('adaptive-no-change'),
      AdaptiveConfigScenarioBranches.schema('adaptive-scales-down'),
      AdaptiveConfigScenarioBranches.schema('adaptive-scales-up'),
      AdaptiveConfigScenarioBranches.schema('default-max-concurrency'),
      AdaptiveConfigScenarioBranches.schema('default-min-concurrency'),
      AdaptiveConfigScenarioBranches.schema('reject-adaptive-empty'),
      AdaptiveConfigScenarioBranches.schema('reject-adaptive-step-size-string'),
      AdaptiveConfigScenarioBranches.schema('reject-adjustment-interval-less-than-100'),
      AdaptiveConfigScenarioBranches.schema('reject-concurrency-above-max'),
      AdaptiveConfigScenarioBranches.schema('reject-concurrency-below-min'),
      AdaptiveConfigScenarioBranches.schema('reject-min-concurrency-less-than-one'),
      AdaptiveConfigScenarioBranches.schema('reject-min-greater-than-max'),
      AdaptiveConfigScenarioBranches.schema('reject-missing-enabled'),
      AdaptiveConfigScenarioBranches.schema('reject-missing-target-latency'),
      AdaptiveConfigScenarioBranches.schema('reject-non-boolean-enabled'),
      AdaptiveConfigScenarioBranches.schema('reject-non-integer-adjustment-interval'),
      AdaptiveConfigScenarioBranches.schema('reject-non-integer-min-concurrency'),
      AdaptiveConfigScenarioBranches.schema('reject-non-integer-sample-window'),
      AdaptiveConfigScenarioBranches.schema('reject-non-integer-step-size'),
      AdaptiveConfigScenarioBranches.schema('reject-non-object-adaptive'),
      AdaptiveConfigScenarioBranches.schema('reject-non-positive-scale-up'),
      AdaptiveConfigScenarioBranches.schema('reject-non-positive-target-latency'),
      AdaptiveConfigScenarioBranches.schema('reject-sample-window-less-than-10'),
      AdaptiveConfigScenarioBranches.schema('reject-scale-up-not-less-than-scale-down'),
      AdaptiveConfigScenarioBranches.schema('reject-step-size-less-than-one'),
      AdaptiveConfigScenarioBranches.schema('reject-unknown-key'),
      AdaptiveConfigScenarioBranches.schema('valid-all-fields'),
      AdaptiveConfigScenarioBranches.schema('valid-disabled-defaulted-config'),
      AdaptiveConfigScenarioBranches.schema('valid-disabled-no-extra-fields'),
      AdaptiveConfigScenarioBranches.schema('valid-required-fields')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    AdaptiveConfigScenarioBranches.node('adaptive-adjust-hook-throws'),
    AdaptiveConfigScenarioBranches.node('adaptive-no-change'),
    AdaptiveConfigScenarioBranches.node('adaptive-scales-down'),
    AdaptiveConfigScenarioBranches.node('adaptive-scales-up'),
    AdaptiveConfigScenarioBranches.node('default-max-concurrency'),
    AdaptiveConfigScenarioBranches.node('default-min-concurrency'),
    AdaptiveConfigScenarioBranches.node('reject-adaptive-empty'),
    AdaptiveConfigScenarioBranches.node('reject-adaptive-step-size-string'),
    AdaptiveConfigScenarioBranches.node('reject-adjustment-interval-less-than-100'),
    AdaptiveConfigScenarioBranches.node('reject-concurrency-above-max'),
    AdaptiveConfigScenarioBranches.node('reject-concurrency-below-min'),
    AdaptiveConfigScenarioBranches.node('reject-min-concurrency-less-than-one'),
    AdaptiveConfigScenarioBranches.node('reject-min-greater-than-max'),
    AdaptiveConfigScenarioBranches.node('reject-missing-enabled'),
    AdaptiveConfigScenarioBranches.node('reject-missing-target-latency'),
    AdaptiveConfigScenarioBranches.node('reject-non-boolean-enabled'),
    AdaptiveConfigScenarioBranches.node('reject-non-integer-adjustment-interval'),
    AdaptiveConfigScenarioBranches.node('reject-non-integer-min-concurrency'),
    AdaptiveConfigScenarioBranches.node('reject-non-integer-sample-window'),
    AdaptiveConfigScenarioBranches.node('reject-non-integer-step-size'),
    AdaptiveConfigScenarioBranches.node('reject-non-object-adaptive'),
    AdaptiveConfigScenarioBranches.node('reject-non-positive-scale-up'),
    AdaptiveConfigScenarioBranches.node('reject-non-positive-target-latency'),
    AdaptiveConfigScenarioBranches.node('reject-sample-window-less-than-10'),
    AdaptiveConfigScenarioBranches.node('reject-scale-up-not-less-than-scale-down'),
    AdaptiveConfigScenarioBranches.node('reject-step-size-less-than-one'),
    AdaptiveConfigScenarioBranches.node('reject-unknown-key'),
    AdaptiveConfigScenarioBranches.node('valid-all-fields'),
    AdaptiveConfigScenarioBranches.node('valid-disabled-defaulted-config'),
    AdaptiveConfigScenarioBranches.node('valid-disabled-no-extra-fields'),
    AdaptiveConfigScenarioBranches.node('valid-required-fields')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
