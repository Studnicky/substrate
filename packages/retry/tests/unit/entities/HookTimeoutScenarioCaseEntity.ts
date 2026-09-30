import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const retrySchema = {
  'additionalProperties': false,
  'properties': {
    'hookTimeoutMs': { 'minimum': 0, 'type': 'number' },
    'maximumRetries': { 'minimum': 0, 'type': 'number' }
  },
  'required': [],
  'type': 'object'
};

const retryNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'hookTimeoutMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
  'maximumRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class HookTimeoutScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'attempts': { 'minimum': 0, 'type': 'number' },
            'elapsedLessThanMs': { 'minimum': 0, 'type': 'number' },
            'errorShape': { 'minLength': 1, 'type': 'string' },
            'raceResult': { 'minLength': 1, 'type': 'string' },
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
            'delayMs': { 'minimum': 0, 'type': 'number' },
            'errorMessage': { 'minLength': 1, 'type': 'string' },
            'message': { 'minLength': 1, 'type': 'string' },
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
        'elapsedLessThanMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'errorShape': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'raceResult': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'result': SchemaNode.defineString({ 'type': 'string' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'failureCountBeforeSuccess': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
        'delayMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const),
        'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'result': SchemaNode.defineString({ 'type': 'string' } as const),
        'retry': retryNode
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `hook-timeout.loop.spec.ts` exercises across `Retry`'s `hookTimeoutMs` behavior. */
export namespace HookTimeoutScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      HookTimeoutScenarioBranches.schema('enter-call-unset'),
      HookTimeoutScenarioBranches.schema('fast-hook'),
      HookTimeoutScenarioBranches.schema('hung-attempt-with-timeout'),
      HookTimeoutScenarioBranches.schema('hung-attempt-without-timeout'),
      HookTimeoutScenarioBranches.schema('hung-give-up-with-timeout'),
      HookTimeoutScenarioBranches.schema('hung-retry-scheduled')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    HookTimeoutScenarioBranches.node('enter-call-unset'),
    HookTimeoutScenarioBranches.node('fast-hook'),
    HookTimeoutScenarioBranches.node('hung-attempt-with-timeout'),
    HookTimeoutScenarioBranches.node('hung-attempt-without-timeout'),
    HookTimeoutScenarioBranches.node('hung-give-up-with-timeout'),
    HookTimeoutScenarioBranches.node('hung-retry-scheduled')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
