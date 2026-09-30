import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const retrySchema = {
  'additionalProperties': false,
  'properties': {
    'maximumElapsedMs': { 'minimum': 0, 'type': 'number' },
    'maximumRetries': { 'minimum': 0, 'type': 'number' }
  },
  'required': [],
  'type': 'object'
};

const retryNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'maximumElapsedMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
  'maximumRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class MaximumElapsedMsScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'attempts': { 'minimum': 0, 'type': 'number' },
            'attemptsLessThan': { 'minimum': 0, 'type': 'number' },
            'elapsedLessThanFactor': { 'minimum': 0, 'type': 'number' },
            'maximumElapsedMs': { 'minimum': 0, 'type': 'number' },
            'result': { 'type': 'string' },
            'totalRetries': { 'minimum': 0, 'type': 'number' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'alwaysRetryable': { 'type': 'boolean' },
            'delayMs': { 'minimum': 0, 'type': 'number' },
            'errorMessage': { 'minLength': 1, 'type': 'string' },
            'result': { 'type': 'string' },
            'retry': retrySchema
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
        'attempts': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'attemptsLessThan': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'elapsedLessThanFactor': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'maximumElapsedMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'result': SchemaNode.defineString({ 'type': 'string' } as const),
        'totalRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'alwaysRetryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'delayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'result': SchemaNode.defineString({ 'type': 'string' } as const),
        'retry': retryNode
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `max-elapsed-ms.loop.spec.ts` exercises across `Retry`'s `maximumElapsedMs` budget. */
export namespace MaximumElapsedMsScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      MaximumElapsedMsScenarioBranches.schema('configured-not-reached'),
      MaximumElapsedMsScenarioBranches.schema('count-wins'),
      MaximumElapsedMsScenarioBranches.schema('default-behavior'),
      MaximumElapsedMsScenarioBranches.schema('time-wins')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    MaximumElapsedMsScenarioBranches.node('configured-not-reached'),
    MaximumElapsedMsScenarioBranches.node('count-wins'),
    MaximumElapsedMsScenarioBranches.node('default-behavior'),
    MaximumElapsedMsScenarioBranches.node('time-wins')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
