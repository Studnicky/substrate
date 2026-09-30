import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const descriptorSchema = {
  'additionalProperties': false,
  'properties': {
    'code': { 'minLength': 1, 'type': 'string' },
    'description': { 'minLength': 1, 'type': 'string' },
    'retryable': { 'type': 'boolean' }
  },
  'required': ['code', 'description', 'retryable'],
  'type': 'object'
} as const;

const descriptorNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
}, ['code', 'description', 'retryable'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class ErrorCodeRegistryScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'message': { 'type': 'string' },
            'messageIncludes': { 'type': 'string' },
            'registered': { 'type': 'boolean' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': { 'descriptor': descriptorSchema },
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

  static branchNode<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'message': SchemaNode.defineString({ 'type': 'string' } as const),
        'messageIncludes': SchemaNode.defineString({ 'type': 'string' } as const),
        'registered': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'descriptor': descriptorNode }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The single scenario case shape `error-code-registry.loop.spec.ts` exercises. */
export namespace ErrorCodeRegistryScenarioCaseEntity {

  export const Schema = {
    'oneOf': [
      ErrorCodeRegistryScenarioCaseBuilders.branchSchema('constructor-throws'),
      ErrorCodeRegistryScenarioCaseBuilders.branchSchema('register-duplicate'),
      ErrorCodeRegistryScenarioCaseBuilders.branchSchema('register-unique')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    ErrorCodeRegistryScenarioCaseBuilders.branchNode('constructor-throws'),
    ErrorCodeRegistryScenarioCaseBuilders.branchNode('register-duplicate'),
    ErrorCodeRegistryScenarioCaseBuilders.branchNode('register-unique')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
