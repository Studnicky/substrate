import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class BackoffStrategiesScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'maximumResult': { 'type': 'number' },
            'minimumDistinct': { 'minimum': 1, 'type': 'number' },
            'minimumResult': { 'type': 'number' },
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
            'maximumMultiplier': { 'type': 'number' },
            'minimumMultiplier': { 'type': 'number' },
            'strategy': { 'enum': ['constant', 'exponential', 'linear'] }
          },
          'required': [],
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
        'maximumResult': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'minimumDistinct': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'number' } as const),
        'minimumResult': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'result': SchemaNode.defineUnknown({} as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'attempt': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'baseDelay': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'sampleCount': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'ceiling': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'maximumMultiplier': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'minimumMultiplier': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'strategy': SchemaNode.defineEnum({}, ['constant', 'exponential', 'linear'] as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `backoff-strategies.loop.spec.ts` exercises, covering every `BackoffStrategy` variant. */
export namespace BackoffStrategiesScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      BackoffStrategiesScenarioBranches.schema('ceiling'),
      BackoffStrategiesScenarioBranches.schema('constant'),
      BackoffStrategiesScenarioBranches.schema('decorrelated-range'),
      BackoffStrategiesScenarioBranches.schema('decorrelated-zero'),
      BackoffStrategiesScenarioBranches.schema('exponential'),
      BackoffStrategiesScenarioBranches.schema('jitter-range'),
      BackoffStrategiesScenarioBranches.schema('jitter-varying'),
      BackoffStrategiesScenarioBranches.schema('linear')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    BackoffStrategiesScenarioBranches.node('ceiling'),
    BackoffStrategiesScenarioBranches.node('constant'),
    BackoffStrategiesScenarioBranches.node('decorrelated-range'),
    BackoffStrategiesScenarioBranches.node('decorrelated-zero'),
    BackoffStrategiesScenarioBranches.node('exponential'),
    BackoffStrategiesScenarioBranches.node('jitter-range'),
    BackoffStrategiesScenarioBranches.node('jitter-varying'),
    BackoffStrategiesScenarioBranches.node('linear')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
