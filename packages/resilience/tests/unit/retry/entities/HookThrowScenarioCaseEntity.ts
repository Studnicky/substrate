import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const retrySchema = {
  'additionalProperties': false,
  'properties': { 'maximumRetries': { 'minimum': 0, 'type': 'number' } },
  'required': ['maximumRetries'],
  'type': 'object'
};

const retryNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, ['maximumRetries'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class HookThrowScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'attempts': { 'minimum': 0, 'type': 'number' },
            'errorShape': { 'minLength': 1, 'type': 'string' },
            'result': { 'type': 'string' }
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
            'firstErrorMessage': { 'minLength': 1, 'type': 'string' },
            'hookErrorMessage': { 'minLength': 1, 'type': 'string' },
            'result': { 'type': 'string' },
            'retry': retrySchema
          },
          'required': ['retry'],
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
        'errorShape': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'result': SchemaNode.defineString({ 'type': 'string' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'failureCountBeforeSuccess': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'firstErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'hookErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'result': SchemaNode.defineString({ 'type': 'string' } as const),
        'retry': retryNode
      }, ['retry'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `hook-throw.loop.spec.ts` exercises across every `Retry` lifecycle hook that can throw. */
export namespace HookThrowScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      HookThrowScenarioBranches.schema('enter-call'),
      HookThrowScenarioBranches.schema('on-attempt'),
      HookThrowScenarioBranches.schema('on-give-up-exhausted'),
      HookThrowScenarioBranches.schema('on-give-up-non-retryable'),
      HookThrowScenarioBranches.schema('on-retry-scheduled'),
      HookThrowScenarioBranches.schema('on-retry-scheduled-async'),
      HookThrowScenarioBranches.schema('on-retryable-error'),
      HookThrowScenarioBranches.schema('on-success')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    HookThrowScenarioBranches.node('enter-call'),
    HookThrowScenarioBranches.node('on-attempt'),
    HookThrowScenarioBranches.node('on-give-up-exhausted'),
    HookThrowScenarioBranches.node('on-give-up-non-retryable'),
    HookThrowScenarioBranches.node('on-retry-scheduled'),
    HookThrowScenarioBranches.node('on-retry-scheduled-async'),
    HookThrowScenarioBranches.node('on-retryable-error'),
    HookThrowScenarioBranches.node('on-success')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
