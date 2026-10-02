import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class ErrorClassifierScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'nonRetryable': { 'type': 'boolean' },
            'retryable': { 'type': 'boolean' },
            'value': { 'type': 'boolean' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'message': { 'type': 'string' },
            'patterns': { 'items': { 'type': 'string' }, 'type': 'array' }
          },
          'required': ['message'],
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

  static branchNode<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'nonRetryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
        'value': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'message': SchemaNode.defineString({ 'type': 'string' } as const),
        'patterns': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
      }, ['message'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The scenario case shape `error-classifier.loop.spec.ts` exercises: `classifications` and `message-contains-*`. */
export namespace ErrorClassifierScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      ErrorClassifierScenarioCaseBuilders.branchSchema('classifications'),
      ErrorClassifierScenarioCaseBuilders.branchSchema('message-contains-hit'),
      ErrorClassifierScenarioCaseBuilders.branchSchema('message-contains-miss')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    ErrorClassifierScenarioCaseBuilders.branchNode('classifications'),
    ErrorClassifierScenarioCaseBuilders.branchNode('message-contains-hit'),
    ErrorClassifierScenarioCaseBuilders.branchNode('message-contains-miss')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
