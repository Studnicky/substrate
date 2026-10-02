import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

const nonEmptyStringSchema = { 'minLength': 1, 'type': 'string' } as const;
const nonEmptyStringNode = SchemaNode.defineString(nonEmptyStringSchema);

/** Builds the `{ description, expected, input, name, shape }` branch for one `LockPathHelpers` shape; `input.shape` repeats the outer discriminant. */
class LockPathHelpersScenarioBuilders {
  static branchSchema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': nonEmptyStringSchema,
        'expected': {
          'additionalProperties': false,
          'properties': { 'value': nonEmptyStringSchema },
          'required': ['value'],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': { 'path': nonEmptyStringSchema, 'shape': { 'const': shape } },
          'required': ['shape', 'path'],
          'type': 'object'
        },
        'name': nonEmptyStringSchema,
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static branchNode<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nonEmptyStringNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': nonEmptyStringNode }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'path': nonEmptyStringNode, 'shape': SchemaNode.defineConst({}, shape) }, ['shape', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nonEmptyStringNode,
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** Every `shape` value `LockPathHelpers.loop.spec.ts` exercises, discriminated by the `shape` const field. */
export namespace LockPathHelpersScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      LockPathHelpersScenarioBuilders.branchSchema('basename-bare-relative'),
      LockPathHelpersScenarioBuilders.branchSchema('basename-nested'),
      LockPathHelpersScenarioBuilders.branchSchema('dirname-absolute-multi'),
      LockPathHelpersScenarioBuilders.branchSchema('dirname-absolute-single'),
      LockPathHelpersScenarioBuilders.branchSchema('dirname-bare-relative'),
      LockPathHelpersScenarioBuilders.branchSchema('dirname-relative-directory')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    LockPathHelpersScenarioBuilders.branchNode('basename-bare-relative'),
    LockPathHelpersScenarioBuilders.branchNode('basename-nested'),
    LockPathHelpersScenarioBuilders.branchNode('dirname-absolute-multi'),
    LockPathHelpersScenarioBuilders.branchNode('dirname-absolute-single'),
    LockPathHelpersScenarioBuilders.branchNode('dirname-bare-relative'),
    LockPathHelpersScenarioBuilders.branchNode('dirname-relative-directory')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
