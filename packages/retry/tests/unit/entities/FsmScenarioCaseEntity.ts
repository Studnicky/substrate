import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const CALL_STATE_VARIANTS = ['aborted', 'attempting', 'exhausted', 'failed', 'succeeded', 'waiting'] as const;

const transitionSchema = {
  'additionalProperties': false,
  'properties': { 'from': { 'enum': CALL_STATE_VARIANTS }, 'to': { 'enum': CALL_STATE_VARIANTS } },
  'required': ['from', 'to'],
  'type': 'object'
};

const transitionNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'from': SchemaNode.defineEnum({}, CALL_STATE_VARIANTS), 'to': SchemaNode.defineEnum({}, CALL_STATE_VARIANTS) }, ['from', 'to'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class FsmScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'errorMessageIncludes': { 'minLength': 1, 'type': 'string' },
            'errorName': { 'minLength': 1, 'type': 'string' },
            'exhausted': transitionSchema,
            'result': { 'type': 'string' },
            'transitions': { 'items': transitionSchema, 'type': 'array' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'batch': {
              'additionalProperties': false,
              'properties': { 'failureCountBeforeSuccess': { 'minimum': 0, 'type': 'number' } },
              'required': [],
              'type': 'object'
            },
            'errorMessage': { 'minLength': 1, 'type': 'string' },
            'maximumElapsedMs': { 'minimum': 0, 'type': 'number' },
            'maximumRetries': { 'minimum': 0, 'type': 'number' },
            'rejectedTransition': transitionSchema,
            'result': { 'type': 'string' }
          },
          'required': ['maximumRetries'],
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
        'errorMessageIncludes': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'errorName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'exhausted': transitionNode,
        'result': SchemaNode.defineString({ 'type': 'string' } as const),
        'transitions': SchemaNode.defineArray({ 'type': 'array' } as const, transitionNode, undefined)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'failureCountBeforeSuccess': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'maximumElapsedMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'maximumRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'rejectedTransition': transitionNode,
        'result': SchemaNode.defineString({ 'type': 'string' } as const)
      }, ['maximumRetries'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `fsm.loop.spec.ts` exercises across every `Retry` state-machine transition. */
export namespace FsmScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      FsmScenarioBranches.schema('aborted-by-hook'),
      FsmScenarioBranches.schema('exhausted-after-max-elapsed'),
      FsmScenarioBranches.schema('exhausted-after-max-retries'),
      FsmScenarioBranches.schema('illegal-transition'),
      FsmScenarioBranches.schema('immediate-success'),
      FsmScenarioBranches.schema('non-retryable-error'),
      FsmScenarioBranches.schema('retryable-failure-then-success')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    FsmScenarioBranches.node('aborted-by-hook'),
    FsmScenarioBranches.node('exhausted-after-max-elapsed'),
    FsmScenarioBranches.node('exhausted-after-max-retries'),
    FsmScenarioBranches.node('illegal-transition'),
    FsmScenarioBranches.node('immediate-success'),
    FsmScenarioBranches.node('non-retryable-error'),
    FsmScenarioBranches.node('retryable-failure-then-success')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
