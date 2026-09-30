import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class DefaultHttpErrorClassifierScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'attemptNumber': { 'type': 'number' },
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': { 'reason': { 'type': 'string' }, 'retryable': { 'type': 'boolean' } },
          'required': ['reason', 'retryable'],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'code': { 'type': 'string' },
            'message': { 'type': 'string' },
            'status': { 'type': 'number' }
          },
          'required': [],
          'type': 'object'
        },
        'name': { 'minLength': 1, 'type': 'string' },
        'shape': { 'const': shape }
      },
      'required': ['attemptNumber', 'description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static branchNode<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'attemptNumber': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'reason': SchemaNode.defineString({ 'type': 'string' } as const), 'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['reason', 'retryable'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'code': SchemaNode.defineString({ 'type': 'string' } as const),
        'message': SchemaNode.defineString({ 'type': 'string' } as const),
        'status': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['attemptNumber', 'description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The single scenario case shape `default-http-error-classifier.loop.spec.ts` exercises. */
export namespace DefaultHttpErrorClassifierScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      DefaultHttpErrorClassifierScenarioCaseBuilders.branchSchema('client-error'),
      DefaultHttpErrorClassifierScenarioCaseBuilders.branchSchema('gateway-error'),
      DefaultHttpErrorClassifierScenarioCaseBuilders.branchSchema('network-code'),
      DefaultHttpErrorClassifierScenarioCaseBuilders.branchSchema('network-message'),
      DefaultHttpErrorClassifierScenarioCaseBuilders.branchSchema('rate-limited'),
      DefaultHttpErrorClassifierScenarioCaseBuilders.branchSchema('request-timeout'),
      DefaultHttpErrorClassifierScenarioCaseBuilders.branchSchema('server-error'),
      DefaultHttpErrorClassifierScenarioCaseBuilders.branchSchema('unknown-early'),
      DefaultHttpErrorClassifierScenarioCaseBuilders.branchSchema('unknown-late')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    DefaultHttpErrorClassifierScenarioCaseBuilders.branchNode('client-error'),
    DefaultHttpErrorClassifierScenarioCaseBuilders.branchNode('gateway-error'),
    DefaultHttpErrorClassifierScenarioCaseBuilders.branchNode('network-code'),
    DefaultHttpErrorClassifierScenarioCaseBuilders.branchNode('network-message'),
    DefaultHttpErrorClassifierScenarioCaseBuilders.branchNode('rate-limited'),
    DefaultHttpErrorClassifierScenarioCaseBuilders.branchNode('request-timeout'),
    DefaultHttpErrorClassifierScenarioCaseBuilders.branchNode('server-error'),
    DefaultHttpErrorClassifierScenarioCaseBuilders.branchNode('unknown-early'),
    DefaultHttpErrorClassifierScenarioCaseBuilders.branchNode('unknown-late')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
