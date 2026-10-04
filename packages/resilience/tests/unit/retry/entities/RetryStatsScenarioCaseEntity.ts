import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const CLASSIFIER_MODES = ['default', 'non-retryable', 'retryable'] as const;

const statsSchema = {
  'additionalProperties': false,
  'properties': {
    'failedRequests': { 'minimum': 0, 'type': 'number' },
    'successfulRequests': { 'minimum': 0, 'type': 'number' },
    'totalRequests': { 'minimum': 0, 'type': 'number' },
    'totalRetries': { 'minimum': 0, 'type': 'number' }
  },
  'required': ['failedRequests', 'successfulRequests', 'totalRequests', 'totalRetries'],
  'type': 'object'
};

const statsNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'failedRequests': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
  'successfulRequests': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
  'totalRequests': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
  'totalRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
}, ['failedRequests', 'successfulRequests', 'totalRequests', 'totalRetries'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class RetryStatsScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'attempts': { 'minimum': 0, 'type': 'number' },
            'failedRequests': { 'minimum': 0, 'type': 'number' },
            'stats': statsSchema,
            'successfulRequests': { 'minimum': 0, 'type': 'number' },
            'totalRequests': { 'minimum': 0, 'type': 'number' },
            'totalRetries': { 'minimum': 0, 'type': 'number' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'calls': { 'items': { 'minLength': 1, 'type': 'string' }, 'type': 'array' },
            'classifier': { 'enum': CLASSIFIER_MODES },
            'errorMessage': { 'minLength': 1, 'type': 'string' },
            'mutatedTotalRequests': { 'type': 'number' },
            'result': { 'type': 'string' },
            'retry': {
              'additionalProperties': false,
              'properties': { 'maximumRetries': { 'minimum': 0, 'type': 'number' } },
              'required': [],
              'type': 'object'
            }
          },
          'required': ['classifier'],
          'type': 'object'
        },
        'name': { 'minLength': 1, 'type': 'string' },
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
        'attempts': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'failedRequests': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'stats': statsNode,
        'successfulRequests': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'totalRequests': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'totalRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'calls': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), undefined),
        'classifier': SchemaNode.defineEnum({}, CLASSIFIER_MODES),
        'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'mutatedTotalRequests': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'result': SchemaNode.defineString({ 'type': 'string' } as const),
        'retry': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['classifier'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `retry-stats.loop.spec.ts` exercises across `Retry.getStats()`/`resetStats()`. */
export namespace RetryStatsScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      RetryStatsScenarioBranches.schema('failed-requests-increment'),
      RetryStatsScenarioBranches.schema('initial'),
      RetryStatsScenarioBranches.schema('reset-stats-accumulates'),
      RetryStatsScenarioBranches.schema('reset-stats-zero'),
      RetryStatsScenarioBranches.schema('stats-frozen'),
      RetryStatsScenarioBranches.schema('successful-requests-increment'),
      RetryStatsScenarioBranches.schema('total-requests-increments'),
      RetryStatsScenarioBranches.schema('total-retries-counted')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    RetryStatsScenarioBranches.node('failed-requests-increment'),
    RetryStatsScenarioBranches.node('initial'),
    RetryStatsScenarioBranches.node('reset-stats-accumulates'),
    RetryStatsScenarioBranches.node('reset-stats-zero'),
    RetryStatsScenarioBranches.node('stats-frozen'),
    RetryStatsScenarioBranches.node('successful-requests-increment'),
    RetryStatsScenarioBranches.node('total-requests-increments'),
    RetryStatsScenarioBranches.node('total-retries-counted')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
