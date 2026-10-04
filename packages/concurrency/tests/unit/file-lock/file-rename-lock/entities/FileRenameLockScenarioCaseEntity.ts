import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface,
  SchemaNodeInterface
} from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

const descriptionSchema = { 'minLength': 1, 'type': 'string' } as const;
const descriptionNode = SchemaNode.defineString(descriptionSchema);

/** Builds the `{ description, expected, input, name, shape }` envelope every branch shares, varying only the discriminant and the two payloads. */
class ScenarioBranchBuilders {
  static branchSchema<
    const TShape extends string,
    const TInputSchema extends Record<string, unknown>,
    const TExpectedSchema extends Record<string, unknown>
  >(shape: TShape, inputSchema: TInputSchema, expectedSchema: TExpectedSchema) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': descriptionSchema,
        'expected': expectedSchema,
        'input': inputSchema,
        'name': descriptionSchema,
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static branchNode<
    const TShape extends string,
    TInputNode extends SchemaNodeInterface<unknown, unknown>,
    TExpectedNode extends SchemaNodeInterface<unknown, unknown>
  >(shape: TShape, inputNode: TInputNode, expectedNode: TExpectedNode) {
    const result = SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': descriptionNode,
        'expected': expectedNode,
        'input': inputNode,
        'name': descriptionNode,
        'shape': SchemaNode.defineConst({}, shape)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    );
    return result;
  }
}

// acquire-release
const branch1Schema = ScenarioBranchBuilders.branchSchema(
  'acquire-release',
  {
    'additionalProperties': false,
    'properties': { 'content': { 'type': 'string' }, 'path': { 'type': 'string' } },
    'required': ['content', 'path'],
    'type': 'object'
  },
  {
    'additionalProperties': false,
    'properties': { 'existsAfterRelease': { 'type': 'boolean' }, 'existsWhileHeld': { 'type': 'boolean' } },
    'required': ['existsAfterRelease', 'existsWhileHeld'],
    'type': 'object'
  }
);
const branch1Node = ScenarioBranchBuilders.branchNode(
  'acquire-release',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'content': SchemaNode.defineString({ 'type': 'string' } as const),
      'path': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['content', 'path'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'existsAfterRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'existsWhileHeld': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
    },
    ['existsAfterRelease', 'existsWhileHeld'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  )
);

// contention
const branch2Schema = ScenarioBranchBuilders.branchSchema(
  'contention',
  {
    'additionalProperties': false,
    'properties': { 'content': { 'type': 'string' }, 'path': { 'type': 'string' } },
    'required': ['content', 'path'],
    'type': 'object'
  },
  { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' }
);
const branch2Node = ScenarioBranchBuilders.branchNode(
  'contention',
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'content': SchemaNode.defineString({ 'type': 'string' } as const),
      'path': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['content', 'path'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  ),
  SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, {
    'additionalProperties': false,
    'patternProperties': {}
  })
);

/** Every `shape` value the scenario file exercises, discriminated by the `shape` const field. */
export namespace FileRenameLockScenarioCaseEntity {
  export const Schema = {
    'oneOf': [branch1Schema, branch2Schema]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [branch1Node, branch2Node] as const);
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> =
    EntityCompiler.compileCreate<Type, InputType>(Schema);
}
