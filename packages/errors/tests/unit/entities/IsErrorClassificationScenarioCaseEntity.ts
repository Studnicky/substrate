import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch of the case union: the shared envelope with `shape` fixed to a single literal. */
class IsErrorClassificationScenarioCaseBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': { 'result': { 'type': 'boolean' } },
          'required': ['result'],
          'type': 'object'
        },
        'input': {},
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
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineUnknown({} as const),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The single scenario case shape `is-error-classification.loop.spec.ts` exercises. */
export namespace IsErrorClassificationScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      IsErrorClassificationScenarioCaseBuilders.branchSchema('invalid-reason'),
      IsErrorClassificationScenarioCaseBuilders.branchSchema('non-object'),
      IsErrorClassificationScenarioCaseBuilders.branchSchema('valid'),
      IsErrorClassificationScenarioCaseBuilders.branchSchema('valid-with-reason')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    IsErrorClassificationScenarioCaseBuilders.branchNode('invalid-reason'),
    IsErrorClassificationScenarioCaseBuilders.branchNode('non-object'),
    IsErrorClassificationScenarioCaseBuilders.branchNode('valid'),
    IsErrorClassificationScenarioCaseBuilders.branchNode('valid-with-reason')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
