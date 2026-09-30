import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class HookInvocationErrorScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'causeMessage': { 'minLength': 1, 'type': 'string' },
            'errorShape': { 'minLength': 1, 'type': 'string' },
            'hookName': { 'minLength': 1, 'type': 'string' },
            'result': { 'type': 'string' },
            'unhandledRejections': { 'minimum': 0, 'type': 'number' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'hookName': { 'minLength': 1, 'type': 'string' },
            'message': { 'minLength': 1, 'type': 'string' },
            'result': { 'type': 'string' },
            'retry': {
              'additionalProperties': false,
              'properties': { 'maximumRetries': { 'minimum': 0, 'type': 'number' } },
              'required': [],
              'type': 'object'
            }
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
        'causeMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'errorShape': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'hookName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'result': SchemaNode.defineString({ 'type': 'string' } as const),
        'unhandledRejections': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'hookName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'result': SchemaNode.defineString({ 'type': 'string' } as const),
        'retry': SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumRetries': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `hook-invocation-error.loop.spec.ts` exercises for `HookInvoker`/`Retry` hook-invocation failures. */
export namespace HookInvocationErrorScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      HookInvocationErrorScenarioBranches.schema('async-rejects-are-guarded'),
      HookInvocationErrorScenarioBranches.schema('enter-call-swallows'),
      HookInvocationErrorScenarioBranches.schema('hookinvoker-default-throws')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    HookInvocationErrorScenarioBranches.node('async-rejects-are-guarded'),
    HookInvocationErrorScenarioBranches.node('enter-call-swallows'),
    HookInvocationErrorScenarioBranches.node('hookinvoker-default-throws')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
